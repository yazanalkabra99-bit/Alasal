import React, { useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';

export function TicketRefundModal({
  open,
  onClose,
  ticketId,
  sellCurrencyCode,
  airlineCurrencyCode,
  maxCustomerRefund,
  buyAmount,
  fareDiscountAmount,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  ticketId: number;
  sellCurrencyCode: string;
  airlineCurrencyCode: string;
  maxCustomerRefund: number;
  buyAmount?: number;
  fareDiscountAmount?: number;
  onSaved: () => void;
}) {
  const ticketCapital = (buyAmount || 0) - (fareDiscountAmount || 0);
  const [customerRefund, setCustomerRefund] = useState<number>(0);
  const [airlineGross, setAirlineGross] = useState<number>(0);
  const [airlinePenalty, setAirlinePenalty] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const airlineNet = useMemo(() => Math.max(0, Number(airlineGross || 0) - Number(airlinePenalty || 0)), [airlineGross, airlinePenalty]);

  async function save() {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/flight-tickets/${ticketId}/refund`, {
        customer_refund_sell_amount: Number(customerRefund),
        airline_refund_gross_amount: Number(airlineGross || 0),
        airline_penalty_amount: Number(airlinePenalty || 0),
        reason: reason || null,
        note: note || null,
      });
      onSaved();
      onClose();
      setCustomerRefund(0);
      setAirlineGross(0);
      setAirlinePenalty(0);
      setReason('');
      setNote('');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تنفيذ الاسترجاع');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Refund — استرجاع التذكرة" width="max-w-xl">
      {error && (
        <div className="rounded-2xl border border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200 mb-3">
          {error}
        </div>
      )}

      {ticketCapital > 0 && (
        <div className="rounded-2xl border border-cyan-800/50 bg-cyan-950/20 p-3 mb-4">
          <div className="text-xs text-slate-400">رأس مال التذكرة (سعر الشراء - عمولة الفير)</div>
          <div className="text-xl font-black text-cyan-400 mt-1">{ticketCapital.toLocaleString()} {airlineCurrencyCode}</div>
          {buyAmount ? <div className="text-[11px] text-slate-500 mt-1">شراء: {buyAmount.toLocaleString()} - فير: {(fareDiscountAmount || 0).toLocaleString()}</div> : null}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-1">استرجاع للعميل ({sellCurrencyCode})</div>
          <Input
            type="number"
            value={customerRefund}
            onChange={(e) => setCustomerRefund(Number(e.target.value))}
            placeholder={`حد أقصى: ${maxCustomerRefund}`}
          />
          <div className="text-[11px] text-slate-500 mt-1">لا يمكن أن يكون أكبر من إجمالي المعاملة الحالية.</div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">استرجاع من شركة الطيران ({airlineCurrencyCode})</div>
          <Input type="number" value={airlineGross} onChange={(e) => setAirlineGross(Number(e.target.value))} />
          <div className="text-[11px] text-slate-500 mt-1">المبلغ الذي سترجعه شركة الطيران (قبل الخصم).</div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">غرامة/عمولة شركة الطيران ({airlineCurrencyCode})</div>
          <Input type="number" value={airlinePenalty} onChange={(e) => setAirlinePenalty(Number(e.target.value))} />
          <div className="text-[11px] text-slate-500 mt-1">يتم خصمها من مبلغ الاسترجاع.</div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">الصافي يدخل رصيد الشركة</div>
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/20 p-3 font-black">
            {airlineNet} {airlineCurrencyCode}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">سبب الاسترجاع</div>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اختياري" />
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
        <Button
          loading={loading}
          disabled={customerRefund <= 0 || customerRefund > maxCustomerRefund || airlinePenalty > airlineGross}
          onClick={save}
        >
          حفظ الاسترجاع
        </Button>
      </div>
    </Modal>
  );
}
