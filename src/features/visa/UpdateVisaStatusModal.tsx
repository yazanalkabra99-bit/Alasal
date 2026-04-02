import React, { useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { statusLabel } from '../../utils/format';
import type { VisaStatus } from '../../utils/types';
import { api } from '../../utils/api';

export function UpdateVisaStatusModal({
  open,
  onClose,
  visaRequestId,
  currentStatus,
  allowedStatuses,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  visaRequestId: number;
  currentStatus: VisaStatus;
  allowedStatuses: VisaStatus[];
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<VisaStatus>(currentStatus);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsReason = useMemo(() => status === 'rejected' || status === 'cancelled', [status]);
  const reasonLabel = status === 'rejected' ? 'سبب الرفض' : 'سبب الإلغاء';

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: any = { status };
      if (note.trim()) payload.note = note.trim();
      if (status === 'rejected' && note.trim()) payload.rejection_reason = note.trim();
      await api.patch(`/visa-requests/${visaRequestId}/status`, payload);
      onClose();
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تحديث الحالة');
    } finally {
      setSaving(false);
    }
  }

  // Reset form when opened
  React.useEffect(() => {
    if (!open) return;
    setStatus(currentStatus);
    setNote('');
    setError(null);
  }, [open, currentStatus]);

  return (
    <Modal open={open} onClose={onClose} title="تغيير حالة الطلب" width="max-w-md">
      {error && (
        <div className="mb-3 rounded-2xl border border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className="text-xs text-slate-400 mb-1">الحالة الجديدة</div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as VisaStatus)}>
            {allowedStatuses.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">{needsReason ? reasonLabel : 'ملاحظة (اختياري)'} </div>
          <Input
            placeholder={needsReason ? 'اكتب السبب…' : 'مثلاً: تمت الطباعة / تم الاتصال بالعميل…'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {needsReason && (
            <div className="text-[11px] text-slate-500 mt-1">السبب مطلوب لهذه الحالة.</div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={save} disabled={saving || (needsReason && !note.trim())}>
            {saving ? 'حفظ…' : 'حفظ'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
