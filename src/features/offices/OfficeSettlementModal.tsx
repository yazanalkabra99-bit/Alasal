import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';
import type { Account } from '../../utils/types';

export function OfficeSettlementModal({
  open,
  onClose,
  officeId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  officeId: number;
  onSaved: () => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [accountId, setAccountId] = useState<number | ''>('');
  const [amount, setAmount] = useState<number>(0);
  const [receiptNo, setReceiptNo] = useState('');
  const [reason, setReason] = useState('settlement');
  const [note, setNote] = useState('');
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
      await api.post(`/offices/${officeId}/settlements`, {
        direction,
        account_id: Number(accountId),
        amount: Number(amount),
        receipt_no: receiptNo.trim() || null,
        reason,
        note,
      });
      onSaved();
      onClose();
      setDirection('in');
      setAccountId('');
      setAmount(0);
      setReceiptNo('');
      setReason('settlement');
      setNote('');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل حفظ التسوية');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="تسوية مكتب" width="max-w-xl">
      {error && (
        <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200 mb-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-1">
            {direction === 'in' ? 'رقم إيصال القبض (من الدفتر)' : 'رقم سند الدفع (اختياري)'}
          </div>
          <Input value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} placeholder={direction === 'in' ? 'مثال: 1254' : 'اختياري'} />
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">النوع</div>
          <Select value={direction} onChange={(e) => setDirection(e.target.value as any)}>
            <option value="in">داخل للصندوق</option>
            <option value="out">خارج من الصندوق</option>
          </Select>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">الحساب</div>
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
          <div className="text-xs text-slate-400 mb-1">السبب</div>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: سداد دين" />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-slate-400 mb-1">ملاحظة</div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button
          loading={loading}
          disabled={(!accountId || amount <= 0) || (direction === 'in' && !receiptNo.trim())}
          onClick={save}
        >
          حفظ
        </Button>
      </div>
    </Modal>
  );
}
