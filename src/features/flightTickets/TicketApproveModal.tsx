import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export function TicketApproveModal({
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
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNote('');
    setError(null);
    setSaving(false);
  }, [open]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/flight-tickets/${ticketId}/approve`, { note });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تنفيذ الموافقة');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="موافقة على التذكرة" onClose={onClose} width="max-w-lg">
      <div className="space-y-3">
        {error && (
          <div className="rounded-2xl border border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="text-sm text-slate-300">
          عند الموافقة سيتم خصم تكلفة التذكرة من رصيد شركة الطيران (حسب إعداد الشركة)،
          وستتحول حالة التذكرة إلى <span className="font-bold">مباعة</span>.
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">ملاحظة (اختياري)</div>
          <textarea
            className="w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm outline-none"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثال: تم التأكد من السعر / تم التأكد من الرصيد…"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button tone="ghost" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button onClick={submit} loading={saving}>
            موافقة
          </Button>
        </div>
      </div>
    </Modal>
  );
}
