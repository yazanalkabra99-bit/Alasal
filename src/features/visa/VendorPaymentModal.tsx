import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';
import type { Account } from '../../utils/types';

export function VendorPaymentModal({
  open,
  onClose,
  visaRequestId,
  defaultAmount,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  visaRequestId: number;
  defaultAmount?: number | null;
  onSaved: () => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromAccountId, setFromAccountId] = useState<number | ''>('');
  const [amount, setAmount] = useState<number>(defaultAmount || 0);
  const [feeEnabled, setFeeEnabled] = useState(false);
  const [feeAmount, setFeeAmount] = useState<number>(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setAmount(defaultAmount || 0);
    (async () => {
      try {
        const res = await api.get('/meta/accounts');
        setAccounts((res.data.data || []).filter((a: Account) => a.is_active));
      } catch (e: any) {
        setError(e?.response?.data?.error || 'تعذر تحميل الحسابات');
      }
    })();
  }, [open, defaultAmount]);

  async function save() {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/visa-requests/${visaRequestId}/vendor-payments`, {
        from_account_id: Number(fromAccountId),
        amount: Number(amount),
        fee_enabled: feeEnabled,
        fee_amount: feeAmount,
        note,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل السداد');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="سداد للمصدر" width="max-w-xl">
      {error && (
        <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200 mb-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-1">الدفع من حساب</div>
          <Select value={String(fromAccountId)} onChange={(e) => setFromAccountId(Number(e.target.value) || '')}>
            <option value="">اختر حساب…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name} — {a.currency_code}</option>
            ))}
          </Select>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">مبلغ السداد</div>
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>

        <div className="md:col-span-2 rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={feeEnabled} onChange={(e) => setFeeEnabled(e.target.checked)} />
            إضافة عمولة تحويل
          </label>
          {feeEnabled && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">مبلغ العمولة</div>
                <Input type="number" value={feeAmount} onChange={(e) => setFeeAmount(Number(e.target.value))} />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">ملاحظة</div>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button loading={loading} disabled={!fromAccountId || amount <= 0} onClick={save}>تأكيد السداد</Button>
      </div>
    </Modal>
  );
}
