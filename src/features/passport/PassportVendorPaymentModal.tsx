import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';
import type { Account } from '../../utils/types';

export function PassportVendorPaymentModal({
  open,
  onClose,
  passportRequestId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  passportRequestId: number;
  onSaved: () => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<number | ''>('');
  const [amount, setAmount] = useState<number>(0);
  const [receiptNo, setReceiptNo] = useState('');
  const [note, setNote] = useState('');

  // Optional transfer fee
  const [feeEnabled, setFeeEnabled] = useState(false);
  const [feeAmount, setFeeAmount] = useState<number>(0);
  const [feeReceiptNo, setFeeReceiptNo] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    (async () => {
      try {
        const res = await api.get('/meta/accounts');
        setAccounts((res.data.data || []).filter((a: Account) => a.is_active));
      } catch (e: any) {
        setError(e?.response?.data?.error || 'تعذر تحميل الحسابات');
      }
    })();
  }, [open]);

  async function save() {
    setLoading(true);
    setError(null);
    try {
      const noteParts: string[] = [];
      if (receiptNo.trim()) noteParts.push(`إيصال: ${receiptNo.trim()}`);
      if (note.trim()) noteParts.push(note.trim());
      if (feeEnabled && feeReceiptNo.trim()) noteParts.push(`إيصال عمولة: ${feeReceiptNo.trim()}`);

      await api.post(`/passport-requests/${passportRequestId}/vendor-payments`, {
        from_account_id: Number(accountId),
        amount: Number(amount),
        note: noteParts.length ? noteParts.join(' | ') : null,
        fee_enabled: feeEnabled,
        fee_amount: feeEnabled ? Number(feeAmount) : 0,
      });
      onSaved();
      onClose();
      setAccountId('');
      setAmount(0);
      setReceiptNo('');
      setNote('');
      setFeeEnabled(false);
      setFeeAmount(0);
      setFeeReceiptNo('');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل حفظ السداد');
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
          <div className="text-xs text-slate-400 mb-1">رقم الإيصال (من الدفتر)</div>
          <Input value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} placeholder="مثال: 502" />
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">الدفع من حساب</div>
          <Select value={String(accountId)} onChange={(e) => setAccountId(Number(e.target.value) || '')}>
            <option value="">اختر حساب…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.currency_code}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">المبلغ</div>
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">ملاحظة</div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-700/60 bg-slate-900/20 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold">عمولة تحويل (اختياري)</div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={feeEnabled} onChange={(e) => setFeeEnabled(e.target.checked)} />
            إضافة عمولة
          </label>
        </div>
        {feeEnabled ? (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-400 mb-1">مبلغ العمولة</div>
              <Input type="number" value={feeAmount} onChange={(e) => setFeeAmount(Number(e.target.value))} />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">إيصال العمولة</div>
              <Input value={feeReceiptNo} onChange={(e) => setFeeReceiptNo(e.target.value)} placeholder="مثال: 503" />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button
          loading={loading}
          disabled={!receiptNo.trim() || !accountId || amount <= 0 || (feeEnabled && feeAmount <= 0) || (feeEnabled && !feeReceiptNo.trim())}
          onClick={save}
        >
          حفظ
        </Button>
      </div>
    </Modal>
  );
}
