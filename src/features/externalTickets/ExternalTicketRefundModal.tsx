import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';
import { fmtMoney } from '../../utils/format';
import type { Account } from '../../utils/types';

type CurrencyRow = { code: string; rate_to_usd: number | null };

type TicketFinancials = {
  collected_usd: number;
  collected_in_usd: number;
  refunded_usd: number;
  remaining_sell_usd: number;
  paid_to_source_usd: number;
  remaining_buy_usd: number;
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

export function ExternalTicketRefundModal({
  open,
  onClose,
  ticketId,
  onSaved,
  defaultCurrencyCode,
}: {
  open: boolean;
  onClose: () => void;
  ticketId: number;
  onSaved: () => void;
  defaultCurrencyCode?: string;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [summary, setSummary] = useState<TicketFinancials | null>(null);

  const [currencyCode, setCurrencyCode] = useState<string>('');
  const [accountId, setAccountId] = useState<number | ''>('');
  const [amount, setAmount] = useState<number>(0);
  const [amountTouched, setAmountTouched] = useState(false);
  const [note, setNote] = useState('');
  const [happenedAt, setHappenedAt] = useState('');
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxUsd = Math.max(0, Number(summary?.collected_usd || 0));

  useEffect(() => {
    if (!open) return;
    setError(null);
    setAmount(0);
    setAmountTouched(false);
    setNote('');
    setAccountId('');
    setCurrencyCode('');
    setSummary(null);
    setHappenedAt('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingMeta(true);
      setError(null);
      try {
        const [accRes, curRes, sumRes] = await Promise.all([
          api.get('/meta/accounts'),
          api.get('/currencies'),
          api.get(`/external-tickets/${ticketId}/financials`),
        ]);
        setAccounts((accRes.data.data || []).filter((a: Account) => a.is_active));
        setRates(toRateMap((curRes.data.data || []) as CurrencyRow[]));
        setSummary(sumRes.data.data as TicketFinancials);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'تعذر تحميل بيانات الاسترداد');
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, [open, ticketId]);

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
    if (!(maxUsd > 0)) return 0;
    return maxUsd / rate;
  }, [maxUsd, selectedRateToUsd]);

  const amountTooHigh = useMemo(() => {
    if (!selectedRateToUsd) return false;
    return amount > maxAmount + 1e-6;
  }, [amount, maxAmount, selectedRateToUsd]);

  useEffect(() => {
    if (!open) return;
    if (!currencyOptions.length) return;

    const def = String(defaultCurrencyCode || '').toUpperCase();
    const chosen = def && currencyOptions.includes(def) ? def : currencyOptions[0];
    setCurrencyCode(chosen);

    const firstAcc = accounts.find((a) => a.is_active && String(a.currency_code || '').toUpperCase() === chosen);
    setAccountId(firstAcc ? Number(firstAcc.id) : '');
  }, [open, defaultCurrencyCode, currencyOptions, accounts]);

  useEffect(() => {
    if (!open) return;
    if (!currencyCode) return;
    if (!selectedRateToUsd) return;
    if (amountTouched) return;

    const v = Number.isFinite(maxAmount) ? maxAmount : 0;
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
    const firstAcc = accounts.find((a) => a.is_active && String(a.currency_code || '').toUpperCase() === cur);
    setAccountId(firstAcc ? Number(firstAcc.id) : '');
    setAmountTouched(false);
  }

  async function save() {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/external-tickets/${ticketId}/refund`, {
        account_id: Number(accountId),
        amount: Number(amount),
        note: note.trim() || undefined,
        happened_at: happenedAt || undefined,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل حفظ الاسترداد');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="استرداد تحصيل تذكرة خارجية" width="max-w-xl">
      {error && (
        <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200 mb-3">{error}</div>
      )}

      {summary && (
        <div className="mb-3 rounded-2xl border border-slate-800/60 bg-slate-900/30 p-3">
          <div className="text-xs text-slate-400">أقصى مبلغ يمكن استرداده</div>
          <div className="mt-1 font-black">{fmtMoney(maxUsd, 'USD')}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-1">تاريخ العملية (اختياري)</div>
          <Input value={happenedAt} onChange={(e) => setHappenedAt(e.target.value)} placeholder="YYYY-MM-DD أو ISO" />
          <div className="text-[11px] text-slate-500 mt-1">إذا تركته فارغًا سيتم اعتماد وقت الآن.</div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">عملة الاسترداد</div>
          <Select value={currencyCode} onChange={(e) => onChangeCurrency(e.target.value)} disabled={loadingMeta}>
            {currencyOptions.length ? null : <option value="">—</option>}
            {currencyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <div className="text-[11px] text-slate-500 mt-1">الأقصى بهذه العملة: {currencyCode ? fmtMoney(maxAmount || 0, currencyCode) : '—'}</div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">الصندوق</div>
          <Select value={String(accountId)} onChange={(e) => setAccountId(Number(e.target.value))} disabled={loadingMeta || !currencyCode}>
            {filteredAccounts.length ? null : <option value="">—</option>}
            {filteredAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">المبلغ</div>
          <Input
            type="number"
            value={amount}
            onChange={(e) => {
              setAmountTouched(true);
              setAmount(Number(e.target.value));
            }}
            min={0}
          />
          {amountTooHigh && <div className="text-[11px] text-rose-300 mt-1">المبلغ أكبر من المحصّل</div>}
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-slate-400 mb-1">سبب/ملاحظة (اختياري)</div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: إلغاء تحصيل بالخطأ" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          إلغاء
        </Button>
        <Button onClick={save} disabled={loading || loadingMeta || !accountId || !currencyCode || !(amount > 0) || amountTooHigh}>
          {loading ? 'جاري الحفظ…' : 'حفظ الاسترداد'}
        </Button>
      </div>
    </Modal>
  );
}
