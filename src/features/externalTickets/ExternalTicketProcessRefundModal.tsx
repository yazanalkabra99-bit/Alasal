import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';

interface Props {
  open: boolean;
  onClose: () => void;
  ticketId: number;
  sellCurrencyCode: string;
  buyCurrencyCode: string;
  maxCustomerRefund: number;
  maxSourceRefund: number;
  onSaved: () => void;
}

export function ExternalTicketProcessRefundModal({
  open,
  onClose,
  ticketId,
  sellCurrencyCode,
  buyCurrencyCode,
  maxCustomerRefund,
  maxSourceRefund,
  onSaved,
}: Props) {
  const [customerRefund, setCustomerRefund] = useState('');
  const [sourceRefund, setSourceRefund] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const custAmt = Number(customerRefund || 0);
    const srcAmt = Number(sourceRefund || 0);

    if (custAmt <= 0 && srcAmt <= 0) {
      setError('يجب إدخال قيمة استرجاع واحدة على الأقل');
      setLoading(false);
      return;
    }

    if (custAmt > maxCustomerRefund) {
      setError(`قيمة استرجاع العميل أكبر من الحد الأقصى (${maxCustomerRefund} ${sellCurrencyCode})`);
      setLoading(false);
      return;
    }

    if (srcAmt > maxSourceRefund) {
      setError(`قيمة استرجاع المصدر أكبر من الحد الأقصى (${maxSourceRefund} ${buyCurrencyCode})`);
      setLoading(false);
      return;
    }

    try {
      await api.post(`/external-tickets/${ticketId}/process-refund`, {
        customer_refund_amount: custAmt,
        source_refund_amount: srcAmt,
        reason: reason.trim() || undefined,
        note: note.trim() || undefined,
      });
      onSaved();
      onClose();
      setCustomerRefund('');
      setSourceRefund('');
      setReason('');
      setNote('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'فشل تنفيذ الاسترجاع');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="استرجاع التذكرة">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-sm text-blue-700 dark:text-blue-200">
          <strong>ملاحظة:</strong> هذا الاسترجاع يعدّل قيم التذكرة فقط. عمليات الصناديق (دفع/استلام الفلوس) تتم من قبل المحاسبة.
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            المبلغ المسترجع للعميل ({sellCurrencyCode})
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max={maxCustomerRefund}
            value={customerRefund}
            onChange={(e) => setCustomerRefund(e.target.value)}
            placeholder={`الحد الأقصى: ${maxCustomerRefund}`}
            className="w-full rounded-xl bg-slate-900/50 border border-slate-700/70 px-3 py-2 text-sm text-slate-100"
          />
          <div className="text-[11px] text-slate-500 mt-1">كم سنرجع للعميل؟</div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            المبلغ المسترجع من المصدر ({buyCurrencyCode})
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max={maxSourceRefund}
            value={sourceRefund}
            onChange={(e) => setSourceRefund(e.target.value)}
            placeholder={`الحد الأقصى: ${maxSourceRefund}`}
            className="w-full rounded-xl bg-slate-900/50 border border-slate-700/70 px-3 py-2 text-sm text-slate-100"
          />
          <div className="text-[11px] text-slate-500 mt-1">كم سيرجع لنا المكتب المصدر؟</div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">السبب</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="سبب الاسترجاع..."
            className="w-full rounded-xl bg-slate-900/50 border border-slate-700/70 px-3 py-2 text-sm text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">ملاحظات إضافية</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ملاحظات..."
            rows={2}
            className="w-full rounded-xl bg-slate-900/50 border border-slate-700/70 px-3 py-2 text-sm text-slate-100 resize-none"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button type="submit" loading={loading}>
            تنفيذ الاسترجاع
          </Button>
        </div>
      </form>
    </Modal>
  );
}
