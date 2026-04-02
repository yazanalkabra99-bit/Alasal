import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, CreditCard, HandCoins, RefreshCcw, CheckCircle2, Archive, MessageSquarePlus, Send, XCircle, Ban, CheckCheck, XOctagon, BellRing } from 'lucide-react';
import { api } from '../utils/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { fmtDate, fmtMoney, statusLabel, statusTone } from '../utils/format';
import { PaymentModal } from '../features/visa/PaymentModal';
import { VendorPaymentModal } from '../features/visa/VendorPaymentModal';
import { InternalCostPaymentModal } from '../features/common/InternalCostPaymentModal';
import { SourceRefundModal } from '../features/common/SourceRefundModal';
import { CustomerRefundModal } from '../features/common/CustomerRefundModal';
import { AssignVendorModal } from '../features/visa/AssignVendorModal';
import { UpdateVisaStatusModal } from '../features/visa/UpdateVisaStatusModal';
import { useAuth, hasAnyRole } from '../state/auth';
import type { VisaDetails, VisaAttachment, VisaStatus } from '../utils/types';

// Add Note Form Component
function AddNoteForm({ visaId, onNoteAdded }: { visaId?: string; onNoteAdded: () => void }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() || !visaId) return;
    
    setLoading(true);
    setError(null);
    try {
      await api.post(`/visa-requests/${visaId}/notes`, { note: note.trim() });
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

export function VisaDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<VisaDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phase 2: attachments
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // بنود التكلفة المتعددة
  const [newCostLabel, setNewCostLabel] = useState('');
  const [newCostPartyId, setNewCostPartyId] = useState('');
  const [newCostAmount, setNewCostAmount] = useState('');
  const [newCostCurrency, setNewCostCurrency] = useState('USD');
  const [addingCost, setAddingCost] = useState(false);
  const [costError, setCostError] = useState<string | null>(null);
  const [parties, setParties] = useState<any[]>([]);

  const [payOpen, setPayOpen] = useState(false);
  const [vendorPayOpen, setVendorPayOpen] = useState(false);
  const [internalPayOpen, setInternalPayOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [customerRefundOpen, setCustomerRefundOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const [statusOpen, setStatusOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [cancelRequesting, setCancelRequesting] = useState(false);
  const [cancelApproving, setCancelApproving] = useState(false);
  const [cancelRejecting, setCancelRejecting] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [nudgeCooldown, setNudgeCooldown] = useState(false);
  const [nudgeMsg, setNudgeMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/visa-requests/${id}`);
      setData(res.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل التفاصيل');
    } finally {
      setLoading(false);
    }
  }

  async function loadParties() {
    try {
      const res = await api.get('/meta/parties', { params: { type: 'office' } });
      setParties(res.data.data || []);
    } catch { /* ignore */ }
  }

  async function addCostItem() {
    if (!id || !newCostLabel.trim() || !newCostAmount) return;
    setAddingCost(true);
    setCostError(null);
    try {
      await api.post(`/visa-requests/${id}/cost-items`, {
        label: newCostLabel.trim(),
        vendor_party_id: newCostPartyId || null,
        amount: Number(newCostAmount),
        currency_code: newCostCurrency,
      });
      setNewCostLabel('');
      setNewCostPartyId('');
      setNewCostAmount('');
      setNewCostCurrency('USD');
      await load();
    } catch (e: any) {
      setCostError(e?.response?.data?.error || 'فشل إضافة البند');
    } finally {
      setAddingCost(false);
    }
  }

  async function deleteCostItem(itemId: number) {
    if (!id) return;
    try {
      await api.delete(`/visa-requests/${id}/cost-items/${itemId}`);
      await load();
    } catch (e: any) {
      setCostError(e?.response?.data?.error || 'فشل حذف البند');
    }
  }

  async function uploadAttachments() {
    if (!id) return;
    if (!uploadFiles.length) return;
    setUploading(true);
    try {
      for (const f of uploadFiles) {
        const fd = new FormData();
        fd.append('file', f);
        fd.append('label', 'مرفق');
        await api.post(`/visa-requests/${id}/attachments`, fd, {
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

  async function downloadAttachment(att: VisaAttachment) {
    if (!id) return;
    const res = await api.get(`/visa-requests/${id}/attachments/${att.id}/download`, {
      responseType: 'blob',
    } as any);
    const blob = new Blob([res.data], { type: att.mime_type || 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.original_name || 'attachment';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async function markDeliveredQuick() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/visa-requests/${id}/status`, { status: 'delivered', note: 'تم التسليم' });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل التسليم');
    } finally {
      setLoading(false);
    }
  }

  async function rejectInternalPayment() {
    if (!id) return;
    const note = window.prompt('سبب/ملاحظة رفض المحاسبة (اختياري):', '') || '';
    try {
      await api.post(`/visa-requests/${id}/internal-payment-reject`, { note: note.trim() || null });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل رفض الدفع');
    }
  }

  async function archiveVisa() {
    if (!id) return;
    setArchiving(true);
    setError(null);
    try {
      await api.post(`/visa-requests/${id}/archive`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل الأرشفة');
    } finally {
      setArchiving(false);
    }
  }

  async function unarchiveVisa() {
    if (!id) return;
    setArchiving(true);
    setError(null);
    try {
      await api.post(`/visa-requests/${id}/unarchive`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل إلغاء الأرشفة');
    } finally {
      setArchiving(false);
    }
  }

  // Cancel request functions
  async function requestCancel() {
    if (!id) return;
    const reason = window.prompt('سبب طلب الإلغاء (اختياري):', '') || '';
    setCancelRequesting(true);
    setError(null);
    try {
      await api.post(`/visa-requests/${id}/request-cancel`, { reason: reason.trim() || null });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل إرسال طلب الإلغاء');
    } finally {
      setCancelRequesting(false);
    }
  }

  async function approveCancel() {
    if (!id) return;
    setCancelApproving(true);
    setError(null);
    try {
      await api.post(`/visa-requests/${id}/approve-cancel`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل الموافقة على الإلغاء');
    } finally {
      setCancelApproving(false);
    }
  }

  async function rejectCancel() {
    if (!id) return;
    setCancelRejecting(true);
    setError(null);
    try {
      await api.post(`/visa-requests/${id}/reject-cancel`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل رفض طلب الإلغاء');
    } finally {
      setCancelRejecting(false);
    }
  }

  async function sendNudge() {
    if (!id || nudging || nudgeCooldown) return;
    setNudging(true);
    setNudgeMsg(null);
    try {
      await api.post(`/visa-requests/${id}/nudge`);
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

  useEffect(() => { load(); loadParties(); }, [id]);

  const visa = data?.visa;
  const summary = data?.summary;
  const attachments: VisaAttachment[] = (data?.attachments || []) as any;
  const costItems: any[] = data?.costItems || [];
  const extraEntries = useMemo(() => {
    const extras = (visa as any)?.extra_fields_display || (visa as any)?.extra_fields || {};
    return Object.entries(extras).filter(([k, v]) => v !== undefined && v !== null && String(v).trim() !== '');
  }, [visa]);

  const canCollect = hasAnyRole(user, 'accounting', 'admin');
  const canCustomerRefund = canCollect && ['rejected','cancelled'].includes(String((visa as any)?.display_status || (visa as any)?.status || '')) && Number((summary as any)?.paid_usd || 0) > 0;

  const canVendorPay = hasAnyRole(user, 'accounting', 'admin');
  const canAssignVendor = hasAnyRole(user, 'visa_admin', 'visa_admin_2', 'admin');

  const canUpdateWorkflow = hasAnyRole(user, 'visa_admin', 'visa_admin_2', 'admin');
  const canMarkDelivered = hasAnyRole(user, 'employee') && (visa as any)?.status === 'issued';
  const isArchived = Boolean((visa as any)?.archived_at);
  const canArchive = canUpdateWorkflow && ['delivered', 'cancelled', 'rejected'].includes((visa as any)?.status);

  const canSeeCost = hasAnyRole(user, 'visa_admin', 'visa_admin_2', 'accounting', 'admin');
  const canSeePayments = hasAnyRole(user, 'accounting', 'admin');
  const canSeeVendorPayments = hasAnyRole(user, 'accounting', 'admin');

  const isInternalSource = (visa as any)?.source_type === 'internal';

  const costCurrency = String((visa as any)?.cost_currency_code || '').toUpperCase();
  const costAmount = Number((visa as any)?.cost_amount || 0);

  const internalNetPaid = useMemo(() => {
    const rows = (data?.vendorPayments || []) as any[];
    return rows.reduce((sum, m) => {
      if (m.category === 'visa_internal_cost' && m.direction === 'out') return sum + Number(m.amount || 0);
      if (m.category === 'visa_internal_cost_refund' && m.direction === 'in') return sum - Number(m.amount || 0);
      return sum;
    }, 0);
  }, [data]);

  const vendorNetPaid = useMemo(() => {
    const rows = (data?.vendorPayments || []) as any[];
    return rows.reduce((sum, m) => {
      if (m.category === 'vendor_payment' && m.direction === 'out') return sum + Number(m.amount || 0);
      if (m.category === 'vendor_refund' && m.direction === 'in') return sum - Number(m.amount || 0);
      return sum;
    }, 0);
  }, [data]);

  const maxInternalPay = Math.max(0, costAmount - internalNetPaid);
  const maxSourceRefund = isInternalSource ? Math.max(0, internalNetPaid) : Math.max(0, vendorNetPaid);
  const refundKind = (isInternalSource ? 'internal' : 'external') as 'internal' | 'external';

  const remaining = useMemo(() => summary?.remaining_usd ?? 0, [summary]);
  const dispStatus = (visa as any)?.display_status || (visa as any)?.status;

  // Cancel request permissions
  const isCreator = Number((visa as any)?.created_by_id) === Number(user?.id);
  const cancelRequestStatus = (visa as any)?.cancel_request_status;
  const canRequestCancel = isCreator && !cancelRequestStatus && !['cancelled', 'rejected', 'delivered'].includes(String(dispStatus)) && !isArchived;
  const canApproveRejectCancel = hasAnyRole(user, 'visa_admin', 'visa_admin_2', 'admin') && cancelRequestStatus === 'pending';

  const allowedStatuses = useMemo(() => {
    const cur = ((visa as any)?.status || 'submitted') as VisaStatus;
    if (!canUpdateWorkflow) return [cur];
    const t: Record<VisaStatus, VisaStatus[]> = {
      submitted: ['processing', 'rejected', 'cancelled'],
      processing: ['issued', 'rejected', 'cancelled'],
      issued: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
      rejected: [],
      overdue: ['processing', 'issued', 'rejected', 'cancelled'],
    };
    const next = t[cur] || [];
    const list = [cur, ...next];
    // Allow manual switching back to "processing" when needed
    if (cur === 'issued') list.push('processing');
    return Array.from(new Set(list));
  }, [visa, canUpdateWorkflow]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowRight size={16} />
            رجوع
          </Button>
          <div>
            <div className="text-lg font-black">تفاصيل طلب فيزا #{id}</div>
            <div className="text-xs text-slate-400">كل شيء بمكان واحد</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCcw size={16} />
            تحديث
          </Button>
          {canUpdateWorkflow && visa && (
            <Button variant="secondary" size="sm" onClick={() => setStatusOpen(true)}>
              تغيير الحالة
            </Button>
          )}
          {canMarkDelivered && visa && (
            <Button size="sm" onClick={markDeliveredQuick}>
              <CheckCircle2 size={16} />
              تسليم
            </Button>
          )}
          {canUpdateWorkflow && visa && canArchive && !isArchived && (
            <Button variant="secondary" size="sm" onClick={archiveVisa} disabled={archiving}>
              <Archive size={16} />
              {archiving ? 'أرشفة…' : 'أرشفة'}
            </Button>
          )}
          {canUpdateWorkflow && visa && isArchived && (
            <Button variant="secondary" size="sm" onClick={unarchiveVisa} disabled={archiving}>
              <Archive size={16} />
              {archiving ? '...' : 'إلغاء الأرشفة'}
            </Button>
          )}
          {canAssignVendor && (
            <Button variant="secondary" size="sm" onClick={() => setAssignOpen(true)}>
              تحديد المكتب المصدر
            </Button>
          )}
          {canCollect && (
            <Button size="sm" onClick={() => setPayOpen(true)}>
              <HandCoins size={16} />
              تحصيل
            </Button>
          )}
          {canCustomerRefund && (
            <Button variant="secondary" size="sm" onClick={() => setCustomerRefundOpen(true)}>
              استرداد للعميل
            </Button>
          )}
          {canVendorPay && !isInternalSource && (
            <Button variant="secondary" size="sm" onClick={() => setVendorPayOpen(true)}>
              <CreditCard size={16} />
              سداد مصدر
            </Button>
          )}
          {canVendorPay && isInternalSource && costAmount > 0 && maxInternalPay > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setInternalPayOpen(true)}>
              <CreditCard size={16} />
              دفع تكلفة داخلية
            </Button>
          )}
          {canVendorPay && isInternalSource && costAmount > 0 && internalNetPaid <= 1e-9 && String((visa as any)?.internal_payment_status || '') === 'pending' && !['rejected','cancelled','delivered'].includes(String(dispStatus)) && (
            <Button variant="secondary" size="sm" onClick={rejectInternalPayment}>
              رفض الدفع
            </Button>
          )}
          {canVendorPay && ['rejected', 'cancelled'].includes(String(dispStatus)) && maxSourceRefund > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setRefundOpen(true)}>
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
          {!hasAnyRole(user, 'visa_admin', 'visa_admin_2', 'admin') && visa && (
            <div className="flex flex-col items-end gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={sendNudge}
                disabled={nudging || nudgeCooldown}
                title="أرسل تنبيهاً لمدير الفيزا"
              >
                <BellRing size={16} />
                {nudging ? 'جاري…' : nudgeCooldown ? 'تم الإرسال' : 'نكز'}
              </Button>
              {nudgeMsg && <span className="text-xs text-slate-400">{nudgeMsg}</span>}
            </div>
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
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {loading || !visa ? (
        <div className="mt-4 text-slate-400">تحميل…</div>
      ) : (
        <div className="mt-4 grid grid-cols-12 gap-4">
          {/* Left: Summary */}
          <div className="col-span-12 xl:col-span-4 space-y-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">الحالة</div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge tone={statusTone(dispStatus) as any}>{statusLabel(dispStatus)}</Badge>
                    {cancelRequestStatus === 'pending' && (
                      <Badge tone="amber">طلب إلغاء معلق</Badge>
                    )}
                    {cancelRequestStatus === 'rejected' && (
                      <Badge tone="red">طلب الإلغاء مرفوض</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">نوع الفيزا</div>
                  <div className="mt-1 text-sm font-black">{visa.visa_type_name}</div>
                </div>
              </div>

              {/* Cancel Request Info */}
              {cancelRequestStatus && (visa as any)?.cancel_request_reason && (
                <div className="mt-3 rounded-2xl border border-amber-800/50 bg-amber-950/30 p-3 text-sm">
                  <div className="text-xs text-amber-400">سبب طلب الإلغاء</div>
                  <div className="mt-1 text-amber-200">{(visa as any).cancel_request_reason}</div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3">
                  <div className="text-xs text-slate-400">سعر المبيع</div>
                  <div className="mt-1 text-lg font-black">{fmtMoney(visa.total_amount, visa.currency_code)}</div>
                </div>
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3">
                  <div className="text-xs text-slate-400">المتبقي (USD)</div>
                  <div className="mt-1 text-lg font-black">{fmtMoney(remaining, 'USD')}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-400">العميل</div>
                  <div className="font-bold">{visa.applicant_name}</div>
                  <div className="text-xs text-slate-500">{visa.applicant_phone}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">لصالح</div>
                  <div className="font-bold">{visa.billing_party_name}</div>
                  <div className="text-xs text-slate-500">{visa.billing_party_type === 'office' ? 'مكتب' : 'عميل مكتبنا'}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-400">تاريخ التقديم</div>
                  <div className="font-bold">{fmtDate(visa.submission_date)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">موعد الإنجاز</div>
                  <div className="font-bold">{fmtDate(visa.expected_delivery_date)}</div>
                </div>
              </div>

              {typeof (visa as any).days_left === 'number' && (
                <div className="mt-3 rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3 text-sm">
                  {(visa as any).is_overdue === 1 ? (
                    <div className="text-red-200">⚠️ متأخرة — تجاوز الموعد</div>
                  ) : (visa as any).is_due_soon === 1 ? (
                    <div className="text-amber-200">⏳ قرب الموعد — باقي {(visa as any).days_left} يوم</div>
                  ) : (
                    <div className="text-slate-300">باقي {(visa as any).days_left} يوم على الموعد</div>
                  )}
                </div>
              )}

              {(visa as any).delivered_at && (
                <div className="mt-3 text-xs text-slate-400">
                  ✅ تم التسليم بتاريخ {fmtDate((visa as any).delivered_at)}
                </div>
              )}

              {(visa as any).rejection_reason && (
                <div className="mt-2 text-xs text-red-200">
                  ❌ سبب الرفض: {(visa as any).rejection_reason}
                </div>
              )}
            </Card>

            {canSeeCost && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-black">المكتب المصدر والتكلفة</div>
                <div className="text-xs text-slate-400">
                  إجمالي: <span className="text-white font-bold">
                    {costItems.length > 0
                      ? `$${costItems.reduce((s, i) => s + Number(i.amount_usd || 0), 0).toFixed(2)}`
                      : fmtMoney(visa?.cost_amount || 0, visa?.cost_currency_code || 'USD')}
                  </span>
                </div>
              </div>

              {/* المصدر الأصلي */}
              {(visa as any)?.source_type === 'internal' ? (
                <div className="mb-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-sm text-blue-300">
                  مصدر داخلي (مكتبنا) — تكلفة: {fmtMoney(visa?.cost_amount || 0, visa?.cost_currency_code || 'USD')}
                </div>
              ) : (visa as any)?.vendor_party_id ? (
                <div className="mb-3 rounded-xl border border-slate-700/50 bg-slate-900/30 px-3 py-2 text-sm">
                  <span className="text-slate-400">المصدر الرئيسي: </span>
                  <span className="font-bold">{(visa as any).vendor_party_name}</span>
                  <span className="mr-2 text-slate-400">— {fmtMoney(visa?.cost_amount || 0, visa?.cost_currency_code || 'USD')}</span>
                </div>
              ) : (
                <div className="mb-3 text-sm text-slate-400">لم يتم تحديد المكتب المصدر بعد.</div>
              )}

              {/* بنود التكلفة الإضافية */}
              {costItems.length > 0 && (
                <div className="mb-3 space-y-2">
                  <div className="text-xs text-slate-400 mb-1">بنود التكلفة التفصيلية</div>
                  {costItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-700/40 bg-slate-900/20 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-white">{item.label}</span>
                        {item.vendor_party_name && (
                          <span className="mr-2 text-xs text-slate-400">({item.vendor_party_name})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white">
                          {fmtMoney(item.amount, item.currency_code)}
                        </span>
                        <span className="text-xs text-slate-500">≈ ${Number(item.amount_usd).toFixed(2)}</span>
                        {canAssignVendor && (
                          <button
                            onClick={() => deleteCostItem(item.id)}
                            className="text-red-400/60 hover:text-red-400 transition text-xs px-1"
                            title="حذف البند"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* نموذج إضافة بند جديد */}
              {canAssignVendor && (
                <div className="rounded-xl border border-dashed border-slate-700/50 bg-slate-900/20 p-3">
                  <div className="text-xs text-slate-400 mb-2">إضافة بند تكلفة</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <input
                      className="rounded-lg bg-slate-800/60 border border-slate-700/50 px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50"
                      placeholder="الوصف (مثال: اجرة الفيزا)"
                      value={newCostLabel}
                      onChange={e => setNewCostLabel(e.target.value)}
                    />
                    <select
                      className="rounded-lg bg-slate-800/60 border border-slate-700/50 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
                      value={newCostPartyId}
                      onChange={e => setNewCostPartyId(e.target.value)}
                    >
                      <option value="">— الجهة (اختياري) —</option>
                      {parties.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input
                      className="rounded-lg bg-slate-800/60 border border-slate-700/50 px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50"
                      placeholder="المبلغ"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newCostAmount}
                      onChange={e => setNewCostAmount(e.target.value)}
                    />
                    <select
                      className="rounded-lg bg-slate-800/60 border border-slate-700/50 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
                      value={newCostCurrency}
                      onChange={e => setNewCostCurrency(e.target.value)}
                    >
                      <option value="USD">USD</option>
                      <option value="AED">AED</option>
                      <option value="SYP">SYP</option>
                    </select>
                  </div>
                  {costError && <div className="text-xs text-red-400 mb-2">{costError}</div>}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={addCostItem}
                    disabled={addingCost || !newCostLabel.trim() || !newCostAmount}
                    loading={addingCost}
                  >
                    {addingCost ? 'جاري الإضافة…' : '+ إضافة بند'}
                  </Button>
                </div>
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
                  <div className="text-xs text-slate-500">
                    {uploadFiles.length ? `${uploadFiles.length} ملف جاهز للرفع` : '—'}
                  </div>
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

          {/* Right: Tables */}
          <div className="col-span-12 xl:col-span-8 space-y-4">
            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
                <div>
                  <div className="text-sm font-black">سجل حالات الطلب</div>
                  <div className="text-xs text-slate-400">من غيّر الحالة ومتى ولماذا</div>
                </div>
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
                              <Badge tone={statusTone(h.from_status || 'submitted') as any}>
                                {h.from_status ? statusLabel(h.from_status) : '—'}
                              </Badge>
                              <span className="text-slate-600">→</span>
                              <Badge tone={statusTone(h.to_status) as any}>{statusLabel(h.to_status)}</Badge>
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
                <AddNoteForm visaId={id} onNoteAdded={load} />
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


            {canSeeVendorPayments && (
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
                      <tr>
                        <td colSpan={5} className="px-4 py-5 text-slate-400">
                          لا توجد حركات
                        </td>
                      </tr>
                    ) : (
                      data!.vendorPayments.map((m: any) => {
                        const label =
                          m.category === 'vendor_payment'
                            ? 'سداد مصدر'
                            : m.category === 'vendor_refund'
                            ? 'استرداد مصدر'
                            : m.category === 'visa_internal_cost'
                            ? 'تكلفة داخلية'
                            : m.category === 'visa_internal_cost_refund'
                            ? 'استرداد تكلفة داخلية'
                            : m.category === 'transfer_fee'
                            ? 'عمولة تحويل'
                            : m.category;
                        const tone =
                          m.category === 'vendor_payment'
                            ? 'blue'
                            : m.category === 'visa_internal_cost'
                            ? 'purple'
                            : m.category === 'transfer_fee'
                            ? 'amber'
                            : m.category === 'vendor_refund' || m.category === 'visa_internal_cost_refund'
                            ? 'green'
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
      {data?.visa && (
        <>
          {canCollect && (<PaymentModal
            open={payOpen}
            onClose={() => setPayOpen(false)}
            transactionId={data.visa.transaction_id}
            defaultCurrencyCode={String(data.visa.currency_code || 'USD')}
            onSaved={load}
          />)}
          {canVendorPay && !isInternalSource && (<VendorPaymentModal
            open={vendorPayOpen}
            onClose={() => setVendorPayOpen(false)}
            visaRequestId={data.visa.id}
            defaultAmount={data.visa.cost_amount}
            onSaved={load}
          />)}
          {canVendorPay && isInternalSource && (
            <InternalCostPaymentModal
              open={internalPayOpen}
              onClose={() => setInternalPayOpen(false)}
              onSaved={load}
              basePath="visa-requests"
              requestId={data.visa.id}
              currencyCode={costCurrency || String(data.visa.cost_currency_code || 'USD')}
              maxAmount={maxInternalPay}
            />
          )}
          {canVendorPay && (
            <SourceRefundModal
              open={refundOpen}
              onClose={() => setRefundOpen(false)}
              onSaved={load}
              basePath="visa-requests"
              requestId={data.visa.id}
              refundKind={refundKind}
              currencyCode={costCurrency || String(data.visa.cost_currency_code || 'USD')}
              maxAmount={maxSourceRefund}
            />
          )}
          {canAssignVendor && (<AssignVendorModal
            open={assignOpen}
            onClose={() => setAssignOpen(false)}
            visaRequestId={data.visa.id}
            onSaved={load}
          />)}
          {canCustomerRefund && (
            <CustomerRefundModal
              open={customerRefundOpen}
              onClose={() => setCustomerRefundOpen(false)}
              transactionId={data.visa.transaction_id}
              onSaved={load}
              title="استرداد للعميل"
            />
          )}
          {canUpdateWorkflow && (
            <UpdateVisaStatusModal
              open={statusOpen}
              onClose={() => setStatusOpen(false)}
              visaRequestId={data.visa.id}
              currentStatus={data.visa.status as any}
              allowedStatuses={allowedStatuses}
              onSaved={load}
            />
          )}
        </>
      )}
    </div>
  );
}
