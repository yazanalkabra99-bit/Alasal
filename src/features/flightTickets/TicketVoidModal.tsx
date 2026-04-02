import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';

export function TicketVoidModal({
  open,
  onClose,
  ticketId,
  onSaved,
  sellCurrencyCode = 'USD',
  maxSellAmount = 0,
}: {
  open: boolean;
  onClose: () => void;
  ticketId: number;
  onSaved: () => void;
  sellCurrencyCode?: string;
  maxSellAmount?: number;
}) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/flight-tickets/${ticketId}/void`, {
        reason: reason || null,
        note: note || null,
        penalty_amount: Number(penaltyAmount || 0),
      });
      onSaved();
      onClose();
      setReason('');
      setNote('');
      setPenaltyAmount('');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تنفيذ VOID');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="VOID — إلغاء التذكرة" width="max-w-xl">
      {error && (
        <div className="rounded-2xl border border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200 mb-3">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-amber-800/60 bg-amber-950/20 p-3 text-xs text-amber-200">
        <div className="font-bold mb-1">ملاحظة مهمة</div>
        <div>
          VOID سيقوم بعكس خصم رصيد شركة الطيران لهذه التذكرة.
          إذا حددت غرامة، يبقى المبلغ على العميل كربح تذكرة.
          إذا لم تحدد غرامة، يصبح إجمالي المعاملة = 0 ويجب دفع الاسترجاع من شاشة الاسترجاع.
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <div>
          <div className="text-xs text-slate-400 mb-1">سبب الإلغاء</div>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: خطأ في الاسم" />
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">غرامة على العميل ({sellCurrencyCode})</div>
          <Input
            type="number"
            min={0}
            max={maxSellAmount}
            step="0.01"
            value={penaltyAmount}
            onChange={(e) => setPenaltyAmount(e.target.value)}
            placeholder="0 = بدون غرامة"
          />
          <div className="text-[10px] text-slate-500 mt-0.5">
            اترك 0 إذا لا يوجد غرامة. الغرامة تُحسب كربح تذكرة وتبقى كمبلغ مستحق على العميل.
            {maxSellAmount > 0 && ` (الحد الأقصى: ${maxSellAmount.toLocaleString()} ${sellCurrencyCode})`}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">ملاحظة داخلية</div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          إلغاء
        </Button>
        <Button loading={loading} onClick={save}>
          تنفيذ VOID
        </Button>
      </div>
    </Modal>
  );
}
