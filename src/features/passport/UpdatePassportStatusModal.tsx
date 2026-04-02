import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';
import { passportStatusLabel } from '../../utils/format';
import type { PassportStatus } from '../../utils/types';

export function UpdatePassportStatusModal({
  open,
  onClose,
  passportRequestId,
  currentStatus,
  allowed,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  passportRequestId: number;
  currentStatus: PassportStatus;
  allowed: PassportStatus[];
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<PassportStatus>(currentStatus);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStatus(currentStatus);
    setNote('');
    setError(null);
  }, [open, currentStatus]);

  const needReason = useMemo(() => status === 'rejected' || status === 'cancelled', [status]);

  async function save() {
    setLoading(true);
    setError(null);
    try {
      const payload: any = { status };
      if (note.trim()) payload.note = note.trim();
      if (status === 'rejected') payload.rejection_reason = note.trim();
      await api.patch(`/passport-requests/${passportRequestId}/status`, payload);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحديث الحالة');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="تغيير حالة الجواز" width="max-w-xl">
      {error && (
        <div className="mb-3 rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-1">الحالة الحالية</div>
          <Input value={passportStatusLabel(currentStatus)} disabled />
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">الحالة الجديدة</div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as PassportStatus)}>
            {allowed.map((s) => (
              <option key={s} value={s}>
                {passportStatusLabel(s)}
              </option>
            ))}
          </Select>
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-slate-400 mb-1">ملاحظة / سبب (اختياري)</div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={needReason ? 'اكتب السبب…' : 'اختياري'} />
          {needReason && !note.trim() ? (
            <div className="mt-1 text-xs text-amber-300">مطلوب سبب عند الرفض/الإلغاء</div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button loading={loading} disabled={loading || (needReason && !note.trim())} onClick={save}>حفظ</Button>
      </div>
    </Modal>
  );
}
