import React, { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { api } from "../../utils/api";
import { statusLabel } from "../../utils/format";

const STATUSES = [
  "submitted",
  "processing",
  "issued",
  "delivered",
  "cancelled",
  "rejected",
  "overdue",
] as const;

export function ChangeStatusModal({
  open,
  onClose,
  visaRequestId,
  currentStatus,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  visaRequestId: number;
  currentStatus: string;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStatus(currentStatus);
    setError(null);
  }, [open, currentStatus]);

  async function save() {
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/visa-requests/${visaRequestId}/status`, { status });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || "فشل تغيير الحالة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="تغيير حالة الفيزا" width="max-w-md">
      {error && (
        <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200 mb-3">
          {error}
        </div>
      )}

      <div className="text-xs text-slate-400 mb-2">اختر الحالة الجديدة</div>
      <Select value={status} onChange={(e) => setStatus(e.target.value)}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
          </option>
        ))}
      </Select>

      {status === "issued" && (
        <div className="mt-3 text-xs text-slate-300">
          ✅ عند اختيار <b>صدرت</b> سيظهر إشعار للموظف للتواصل مع العميل.
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          إلغاء
        </Button>
        <Button loading={loading} onClick={save}>
          حفظ
        </Button>
      </div>
    </Modal>
  );
}
