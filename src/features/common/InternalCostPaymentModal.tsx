import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';
import type { Account } from '../../utils/types';

export function InternalCostPaymentModal({
  open,
  onClose,
  onSaved,
  basePath,
  requestId,
  currencyCode,
  maxAmount,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  basePath: 'visa-requests' | 'passport-requests';
  requestId: number;
  currencyCode: string;
  maxAmount: number;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromAccountId, setFromAccountId] = useState<number | ''>('');
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [feeEnabled, setFeeEnabled] = useState<boolean>(false);
  const [feeAmount, setFeeAmount] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFromAccountId('');
    setAmount(maxAmount > 0 ? Number(maxAmount) : 0);
    setNote('');
    setFeeEnabled(false);
    setFeeAmount(0);
    (async () => {
      try {
        const res = await api.get('/meta/accounts');
        setAccounts((res.data.data || []).filter((a: Account) => a.is_active));
      } catch (e: any) {
        setError(e?.response?.data?.error || 'تعذر تحميل الحسابات');
      }
    })();
  }, [open, maxAmount]);

  const filteredAccounts = useMemo(() => {
    const cur = String(currencyCode || '').toUpperCase();
    return accounts.filter((a) => String(a.currency_code || '').toUpperCase() === cur);
  }, [accounts, currencyCode]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/${basePath}/${requestId}/internal-payments`, {
        from_account_id: Number(fromAccountId),
        amount: Number(amount),
        note: note || null,
        fee_enabled: !!feeEnabled,
        fee_amount: feeEnabled ? Number(feeAmount) : 0,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تسجيل الدفع');
    } finally {
      setSaving(false);
    }
  }

  const canSave = !!fromAccountId && amount > 0 && amount <= maxAmount + 1e-9;

  return (
    <Modal open={open} onClose={onClose} title="دفع تكلفة داخلية (محاسبة)" width="max-w-xl">
      {error && (
        <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200 mb-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <div className="text-xs text-slate-400 mb-1">الدفع من حساب</div>
          <Select value={String(fromAccountId)} onChange={(e) => setFromAccountId(Number(e.target.value) || '')}>
            <option value="">اختر حساب…</option>
            {filteredAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.currency_code}
              </option>
            ))}
          </Select>
          {filteredAccounts.length === 0 ? (
            <div className="mt-1 text-[11px] text-amber-400">لا يوجد حساب/صندوق بعملة {currencyCode}</div>
          ) : null}
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">المبلغ ({currencyCode})</div>
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          <div className="mt-1 text-[11px] text-slate-500">الحد الأقصى المتبقي: {maxAmount}</div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">ملاحظة</div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={feeEnabled} onChange={(e) => setFeeEnabled(e.target.checked)} />
            إضافة عمولة تحويل
          </label>
          {feeEnabled ? (
            <div className="mt-2">
              <div className="text-xs text-slate-400 mb-1">قيمة العمولة ({currencyCode})</div>
              <Input type="number" value={feeAmount} onChange={(e) => setFeeAmount(Number(e.target.value))} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          إلغاء
        </Button>
        <Button loading={saving} disabled={!canSave} onClick={save}>
          حفظ
        </Button>
      </div>
    </Modal>
  );
}
