import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';
import { useCurrencies } from '../../utils/useCurrencies';

/**
 * Office Netting (Set-off)
 * - bookkeeping only
 * - no cash movements
 * - reduces BOTH: (على المكتب لنا) and (علينا للمكتب)
 */
export function OfficeNettingModal({
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
  const [currencyCode, setCurrencyCode] = useState<string>('USD');
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currencies } = useCurrencies();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCurrencyCode('USD');
    setAmount(0);
    setNote('');
  }, [open]);

  async function save() {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/offices/${officeId}/nettings`, {
        currency_code: currencyCode,
        amount: Number(amount),
        note,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تنفيذ المقاصة');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="مقاصة تلقائية" width="max-w-xl">
      <div className="text-xs text-slate-400 mb-3">
        المقاصة تعني: خصم نفس المبلغ من (عليه لنا) و(علينا له) بدون حركة صندوق.
        <div className="mt-1 text-[11px] text-slate-500">⚠️ المقاصة تكون ضمن نفس العملة.</div>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200 mb-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-1">العملة</div>
          <Select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}>
            {(currencies && currencies.length ? currencies : [
              { code: 'USD', name: 'USD' },
              { code: 'SYP', name: 'SYP' },
              { code: 'AED', name: 'AED' },
            ]).map((c: any) => (
              <option key={c.code} value={c.code}>{c.code}</option>
            ))}
          </Select>
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">المبلغ</div>
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-slate-400 mb-1">ملاحظة</div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button loading={loading} disabled={amount <= 0} onClick={save}>تنفيذ المقاصة</Button>
      </div>
    </Modal>
  );
}
