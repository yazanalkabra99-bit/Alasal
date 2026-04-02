import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';
import { fmtMoney } from '../../utils/format';
import type { Account } from '../../utils/types';

type CurrencyRow = {
  code: string;
  rate_to_usd: number | null;
};

type TxSummary = {
  transaction: {
    id: number;
    total_amount: number;
    currency_code: string;
    fx_rate_to_usd_snapshot: number;
    total_usd: number;
    status?: string;
  };
  paid_usd: number;
  refunded_usd: number;
  remaining_usd: number;
};

function toRateMap(rows: CurrencyRow[]) {
  const m: Record<string, number> = {};
  for (const r of rows || []) {
    const code = String(r.code || '').toUpperCase();
    if (!code) continue;
    if (code === 'USD') {
      m[code] = 1;
      continue;
    }
    const rate = Number(r.rate_to_usd);
    if (Number.isFinite(rate) && rate > 0) m[code] = rate;
  }
  if (!m.USD) m.USD = 1;
  return m;
}

export function PaymentModal({
  open,
  onClose,
  transactionId,
  onSaved,
  defaultCurrencyCode,
}: {
  open: boolean;
  onClose: () => void;
  transactionId: number;
  onSaved: () => void;
  /** Default collection currency (e.g., visa/ticket sell currency). */
  defaultCurrencyCode?: string;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [summary, setSummary] = useState<TxSummary | null>(null);

  const [currencyCode, setCurrencyCode] = useState<string>('');
  const [accountId, setAccountId] = useState<number | ''>('');
  const [amount, setAmount] = useState<number>(0);
  const [amountTouched, setAmountTouched] = useState(false);
  const [method, setMethod] = useState('cash');
  const [receiptNo, setReceiptNo] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remainingUsd = Math.max(0, Number(summary?.remaining_usd || 0));

  // Reset form when opening
  useEffect(() => {
    if (!open) return;
    setError(null);
    setAmount(0);
    setAmountTouched(false);
    setMethod('cash');
    setReceiptNo('');
    setNote('');
    setAccountId('');
    setCurrencyCode('');
    setSummary(null);
  }, [open]);

  // Load accounts + FX rates + tx summary
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingMeta(true);
      setError(null);
      try {
        const [accRes, curRes, sumRes] = await Promise.all([
          api.get('/meta/accounts'),
          api.get('/currencies'),
          api.get(`/transactions/${transactionId}/summary`),
        ]);

        setAccounts((accRes.data.data || []).filter((a: Account) => a.is_active));
        setRates(toRateMap((curRes.data.data || []) as CurrencyRow[]));
        setSummary(sumRes.data.data as TxSummary);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'تعذر تحميل بيانات التحصيل');
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, [open, transactionId]);

  const currencyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const a of accounts) {
      if (!a?.is_active) continue;
      const c = String(a.currency_code || '').toUpperCase();
      if (c) set.add(c);
    }
    return Array.from(set).sort();
  }, [accounts]);

  const selectedRateToUsd = useMemo(() => {
    const cur = String(currencyCode || '').toUpperCase();
    return rates[cur] || null;
  }, [rates, currencyCode]);

  const maxAmount = useMemo(() => {
    const rate = selectedRateToUsd;
    if (!rate || !(rate > 0)) return 0;
    if (!(remainingUsd > 0)) return 0;
    return remainingUsd / rate;
  }, [remainingUsd, selectedRateToUsd]);

  const amountTooHigh = useMemo(() => {
    if (!selectedRateToUsd) return false;
    return amount > maxAmount + 1e-6;
  }, [amount, maxAmount, selectedRateToUsd]);

  // Pick default currency + account when opened
  useEffect(() => {
    if (!open) return;
    if (!currencyOptions.length) return;

    const def = String(defaultCurrencyCode || '').toUpperCase();
    const chosen = def && currencyOptions.includes(def) ? def : currencyOptions[0];
    setCurrencyCode(chosen);

    const firstAcc = accounts.find(
      (a) => a.is_active && String(a.currency_code || '').toUpperCase() === chosen
    );
    setAccountId(firstAcc ? Number(firstAcc.id) : '');
  }, [open, defaultCurrencyCode, currencyOptions, accounts]);

  // Default amount = remaining in selected currency (unless user edited)
  useEffect(() => {
    if (!open) return;
    if (!currencyCode) return;
    if (!selectedRateToUsd) return;
    if (amountTouched) return;

    const v = Number.isFinite(maxAmount) ? maxAmount : 0;
    // Keep 2 decimals for UI consistency
    setAmount(v > 0 ? Number(v.toFixed(2)) : 0);
  }, [open, currencyCode, selectedRateToUsd, maxAmount, amountTouched]);

  const filteredAccounts = useMemo(() => {
    const cur = String(currencyCode || '').toUpperCase();
    if (!cur) return accounts;
    return accounts.filter((a) => String(a.currency_code || '').toUpperCase() === cur);
  }, [accounts, currencyCode]);

  function onChangeCurrency(v: string) {
    const cur = String(v || '').toUpperCase();
    setCurrencyCode(cur);
    const firstAcc = accounts.find(
      (a) => a.is_active && String(a.currency_code || '').toUpperCase() === cur
    );
    setAccountId(firstAcc ? Number(firstAcc.id) : '');
    setAmountTouched(false); // switching currency => default to remaining for that currency
  }

  async function save() {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/transactions/${transactionId}/payments`, {
        account_id: Number(accountId),
        amount: Number(amount),
        method,
        receipt_no: receiptNo.trim(),
        note,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل حفظ الدفعة');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="إضافة دفعة تحصيل" width="max-w-xl">
      {error && (
        <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200 mb-3">
          {error}
        </div>
      )}

      {summary && (
        <div className="mb-3 rounded-2xl border border-slate-800/60 bg-slate-900/30 p-3">
          <div className="text-xs text-slate-400">المتبقي للتحصيل</div>
          <div className="mt-1 font-black">{fmtMoney(remainingUsd, 'USD')}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-1">رقم الإيصال (من الدفتر)</div>
          <Input value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} placeholder="مثال: 1254" />
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">عملة التحصيل</div>
          <Select value={currencyCode} onChange={(e) => onChangeCurrency(e.target.value)} disabled={loadingMeta}>
            {currencyOptions.length ? null : <option value="">—</option>}
            {currencyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <div className="text-[11px] text-slate-500 mt-1">
            الافتراضي: عملة مبيع الطلب — المتبقي بهذه العملة: {currencyCode ? fmtMoney(maxAmount || 0, currencyCode) : '—'}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">استلمنا على حساب</div>
          <Select value={String(accountId)} onChange={(e) => setAccountId(Number(e.target.value) || '')} disabled={loadingMeta}>
            <option value="">اختر حساب…</option>
            {filteredAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.currency_code}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">المبلغ</div>
          <Input
            type="number"
            value={amount}
            min={0}
            max={maxAmount || undefined}
            onChange={(e) => {
              setAmountTouched(true);
              setAmount(Number(e.target.value));
            }}
          />
          {amountTooHigh && (
            <div className="mt-1 text-[11px] text-red-300">المبلغ أكبر من المتبقي (الحد: {fmtMoney(maxAmount || 0, currencyCode || 'USD')})</div>
          )}
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">طريقة الدفع</div>
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">نقداً</option>
            <option value="bank">حوالة/بنك</option>
            <option value="wallet">محفظة</option>
          </Select>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">ملاحظة</div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          إلغاء
        </Button>
        <Button
          loading={loading}
          disabled={loadingMeta || !receiptNo.trim() || !accountId || amount <= 0 || amountTooHigh || remainingUsd <= 0}
          onClick={save}
        >
          حفظ
        </Button>
      </div>
    </Modal>
  );
}
