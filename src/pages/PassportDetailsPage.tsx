import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Archive, CheckCircle2, CreditCard, HandCoins, RefreshCcw, MessageSquarePlus, Send, Ban, CheckCheck, XOctagon, BellRing } from 'lucide-react';
import { api } from '../utils/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { fmtDate, fmtMoney, passportStatusLabel, passportStatusTone } from '../utils/format';
import type { PassportAttachment, PassportDetails, PassportStatus } from '../utils/types';
import { hasAnyRole, useAuth } from '../state/auth';
import { PaymentModal } from '../features/visa/PaymentModal';
import { AssignPassportSourceModal } from '../features/passport/AssignPassportSourceModal';
import { PassportVendorPaymentModal } from '../features/passport/PassportVendorPaymentModal';
import { UpdatePassportStatusModal } from '../features/passport/UpdatePassportStatusModal';
import { InternalCostPaymentModal } from '../features/common/InternalCostPaymentModal';
import { SourceRefundModal } from '../features/common/SourceRefundModal';
import { CustomerRefundModal } from '../features/common/CustomerRefundModal';

// Add Note Form Component
function AddPassportNoteForm({ passportId, onNoteAdded }: { passportId: number; onNoteAdded: () => void }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      await api.post(`/passport-requests/${passportId}/notes`, { note: note.trim() });
      setNote('');
      onNoteAdded();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'فشل إضافة الملاحظة');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="flex-1 relative">
        <MessageSquarePlus size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="أضف ملاحظة على الطلب..."
          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg py-2 pr-10 pl-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          disabled={loading}
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        disabled={!note.trim() || loading}
        loading={loading}
        className="flex items-center gap-1"
      >
        <Send size={14} />
        إضافة
      </Button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </form>
  );
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function PassportDetailsPage() {
  const { id } = useParams();
  const passportRequestId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState<PassportDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openPayment, setOpenPayment] = useState(false);
  const [openAssignSource, setOpenAssignSource] = useState(false);
  const [openVendorPayment, setOpenVendorPayment] = useState(false);
  const [openInternalPayment, setOpenInternalPayment] = useState(false);
  const [openRefund, setOpenRefund] = useState(false);
  const [openCustomerRefund, setOpenCustomerRefund] = useState(false);
  const [openStatus, setOpenStatus] = useState(false);
  const [cancelRequesting, setCancelRequesting] = useState(false);
  const [cancelApproving, setCancelApproving] = useState(false);
  const [cancelRejecting, setCancelRejecting] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [nudgeCooldown, setNudgeCooldown] = useState(false);
  const [nudgeMsg, setNudgeMsg] = useState<string | null>(null);
  // Attachments
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const canUpdateWorkflow = hasAnyRole(user, 'passport_admin', 'admin');
  // تحديد المصدر يجب أن يكون من مدير الجوازات/المدير
  const canAssignSource = hasAnyRole(user, 'passport_admin', 'admin');
  const canArchive = canUpdateWorkflow;

  const canCollect = hasAnyRole(user, 'accounting', 'admin');
  const canSeePayments = canCollect;
  const canPayVendor = hasAnyRole(user, 'accounting', 'admin');
  const canSeeVendorPayments = canPayVendor;

  const canSeeCost = hasAnyRole(user, 'passport_admin', 'accounting', 'admin');

  const passport = data?.passport;
  const attachments = (data?.attachments || []) as PassportAttachment[];

  const currentStatus: PassportStatus = (passport?.display_status || passport?.status || passport?.passport_status || 'submitted') as any;
  const isArchived = passport?.archived_at != null;

  const isInternalSource = String(passport?.source_type || '') === 'internal';
  const costCurrency = String((passport as any)?.cost_currency_code || '').toUpperCase();
  const costAmount = safeNum((passport as any)?.cost_amount || 0);

  const internalNetPaid = useMemo(() => {
    const rows = (data?.vendorPayments || []) as any[];
    return rows.reduce((sum, m) => {
      if (m.category === 'passport_internal_cost' && m.direction === 'out') return sum + safeNum(m.amount);
      if (m.category === 'passport_internal_cost_refund' && m.direction === 'in') return sum - safeNum(m.amount);
      return sum;
    }, 0);
  }, [data]);

  const vendorNetPaid = useMemo(() => {
    const rows = (data?.vendorPayments || []) as any[];
    return rows.reduce((sum, m) => {
      if (m.category === 'vendor_payment' && m.direction === 'out') return sum + safeNum(m.amount);
      if (m.category === 'vendor_refund' && m.direction === 'in') return sum - safeNum(m.amount);
      return sum;
    }, 0);
  }, [data]);

  const maxInternalPay = Math.max(0, costAmount - internalNetPaid);
  const maxSourceRefund = isInternalSource ? Math.max(0, internalNetPaid) : Math.max(0, vendorNetPaid);
  const refundKind = (isInternalSource ? 'internal' : 'external') as 'internal' | 'external';

  const canEditWhileActive =
    !isArchived && !['delivered', 'rejected', 'cancelled'].includes(String(currentStatus));

  const canMarkDelivered =
    hasAnyRole(user, 'employee') &&
    !isArchived &&
    String(currentStatus) === 'ready' &&
    Number(passport?.created_by_id) === Number(user?.id);

  const canArchiveNow =
    canArchive && !isArchived && ['delivered', 'rejected', 'cancelled'].includes(String(currentStatus));
  const canUnarchiveNow = canArchive && isArchived;

  const allowedStatuses = useMemo<PassportStatus[]>(() => {
    const s = currentStatus;
    const map: Record<string, PassportStatus[]> = {
      submitted: ['submitted', 'processing', 'rejected', 'cancelled'],
      processing: ['processing', 'ready', 'rejected', 'cancelled'],
      ready: ['ready', 'delivered', 'cancelled'],
      delivered: ['delivered'],
      rejected: ['rejected'],
      cancelled: ['cancelled'],
      overdue: ['overdue', 'processing', 'ready', 'rejected', 'cancelled', 'delivered'],
    };
    return map[s] || ['submitted', 'processing', 'ready', 'delivered', 'rejected', 'cancelled'];
  }, [currentStatus]);

  async function load() {
    if (!passportRequestId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/passport-requests/${passportRequestId}`);
      setData(res.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل تفاصيل الطلب');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passportRequestId]);

  async function uploadAttachments() {
    if (!passportRequestId) return;
    if (!uploadFiles.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const f of uploadFiles) {
        const fd = new FormData();
        fd.append('file', f);
        fd.append('label', 'مرفق');
        await api.post(`/passport-requests/${passportRequestId}/attachments`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setUploadFiles([]);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل رفع المرفقات');
    } finally {
      setUploading(false);
    }
  }

  async function downloadAttachment(att: PassportAttachment) {
    try {
      const res = await api.get(`/passport-requests/${passportRequestId}/attachments/${att.id}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: att.mime_type || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.original_name || `attachment-${att.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      // Silent fail; UI already shows errors elsewhere
      console.error(e);
    }
  }

  async function archive() {
    try {
      await api.post(`/passport-requests/${passportRequestId}/archive`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر الأرشفة');
    }
  }

  async function unarchive() {
    try {
      await api.post(`/passport-requests/${passportRequestId}/unarchive`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر إلغاء الأرشفة');
    }
  }

  async function sendNudge() {
    if (!passportRequestId || nudging || nudgeCooldown) return;
    setNudging(true);
    setNudgeMsg(null);
    try {
      await api.post(`/passport-requests/${passportRequestId}/nudge`);
      setNudgeMsg('✅ تم إرسال النكز');
      setNudgeCooldown(true);
      setTimeout(() => { setNudgeCooldown(false); setNudgeMsg(null); }, 30 * 60 * 1000);
    } catch (e: any) {
      setNudgeMsg(e?.response?.data?.error || 'فشل إرسال النكز');
      setTimeout(() => setNudgeMsg(null), 5000);
    } finally {
      setNudging(false);
    }
  }

  async function markDeliveredQuick() {
    try {
      await api.patch(`/passport-requests/${passportRequestId}/status`, { status: 'delivered' });
      await load();
    } catch (e) {
      console.error(e);
      setError('فشل تحديث الحالة');
    }
  }

  // Cancel request functions
  async function requestCancel() {
    if (!passportRequestId) return;
    const reason = window.prompt('سبب طلب الإلغاء (اختياري):', '') || '';
    setCancelRequesting(true);
    setError(null);
    try {
      await api.post(`/passport-requests/${passportRequestId}/request-cancel`, { reason: reason.trim() || null });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل إرسال طلب الإلغاء');
    } finally {
      setCancelRequesting(false);
    }
  }

  async function approveCancel() {
    if (!passportRequestId) return;
    setCancelApproving(true);
    setError(null);
    try {
      await api.post(`/passport-requests/${passportRequestId}/approve-cancel`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل الموافقة على الإلغاء');
    } finally {
      setCancelApproving(false);
    }
  }

  async function rejectCancel() {
    if (!passportRequestId) return;
    setCancelRejecting(true);
    setError(null);
    try {
      await api.post(`/passport-requests/${passportRequestId}/reject-cancel`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل رفض طلب الإلغاء');
    } finally {
      setCancelRejecting(false);
    }
  }

  const summary = data?.summary;

  const extraEntries = useMemo(() => {
    const extras = (passport as any)?.extra_fields_display || (passport as any)?.extra_fields || {};
    return Object.entries(extras).filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== '');
  }, [passport]);

  const remaining = useMemo(() => summary?.remaining_usd ?? 0, [summary]);
  const dispStatus = (passport as any)?.display_status || (passport as any)?.status;
  const canCustomerRefund = canCollect && ['rejected', 'cancelled'].includes(String(dispStatus)) && Number(summary?.paid_usd || 0) > 0;

  // Cancel request permissions
  const isCreator = Number((passport as any)?.created_by_id) === Number(user?.id);
  const cancelRequestStatus = (passport as any)?.cancel_request_status;
  const canRequestCancel = isCreator && !cancelRequestStatus && !['cancelled', 'rejected', 'delivered'].includes(String(dispStatus)) && !isArchived;
  const canApproveRejectCancel = hasAnyRole(user, 'passport_admin', 'admin') && cancelRequestStatus === 'pending';

  async function rejectInternalPayment() {
    if (!passportRequestId) return;
    const note = window.prompt('سبب/ملاحظة رفض المحاسبة (اختياري):', '') || '';
    try {
      await api.post(`/passport-requests/${passportRequestId}/internal-payment-reject`, { note: note.trim() || null });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل رفض الدفع');
    }
  }

  if (!passportRequestId) {
    return (
      <Card>
        <div className="text-sm text-slate-400">رقم الطلب غير صحيح</div>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowRight size={16} />
            رجوع
          </Button>
          <div>
            <div className="text-lg font-black">تفاصيل طلب جواز #{passportRequestId}</div>
            <div className="text-xs text-slate-400">كل شيء بمكان واحد</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw size={16} />
            تحديث
          </Button>

          {canUpdateWorkflow && passport && (
            <Button variant="secondary" size="sm" onClick={() => setOpenStatus(true)}>
              تغيير الحالة
            </Button>
          )}

          {canMarkDelivered && passport && (
            <Button size="sm" onClick={markDeliveredQuick}>
              <CheckCircle2 size={16} />
              تسليم
            </Button>
          )}

          {canUpdateWorkflow && passport && canArchiveNow && (
            <Button variant="secondary" size="sm" onClick={archive}>
              <Archive size={16} />
              أرشفة
            </Button>
          )}

          {canUpdateWorkflow && passport && canUnarchiveNow && (
            <Button variant="secondary" size="sm" onClick={unarchive}>
              <Archive size={16} />
              إلغاء الأرشفة
            </Button>
          )}

          {canAssignSource && passport && !isArchived && (
            <Button variant="secondary" size="sm" onClick={() => setOpenAssignSource(true)}>
              تحديد المكتب المصدر
            </Button>
          )}

          {canCollect && passport?.transaction_id && !isArchived ? (
            <Button size="sm" onClick={() => setOpenPayment(true)}>
              <HandCoins size={16} />
              تحصيل
            </Button>
          ) : null}

          {canCustomerRefund && passport?.transaction_id ? (
            <Button variant="secondary" size="sm" onClick={() => setOpenCustomerRefund(true)}>
              استرداد للعميل
            </Button>
          ) : null}

          {canPayVendor && passport?.source_type === 'external' && !isArchived ? (
            <Button variant="secondary" size="sm" onClick={() => setOpenVendorPayment(true)}>
              <CreditCard size={16} />
              سداد مصدر
            </Button>
          ) : null}

          {canPayVendor && isInternalSource && costAmount > 0 && maxInternalPay > 0 && !isArchived ? (
            <Button variant="secondary" size="sm" onClick={() => setOpenInternalPayment(true)}>
              <CreditCard size={16} />
              دفع تكلفة داخلية
            </Button>
          ) : null}

          {canPayVendor && isInternalSource && !isArchived && costAmount > 0 && internalNetPaid <= 1e-9 && String((passport as any)?.internal_payment_status || '') === 'pending' ? (
            <Button variant="secondary" size="sm" onClick={rejectInternalPayment}>
              رفض الدفع
            </Button>
          ) : null}

          {canPayVendor && ['rejected', 'cancelled'].includes(String(dispStatus)) && maxSourceRefund > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setOpenRefund(true)}>
              استرداد
            </Button>
          )}
          {/* Cancel Request Buttons */}
          {canRequestCancel && (
            <Button variant="secondary" size="sm" onClick={requestCancel} disabled={cancelRequesting}>
              <Ban size={16} />
              {cancelRequesting ? 'جاري الإرسال...' : 'طلب إلغاء'}
            </Button>
          )}
          {canApproveRejectCancel && (
            <>
              <Button variant="primary" size="sm" onClick={approveCancel} disabled={cancelApproving}>
                <CheckCheck size={16} />
                {cancelApproving ? 'جاري...' : 'الموافقة على الإلغاء'}
              </Button>
              <Button variant="secondary" size="sm" onClick={rejectCancel} disabled={cancelRejecting}>
                <XOctagon size={16} />
                {cancelRejecting ? 'جاري...' : 'رفض الإلغاء'}
              </Button>
            </>
          )}
          {!hasAnyRole(user, 'passport_admin', 'admin') && passport && (
            <div className="flex flex-col items-end gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={sendNudge}
                disabled={nudging || nudgeCooldown}
                title="أرسل تنبيهاً لمدير الجوازات"
              >
                <BellRing size={16} />
                {nudging ? 'جاري…' : nudgeCooldown ? 'تم الإرسال' : 'نكز'}
              </Button>
              {nudgeMsg && <span className="text-xs text-slate-400">{nudgeMsg}</span>}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {loading || !passport ? (
        <div className="mt-4 text-slate-400">تحميل…</div>
      ) : (
        <div className="mt-4 grid grid-cols-12 gap-4">
          {/* Left */}
          <div className="col-span-12 xl:col-span-4 space-y-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">الحالة</div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge tone={passportStatusTone(String(currentStatus)) as any}>
                      {passportStatusLabel(String(currentStatus))}
                    </Badge>
                    {isArchived ? <Badge tone="gray">أرشيف</Badge> : null}
                    {cancelRequestStatus === 'pending' && (
                      <Badge tone="amber">طلب إلغاء معلق</Badge>
                    )}
                    {cancelRequestStatus === 'rejected' && (
                      <Badge tone="red">طلب الإلغاء مرفوض</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">نوع الجواز</div>
                  <div className="mt-1 text-sm font-black">{passport.passport_type_name}</div>
                </div>
              </div>

              {/* Cancel Request Info */}
              {cancelRequestStatus && (passport as any)?.cancel_request_reason && (
                <div className="mt-3 rounded-2xl border border-amber-800/50 bg-amber-950/30 p-3 text-sm">
                  <div className="text-xs text-amber-400">سبب طلب الإلغاء</div>
                  <div className="mt-1 text-amber-200">{(passport as any).cancel_request_reason}</div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3">
                  <div className="text-xs text-slate-400">سعر المبيع</div>
                  <div className="mt-1 text-lg font-black">{fmtMoney(passport.total_amount, passport.currency_code)}</div>
                </div>
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3">
                  <div className="text-xs text-slate-400">المتبقي (USD)</div>
                  <div className="mt-1 text-lg font-black">{fmtMoney(remaining, 'USD')}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-400">العميل</div>
                  <div className="font-bold">{passport.applicant_name}</div>
                  <div className="text-xs text-slate-500">{passport.applicant_phone}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">لصالح</div>
                  <div className="font-bold">{passport.billing_party_name}</div>
                  <div className="text-xs text-slate-500">{passport.billing_party_type === 'office' ? 'مكتب' : 'عميل مكتبنا'}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-400">تاريخ التقديم</div>
                  <div className="font-bold">{fmtDate(passport.submission_date)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">موعد الإنجاز</div>
                  <div className="font-bold">{fmtDate(passport.expected_delivery_date)}</div>
                </div>
              </div>

              {typeof (passport as any).days_left === 'number' && (
                <div className="mt-3 rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3 text-sm">
                  {(passport as any).is_overdue === 1 ? (
                    <div className="text-red-200">⚠️ متأخرة — تجاوز الموعد</div>
                  ) : (passport as any).is_due_soon === 1 ? (
                    <div className="text-amber-200">⏳ قرب الموعد — باقي {(passport as any).days_left} يوم</div>
                  ) : (
                    <div className="text-slate-300">باقي {(passport as any).days_left} يوم على الموعد</div>
                  )}
                </div>
              )}

              {(passport as any).delivered_at && (
                <div className="mt-3 text-xs text-slate-400">✅ تم التسليم بتاريخ {fmtDate((passport as any).delivered_at)}</div>
              )}

              {(passport as any).rejection_reason && (
                <div className="mt-2 text-xs text-red-200">❌ سبب الرفض: {(passport as any).rejection_reason}</div>
              )}
            </Card>

            {canSeeCost && (
              <Card>
                <div className="text-sm font-black">المكتب المصدر والتكلفة</div>
                {(passport as any).source_type === 'internal' ? (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3">
                      <div className="text-xs text-slate-400">المصدر</div>
                      <div className="mt-1 font-bold">مكتبنا (مصدر داخلي)</div>
                    </div>
                    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3">
                      <div className="text-xs text-slate-400">التكلفة الداخلية</div>
                      <div className="mt-1 font-bold">{fmtMoney((passport as any).cost_amount || 0, (passport as any).cost_currency_code || 'USD')}</div>
                    </div>
                  </div>
                ) : (passport as any).vendor_party_id ? (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3">
                      <div className="text-xs text-slate-400">المكتب المصدر</div>
                      <div className="mt-1 font-bold">{(passport as any).vendor_party_name || `#${(passport as any).vendor_party_id}`}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3">
                      <div className="text-xs text-slate-400">التكلفة</div>
                      <div className="mt-1 font-bold">{fmtMoney((passport as any).cost_amount || 0, (passport as any).cost_currency_code || 'USD')}</div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-slate-400">لم يتم تحديد المكتب المصدر بعد.</div>
                )}
              </Card>
            )}

            {extraEntries.length > 0 && (
              <Card>
                <div className="text-sm font-black">بيانات إضافية</div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {extraEntries.map(([k, v]) => (
                    <div key={k} className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3">
                      <div className="text-xs text-slate-400">{k}</div>
                      <div className="mt-1 font-bold">{String(v)}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black">المرفقات</div>
                  <div className="text-xs text-slate-400">PDF / صور مرتبطة بالطلب</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs text-slate-400 mb-1">رفع مرفقات جديدة</div>
                <input
                  className="w-full rounded-xl bg-slate-900/50 border border-slate-700/70 px-3 py-2 text-sm text-slate-100"
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                />
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-slate-500">{uploadFiles.length ? `${uploadFiles.length} ملف جاهز للرفع` : '—'}</div>
                  <Button variant="secondary" onClick={uploadAttachments} disabled={!uploadFiles.length || uploading}>
                    {uploading ? 'جاري الرفع…' : 'رفع'}
                  </Button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800/60 overflow-hidden">
                <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between">
                  <div className="text-xs text-slate-400">قائمة المرفقات</div>
                  <div className="text-xs text-slate-500">{attachments.length} ملف</div>
                </div>
                {attachments.length === 0 ? (
                  <div className="p-4 text-sm text-slate-400">لا يوجد مرفقات بعد.</div>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {attachments.map((a) => (
                      <div key={a.id} className="p-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-200 text-sm">{a.original_name}</div>
                          <div className="text-xs text-slate-500">رفع بواسطة {a.uploaded_by_name} — {fmtDate(a.uploaded_at)}</div>
                        </div>
                        <Button variant="secondary" onClick={() => downloadAttachment(a)}>
                          تنزيل
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right */}
          <div className="col-span-12 xl:col-span-8 space-y-4">
            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800/60">
                <div className="text-sm font-black">سجل حالات الطلب</div>
                <div className="text-xs text-slate-400">من غيّر الحالة ومتى ولماذا</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900/40 text-slate-300">
                    <tr>
                      <th className="text-right px-4 py-3">التاريخ</th>
                      <th className="text-right px-4 py-3">من → إلى</th>
                      <th className="text-right px-4 py-3">بواسطة</th>
                      <th className="text-right px-4 py-3">ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((data as any)?.history || []).length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-5 text-slate-400">لا يوجد سجل بعد</td></tr>
                    ) : (
                      ((data as any).history as any[]).slice().reverse().map((h: any) => (
                        <tr key={h.id} className="border-t border-slate-800/60">
                          <td className="px-4 py-3 text-slate-300">{fmtDate(h.changed_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Badge tone={passportStatusTone(String(h.from_status || 'submitted')) as any}>
                                {h.from_status ? passportStatusLabel(String(h.from_status)) : '—'}
                              </Badge>
                              <span className="text-slate-600">→</span>
                              <Badge tone={passportStatusTone(String(h.to_status)) as any}>{passportStatusLabel(String(h.to_status))}</Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-200">{h.changed_by_name || '—'}</td>
                          <td className="px-4 py-3 text-slate-400">{h.note || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Add Note Form */}
              <div className="px-4 py-3 border-t border-slate-800/60 bg-slate-900/20">
                <AddPassportNoteForm passportId={passportRequestId} onNoteAdded={load} />
              </div>
            </Card>

            {canSeePayments ? (
              <>
              <Card className="p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800/60">
                  <div className="text-sm font-black">دفعات التحصيل</div>
                  <div className="text-xs text-slate-400">المدفوعات المرتبطة بالعملية</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-900/40 text-slate-300">
                      <tr>
                        <th className="text-right px-4 py-3">التاريخ</th>
                        <th className="text-right px-4 py-3">الإيصال</th>
                        <th className="text-right px-4 py-3">الحساب</th>
                        <th className="text-right px-4 py-3">المبلغ</th>
                        <th className="text-right px-4 py-3">ملاحظة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.payments || []).length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-5 text-slate-400">لا توجد دفعات</td></tr>
                      ) : (
                        data!.payments.map((p: any) => (
                          <tr key={p.id} className="border-t border-slate-800/60">
                            <td className="px-4 py-3 text-slate-300">{fmtDate(p.paid_at)}</td>
                            <td className="px-4 py-3 text-slate-200 font-bold">{p.receipt_no || '—'}</td>
                            <td className="px-4 py-3">{p.account_name}</td>
                            <td className="px-4 py-3 font-black">{fmtMoney(p.amount, p.currency_code)}</td>
                            <td className="px-4 py-3 text-slate-400">{p.note || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800/60">
                  <div className="text-sm font-black">استردادات العميل</div>
                  <div className="text-xs text-slate-400">الاسترداد المالي للعميل (عكس التحصيل)</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-900/40 text-slate-300">
                      <tr>
                        <th className="text-right px-4 py-3">التاريخ</th>
                        <th className="text-right px-4 py-3">الحساب</th>
                        <th className="text-right px-4 py-3">المبلغ</th>
                        <th className="text-right px-4 py-3">ملاحظة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(((data as any)?.customerRefunds) || []).length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-5 text-slate-400">لا توجد استردادات</td></tr>
                      ) : (
                        (((data as any)?.customerRefunds) as any[]).map((r: any) => (
                          <tr key={r.id} className="border-t border-slate-800/60">
                            <td className="px-4 py-3 text-slate-300">{fmtDate(r.happened_at)}</td>
                            <td className="px-4 py-3">{r.account_name}</td>
                            <td className="px-4 py-3 font-black">{fmtMoney(r.amount, r.currency_code)}</td>
                            <td className="px-4 py-3 text-slate-400">{r.note || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
              </>
            ) : (
              <Card>
                <div className="text-sm font-black">ملخص الدفعات</div>
                <div className="text-xs text-slate-400">تفاصيل الدفعات تظهر للمحاسبة فقط</div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3">
                    <div className="text-xs text-slate-400">المدفوع (USD)</div>
                    <div className="mt-1 font-black">{fmtMoney(summary?.paid_usd ?? 0, 'USD')}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3">
                    <div className="text-xs text-slate-400">مرتجع (USD)</div>
                    <div className="mt-1 font-black">{fmtMoney(summary?.refunded_usd ?? 0, 'USD')}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3">
                    <div className="text-xs text-slate-400">المتبقي (USD)</div>
                    <div className="mt-1 font-black">{fmtMoney(summary?.remaining_usd ?? 0, 'USD')}</div>
                  </div>
                </div>
              </Card>
            )}

            {canPayVendor && (
              <Card className="p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800/60">
                  <div className="text-sm font-black">مدفوعات المصدر</div>
                  <div className="text-xs text-slate-400">سداد + عمولة تحويل إن وجدت</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-900/40 text-slate-300">
                      <tr>
                        <th className="text-right px-4 py-3">النوع</th>
                        <th className="text-right px-4 py-3">التاريخ</th>
                        <th className="text-right px-4 py-3">الحساب</th>
                        <th className="text-right px-4 py-3">المبلغ</th>
                        <th className="text-right px-4 py-3">ملاحظة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.vendorPayments || []).length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-5 text-slate-400">لا توجد حركات</td></tr>
                      ) : (
                        (data!.vendorPayments || []).map((m: any) => {
                          const category = String(m.category || '');
                          const label =
                            category === 'vendor_payment'
                              ? 'سداد مصدر'
                              : category === 'vendor_refund'
                                ? 'استرداد مصدر'
                              : category === 'transfer_fee'
                                ? 'عمولة تحويل'
                                : category === 'passport_internal_cost'
                                  ? 'تكلفة (مكتبنا)'
                                  : category === 'passport_internal_cost_refund'
                                    ? 'استرجاع تكلفة'
                                    : category;
                          const tone =
                            category === 'vendor_payment' || category === 'passport_internal_cost'
                              ? 'blue'
                              : category === 'vendor_refund' || category === 'passport_internal_cost_refund'
                                ? 'green'
                              : category === 'transfer_fee'
                                ? 'amber'
                                : 'gray';
                          return (
                            <tr key={m.id} className="border-t border-slate-800/60">
                              <td className="px-4 py-3">
                                <Badge tone={tone as any}>{label}</Badge>
                              </td>
                              <td className="px-4 py-3 text-slate-300">{fmtDate(m.happened_at)}</td>
                              <td className="px-4 py-3">{m.account_name}</td>
                              <td className="px-4 py-3 font-black">{fmtMoney(m.amount, m.currency_code)}</td>
                              <td className="px-4 py-3 text-slate-400">{m.note || '—'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {passport?.transaction_id ? (
        <PaymentModal
          open={openPayment}
          onClose={() => setOpenPayment(false)}
          transactionId={Number(passport.transaction_id)}
          defaultCurrencyCode={String(passport.currency_code || 'USD')}
          onSaved={load}
        />
      ) : null}

      {passport?.transaction_id ? (
        <CustomerRefundModal
          open={openCustomerRefund}
          onClose={() => setOpenCustomerRefund(false)}
          transactionId={Number(passport.transaction_id)}
          onSaved={load}
          title="استرداد للعميل"
        />
      ) : null}

      <AssignPassportSourceModal
        open={openAssignSource}
        onClose={() => setOpenAssignSource(false)}
        passportRequestId={passportRequestId}
        onSaved={load}
      />

      <PassportVendorPaymentModal
        open={openVendorPayment}
        onClose={() => setOpenVendorPayment(false)}
        passportRequestId={passportRequestId}
        onSaved={load}
      />

      {passport && (
        <>
          <InternalCostPaymentModal
            open={openInternalPayment}
            onClose={() => setOpenInternalPayment(false)}
            onSaved={load}
            basePath="passport-requests"
            requestId={passportRequestId}
            currencyCode={costCurrency || String((passport as any)?.cost_currency_code || 'USD')}
            maxAmount={maxInternalPay}
          />
          <SourceRefundModal
            open={openRefund}
            onClose={() => setOpenRefund(false)}
            onSaved={load}
            basePath="passport-requests"
            requestId={passportRequestId}
            refundKind={refundKind}
            currencyCode={costCurrency || String((passport as any)?.cost_currency_code || 'USD')}
            maxAmount={maxSourceRefund}
          />
        </>
      )}

      <UpdatePassportStatusModal
        open={openStatus}
        onClose={() => setOpenStatus(false)}
        passportRequestId={passportRequestId}
        currentStatus={currentStatus}
        allowed={allowedStatuses}
        onSaved={load}
      />
    </div>
  );
}
