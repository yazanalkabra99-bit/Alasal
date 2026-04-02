import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export function TicketRejectModal({
  open,
  ticketId,
  onClose,
  onSaved,
}: {
  open: boolean;
  ticketId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setNote('');
    setError(null);
    setSaving(false);
  }, [open]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/flight-tickets/${ticketId}/reject`, { reason, note });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تنفيذ الرفض');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="رفض التذكرة" onClose={onClose} width="max-w-lg">
      <div className="space-y-3">
        {error && (
          <div className="rounded-2xl border border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="text-sm text-slate-300">
          سيتم إلغاء التذكرة (بدون خصم من رصيد شركة الطيران). سيتم جعل إجمالي المعاملة = 0
          ليظهر إن كان هناك تحصيل سابق كـ <span className="font-bold">مستحق للعميل</span>.
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">سبب الرفض (اختياري)</div>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm outline-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: سعر غير صحيح / لا يوجد رصيد / PNR غير صحيح…"
          />
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">ملاحظة (اختياري)</div>
          <textarea
            className="w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm outline-none"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder=""
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button tone="ghost" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button variant="secondary" onClick={submit} loading={saving}>
            رفض
          </Button>
        </div>
      </div>
    </Modal>
  );
}
