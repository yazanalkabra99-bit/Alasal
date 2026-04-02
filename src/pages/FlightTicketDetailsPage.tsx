import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RefreshCcw, MessageSquarePlus, Send, MessageCircle, BellRing, Paperclip } from 'lucide-react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import type { FlightTicketDetails, FlightTicketActionRequest, FlightTicketActionType } from '../utils/types';
import { fmtMoney, fmtDate, flightTicketStatusTone, flightTicketStatusLabel } from '../utils/format';
import { useAuth, hasAnyRole } from '../state/auth';
import { PaymentModal } from '../features/visa/PaymentModal';
import { TransactionRefundModal } from '../features/flightTickets/TransactionRefundModal';
import { TicketVoidModal } from '../features/flightTickets/TicketVoidModal';
import { TicketRefundModal } from '../features/flightTickets/TicketRefundModal';
import { EditFlightTicketModal } from '../features/flightTickets/EditFlightTicketModal';
import { TicketApproveModal } from '../features/flightTickets/TicketApproveModal';
import { TicketRejectModal } from '../features/flightTickets/TicketRejectModal';
import { TicketActionRequestModal } from '../features/flightTickets/TicketActionRequestModal';
import { TicketActionRequestRejectModal } from '../features/flightTickets/TicketActionRequestRejectModal';

// Add Note Form Component
function AddTicketNoteForm({ ticketId, onNoteAdded }: { ticketId: number; onNoteAdded: () => void }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      await api.post(`/flight-tickets/${ticketId}/notes`, { note: note.trim() });
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
          placeholder="أضف ملاحظة على التذكرة..."
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

export function FlightTicketDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [row, setRow] = useState<FlightTicketDetails | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [payOpen, setPayOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [refundMoneyOpen, setRefundMoneyOpen] = useState(false);

  const [actionRequests, setActionRequests] = useState<FlightTicketActionRequest[]>([]);
  const [requestModal, setRequestModal] = useState<{ open: boolean; type: FlightTicketActionType }>({ open: false, type: 'refund' });
  const [rejectReq, setRejectReq] = useState<FlightTicketActionRequest | null>(null);
  const [cancelReq, setCancelReq] = useState<FlightTicketActionRequest | null>(null);
  const [canceling, setCanceling] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [nudgeCooldown, setNudgeCooldown] = useState(false);
  const [nudgeMsg, setNudgeMsg] = useState<string | null>(null);

  const canCollect = hasAnyRole(user, 'accounting', 'admin');
  // Ticket manager (airline_admin) should also be able to Refund/Void tickets.
  // Keep money collection / refund payouts restricted to accounting/admin.
  const canRefundVoid = hasAnyRole(user, 'airline_admin', 'accounting', 'admin');
  const canApprove = hasAnyRole(user, 'airline_admin', 'admin');
  const canEditFull = hasAnyRole(user, 'airline_admin', 'accounting', 'admin');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/flight-tickets/${id}`);
      setRow(res.data.data || null);
      try {
        const attRes = await api.get(`/flight-tickets/${id}/attachments`);
        setAttachments(attRes.data.data || []);
      } catch {
        setAttachments([]);
      }
      try {
        const notesRes = await api.get(`/flight-tickets/${id}/notes`);
        setNotes(notesRes.data.data || []);
      } catch {
        setNotes([]);
      }
      try {
        const reqRes = await api.get(`/flight-tickets/${id}/action-requests`);
        setActionRequests(reqRes.data.data || []);
      } catch {
        setActionRequests([]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل تفاصيل التذكرة');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function downloadAttachment(att: any) {
    if (!id) return;
    const res = await api.get(`/flight-tickets/${id}/attachments/${att.id}/download`, {
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

  async function uploadAttachments() {
    if (!id || !uploadFiles.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const f of uploadFiles) {
        const fd = new FormData();
        fd.append('file', f);
        fd.append('label', 'مرفق');
        await api.post(`/flight-tickets/${id}/attachments`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setUploadFiles([]);
      await load();
    } catch (e: any) {
      setUploadError(e?.response?.data?.error || 'فشل رفع المرفقات');
    } finally {
      setUploading(false);
    }
  }

  async function sendNudge() {
    if (!id || nudging || nudgeCooldown) return;
    setNudging(true);
    setNudgeMsg(null);
    try {
      await api.post(`/flight-tickets/${id}/nudge`);
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

  const payments = useMemo(() => (row as any)?.payments || [], [row]);
  const summary = useMemo(() => (row as any)?.summary || null, [row]);
  const ticketRefunds = useMemo(() => (row as any)?.ticket_refunds || [], [row]);

  // NOTE: row is null on first render; avoid direct property access (it causes a blank page).
  const paidUsd = Number(summary?.paid_usd ?? (row as any)?.paid_usd ?? 0);
  const remainingUsd = Number(summary?.remaining_usd ?? (row as any)?.remaining_usd ?? (row?.sell_usd ?? 0));

  const txCurrency = String((row as any)?.tx_currency_code || row?.sell_currency_code || 'USD');
  const txTotalUsd = Number((row as any)?.tx_total_usd ?? (row?.sell_usd ?? 0));
  const txTotalAmount = Number((row as any)?.tx_total_amount ?? (row?.sell_amount ?? 0));

  // Convert USD summary back to transaction currency using the ticket's transaction snapshot rate.
  // This keeps the collection dashboard primarily in sell currency, while still showing USD as an extra.
  const usdToTx = txTotalUsd > 0 ? (txTotalAmount / txTotalUsd) : 1;
  const paidAmount = paidUsd * usdToTx;
  const remainingAmount = remainingUsd * usdToTx;

  const isPending = String(row?.status || '') === 'pending';
  const isOwner = Number((row as any)?.created_by || 0) === Number(user?.id || 0);
  const isOnlyEmployeeUser = !!user && !hasAnyRole(user, 'visa_admin', 'passport_admin', 'airline_admin', 'accounting', 'admin');
  // Allow employees to refund/void their own tickets directly (like managers)
  const canRefundVoidOwnTicket = isOwner && !isPending;
  const pendingRefundReq = actionRequests.some((r) => r.status === 'pending' && r.action_type === 'refund');
  const pendingVoidReq = actionRequests.some((r) => r.status === 'pending' && r.action_type === 'void');
  const canEdit = !!row && ((isPending && (canEditFull || isOwner)) || (!isPending && canEditFull));
  const passengerOnlyEdit = !isPending;

  if (loading) {
    return <div className="text-sm text-slate-400">تحميل…</div>;
  }

  if (error) {
    return (
      <div>
        <div className="rounded-2xl border border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200">{error}</div>
        <div className="mt-3">
          <Button variant="secondary" onClick={() => navigate('/flight-tickets')}>رجوع</Button>
        </div>
      </div>
    );
  }

  if (!row) {
    return <div className="text-sm text-slate-400">لا توجد بيانات لعرضها</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-lg font-black">تفاصيل تذكرة طيران</div>
          <div className="text-xs text-slate-400">#{row.id} — {fmtDate(row.created_at)}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCcw size={16} />
            تحديث
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/flight-tickets')}>رجوع للقائمة</Button>
          {canEdit ? (
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>تعديل</Button>
          ) : null}
          {canApprove && isPending ? (
            <Button size="sm" onClick={() => setApproveOpen(true)}>موافقة</Button>
          ) : null}
          {canApprove && isPending ? (
            <Button variant="secondary" size="sm" onClick={() => setRejectOpen(true)}>رفض</Button>
          ) : null}
          {canCollect && row.transaction_id ? (
            <Button size="sm" onClick={() => setPayOpen(true)}>تحصيل</Button>
          ) : null}
          {canCollect && row.transaction_id && remainingUsd < 0 ? (
            <Button variant="secondary" size="sm" onClick={() => setRefundMoneyOpen(true)}>دفع استرجاع</Button>
          ) : null}
          {(canRefundVoid || canRefundVoidOwnTicket) && row.transaction_id && !['pending', 'void'].includes(String(row.status)) ? (
            <Button variant="secondary" size="sm" onClick={() => setRefundOpen(true)} disabled={String(row.status) === 'refunded'}>
              استرجاع
            </Button>
          ) : null}
          {(canRefundVoid || canRefundVoidOwnTicket) && row.transaction_id && !['pending', 'void','refunded'].includes(String(row.status)) ? (
            <Button variant="secondary" size="sm" onClick={() => setVoidOpen(true)}>VOID</Button>
          ) : null}
          {/* Request buttons removed - employees can now refund/void directly like managers */}
          {!hasAnyRole(user, 'airline_admin', 'admin') && row && (
            <div className="flex flex-col items-end gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={sendNudge}
                disabled={nudging || nudgeCooldown}
                title="أرسل تنبيهاً لمدير التذاكر"
              >
                <BellRing size={16} />
                {nudging ? 'جاري…' : nudgeCooldown ? 'تم الإرسال' : 'نكز'}
              </Button>
              {nudgeMsg && <span className="text-xs text-slate-400">{nudgeMsg}</span>}
            </div>
          )}
        </div>
      </div>

      <Card>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-400 mb-1">الحالة</div>
            <Badge tone={flightTicketStatusTone(row.status) as any}>{flightTicketStatusLabel(row.status)}</Badge>
            {(row.approved_at || row.rejected_at || row.approval_note) ? (
              <div className="mt-2 text-[11px] text-slate-400 space-y-1">
                {row.approved_at ? <div>تمت الموافقة: {fmtDate(row.approved_at)}</div> : null}
                {row.rejected_at ? <div>تم الرفض: {fmtDate(row.rejected_at)}</div> : null}
                {row.approval_note ? <div className="text-slate-300">ملاحظة: {row.approval_note}</div> : null}
              </div>
            ) : (
              isPending ? <div className="mt-2 text-[11px] text-slate-500">بانتظار موافقة ادمن التذاكر / المدير</div> : null
            )}
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">شركة الطيران</div>
            <div className="font-bold">{row.airline_company_name}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">المسافر</div>
            <div className="font-bold">{row.passenger_name}</div>
            <div className="text-xs text-slate-500">{row.passenger_phone || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">PNR</div>
            <div className="font-bold">{row.pnr || '—'}</div>
          </div>


          <div>
            <div className="text-xs text-slate-400 mb-1">موعد الرحلة</div>
            <div className="font-bold">{(row as any).flight_at ? fmtDate((row as any).flight_at) : '—'}</div>
            {(row as any).flight_at ? <div className="text-[11px] text-slate-500">تنبيه قبل 24 ساعة</div> : null}
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">الشراء</div>
            <div className="font-black">{fmtMoney(row.buy_amount, row.buy_currency_code)}</div>
            <div className="text-xs text-slate-500">≈ {fmtMoney(row.buy_usd, 'USD')}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">المبيع</div>
            <div className="font-black">{fmtMoney(row.sell_amount, row.sell_currency_code)}</div>
            <div className="text-xs text-slate-500">≈ {fmtMoney(row.sell_usd, 'USD')}</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">حسم الفير</div>
            <div className="font-black">{fmtMoney(row.fare_discount_usd || 0, 'USD')}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">الربح</div>
            <div className="font-black">{fmtMoney(row.profit_usd, 'USD')}</div>
          </div>
        </div>
      </Card>

      {(actionRequests.length > 0 || (isOnlyEmployeeUser && isOwner && row.transaction_id)) ? (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold">طلبات الاسترجاع / VOID</div>
                <div className="text-xs text-slate-500">{actionRequests.length} طلب</div>
              </div>
            </div>

            {actionRequests.length === 0 ? (
              <div className="mt-3 text-xs text-slate-500">لا يوجد طلبات بعد</div>
            ) : (
              <div className="mt-3 space-y-2">
                {actionRequests.map((r) => {
                  const statusTone =
                    r.status === 'pending'
                      ? 'amber'
                      : r.status === 'approved'
                        ? 'green'
                        : r.status === 'rejected'
                          ? 'red'
                          : 'gray';
                  const statusLabel =
                    r.status === 'pending'
                      ? 'معلّق'
                      : r.status === 'approved'
                        ? 'تم التنفيذ'
                        : r.status === 'rejected'
                          ? 'مرفوض'
                          : 'ملغي';
                  const actionLabel = r.action_type === 'void' ? 'VOID' : 'استرجاع';
                  return (
                    <div key={r.id} className="rounded-2xl border border-slate-800/60 bg-slate-900/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-black">{actionLabel}</div>
                            <Badge tone={statusTone as any} size="sm" dot>
                              {statusLabel}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            بواسطة: {r.requested_by_name || `#${r.requested_by}`} • {fmtDate(r.requested_at)}
                          </div>
                          {r.reason || r.note ? (
                            <div className="mt-2 text-xs text-slate-200 space-y-1">
                              {r.reason ? (
                                <div>
                                  <span className="text-slate-500">السبب:</span> {r.reason}
                                </div>
                              ) : null}
                              {r.note ? (
                                <div>
                                  <span className="text-slate-500">ملاحظة:</span> {r.note}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          {r.status !== 'pending' && (r.processed_note || r.processed_by_name || r.processed_at) ? (
                            <div className="mt-2 text-[11px] text-slate-500">
                              تمت المعالجة{r.processed_by_name ? ` بواسطة: ${r.processed_by_name}` : ''}{r.processed_at ? ` • ${fmtDate(r.processed_at)}` : ''}{r.processed_note ? ` • ${r.processed_note}` : ''}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          {canRefundVoid && r.status === 'pending' ? (
                            <>
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  if (r.action_type === 'void') setVoidOpen(true);
                                  else setRefundOpen(true);
                                }}
                              >
                                فتح
                              </Button>
                              <Button variant="secondary" onClick={() => setRejectReq(r)}>
                                رفض
                              </Button>
                            </>
                          ) : null}

                          {isOnlyEmployeeUser && isOwner && r.status === 'pending' && Number(r.requested_by) === Number(user?.id) ? (
                            <Button variant="secondary" onClick={() => setCancelReq(r)}>
                              إلغاء
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {/* التحصيل مثل الفيز */}
      {canCollect && (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold">تحصيل سعر التذكرة</div>
                <div className="text-xs text-slate-500">
                  يتم التحصيل عبر الدفعات على المعاملة (مثل الفيز) — رقم المعاملة: {row.transaction_id || '—'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={!row.transaction_id}
                  onClick={() => setPayOpen(true)}
                >
                  إضافة دفعة تحصيل
                </Button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/20 p-3">
                <div className="text-xs text-slate-400">إجمالي المعاملة</div>
                <div className="text-lg font-black">{fmtMoney(txTotalAmount, txCurrency)}</div>
                <div className="text-xs text-slate-500">≈ {fmtMoney(txTotalUsd, 'USD')}</div>
              </div>
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/20 p-3">
                <div className="text-xs text-slate-400">المحصّل</div>
                <div className="text-lg font-black">{fmtMoney(paidAmount, txCurrency)}</div>
                <div className="text-xs text-slate-500">≈ {fmtMoney(paidUsd, 'USD')}</div>
              </div>
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/20 p-3">
                <div className="text-xs text-slate-400">{remainingUsd < 0 ? 'مستحق للعميل' : 'المتبقي'}</div>
                <div className="text-lg font-black">{fmtMoney(Math.abs(remainingAmount), txCurrency)}</div>
                <div className="text-xs text-slate-500">≈ {fmtMoney(Math.abs(remainingUsd), 'USD')}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-slate-400 mb-2">دفعات التحصيل</div>

              {payments.length === 0 ? (
                <div className="text-xs text-slate-500">لا توجد دفعات بعد</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-900/40 text-slate-300">
                      <tr>
                        <th className="text-right px-3 py-2">الإيصال</th>
                        <th className="text-right px-3 py-2">الحساب</th>
                        <th className="text-right px-3 py-2">المبلغ</th>
                        <th className="text-right px-3 py-2">USD</th>
                        <th className="text-right px-3 py-2">الطريقة</th>
                        <th className="text-right px-3 py-2">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p: any) => (
                        <tr key={p.id} className="border-t border-slate-800/60">
                          <td className="px-3 py-2 font-bold text-slate-200">{p.receipt_no || '—'}</td>
                          <td className="px-3 py-2 text-slate-200">{p.account_name || '—'}</td>
                          <td className="px-3 py-2 text-slate-200">{fmtMoney(Number(p.amount || 0), String(p.currency_code || 'USD'))}</td>
                          <td className="px-3 py-2 text-slate-400">{fmtMoney(Number(p.amount_usd || 0), 'USD')}</td>
                          <td className="px-3 py-2 text-slate-300">{p.method || '—'}</td>
                          <td className="px-3 py-2 text-slate-400">{fmtDate(p.paid_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {canCollect && (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">عمليات الاسترجاع / VOID</div>
                <div className="text-xs text-slate-500">{ticketRefunds.length} عملية</div>
              </div>
            </div>

            {ticketRefunds.length === 0 ? (
              <div className="mt-3 text-xs text-slate-500">لا توجد عمليات بعد</div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900/40 text-slate-300">
                    <tr>
                      <th className="text-right px-3 py-2">النوع</th>
                      <th className="text-right px-3 py-2">استرجاع العميل (USD)</th>
                      <th className="text-right px-3 py-2">صافي رصيد الشركة</th>
                      <th className="text-right px-3 py-2">بواسطة</th>
                      <th className="text-right px-3 py-2">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketRefunds.map((r: any) => (
                      <tr key={r.id} className="border-t border-slate-800/60">
                        <td className="px-3 py-2 font-bold text-slate-200">{String(r.type) === 'void' ? 'VOID' : (String(r.type) === 'reject' ? 'رفض' : 'استرجاع')}</td>
                        <td className="px-3 py-2 text-slate-200">{fmtMoney(Number(r.customer_refund_sell_usd || 0), 'USD')}</td>
                        <td className="px-3 py-2 text-slate-200">
                          {Number(r.airline_net_return_amount || 0)} {row.buy_currency_code}
                        </td>
                        <td className="px-3 py-2 text-slate-300">{r.created_by_name || '—'}</td>
                        <td className="px-3 py-2 text-slate-400">{fmtDate(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Paperclip size={16} className="text-slate-400" />
              <div>
                <div className="text-sm font-bold">المرفقات</div>
                <div className="text-xs text-slate-500">{attachments.length} ملف</div>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="rounded-xl border border-dashed border-slate-700/60 bg-slate-900/30 p-3 mb-4">
            <div className="text-xs text-slate-400 mb-2">رفع مرفقات جديدة (PDF / صور / Word — حد 10MB)</div>
            <input
              className="w-full rounded-lg bg-slate-800/50 border border-slate-700/50 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500/20 file:text-orange-300 file:text-xs file:px-3 file:py-1 file:cursor-pointer cursor-pointer"
              type="file"
              multiple
              accept="application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => { setUploadFiles(Array.from(e.target.files || [])); setUploadError(null); }}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {uploadFiles.length ? `${uploadFiles.length} ملف جاهز للرفع` : 'لم يتم اختيار ملفات'}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={uploadAttachments}
                disabled={!uploadFiles.length || uploading}
                loading={uploading}
              >
                {uploading ? 'جاري الرفع…' : 'رفع'}
              </Button>
            </div>
            {uploadError && (
              <div className="mt-2 text-xs text-red-400">{uploadError}</div>
            )}
          </div>

          {/* Attachments List */}
          {attachments.length === 0 ? (
            <div className="text-xs text-slate-500">لا يوجد مرفقات بعد</div>
          ) : (
            <div className="space-y-2">
              {attachments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-950/30 p-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-200">{a.original_name}</div>
                    <div className="text-[11px] text-slate-500">
                      {a.uploaded_by_name || 'مجهول'} • {fmtDate(a.uploaded_at)}
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => downloadAttachment(a)}>تحميل</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Notes Section */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800/60 flex items-center gap-3">
          <MessageCircle size={18} className="text-blue-400" />
          <div>
            <div className="text-sm font-black">الملاحظات</div>
            <div className="text-xs text-slate-400">ملاحظات وتعليقات على التذكرة</div>
          </div>
        </div>
        <div className="divide-y divide-slate-800/60">
          {notes.length === 0 ? (
            <div className="p-4 text-sm text-slate-400">لا توجد ملاحظات بعد</div>
          ) : (
            notes.map((n: any) => (
              <div key={n.id} className="p-3 hover:bg-slate-800/20">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-slate-200">{n.note}</p>
                  <span className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(n.created_at)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">بواسطة: {n.created_by_name}</p>
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-800/60 bg-slate-900/20">
          <AddTicketNoteForm ticketId={Number(row.id)} onNoteAdded={load} />
        </div>
      </Card>

      {canEdit ? (
        <EditFlightTicketModal
          open={editOpen}
          ticket={row}
          passengerOnly={passengerOnlyEdit}
          onClose={() => setEditOpen(false)}
          onSaved={() => load()}
        />
      ) : null}

      {canApprove ? (
        <TicketApproveModal
          open={approveOpen}
          ticketId={Number(row.id)}
          onClose={() => setApproveOpen(false)}
          onSaved={load}
        />
      ) : null}

      {canApprove ? (
        <TicketRejectModal
          open={rejectOpen}
          ticketId={Number(row.id)}
          onClose={() => setRejectOpen(false)}
          onSaved={load}
        />
      ) : null}


      {canCollect && row.transaction_id ? (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          transactionId={Number(row.transaction_id)}
          onSaved={load}
        />
      ) : null}

      {canCollect && row.transaction_id ? (
        <TransactionRefundModal
          open={refundMoneyOpen}
          onClose={() => setRefundMoneyOpen(false)}
          transactionId={Number(row.transaction_id)}
          onSaved={load}
        />
      ) : null}

      {(canRefundVoid || canRefundVoidOwnTicket) && row.transaction_id ? (
        <TicketVoidModal
          open={voidOpen}
          onClose={() => setVoidOpen(false)}
          ticketId={Number(row.id)}
          onSaved={load}
          sellCurrencyCode={String((row as any)?.tx_currency_code || row.sell_currency_code || 'USD')}
          maxSellAmount={Number((row as any)?.tx_total_amount ?? row.sell_amount ?? 0)}
        />
      ) : null}

      {(canRefundVoid || canRefundVoidOwnTicket) && row.transaction_id ? (
        <TicketRefundModal
          open={refundOpen}
          onClose={() => setRefundOpen(false)}
          ticketId={Number(row.id)}
          sellCurrencyCode={String((row as any)?.tx_currency_code || row.sell_currency_code)}
          airlineCurrencyCode={String(row.buy_currency_code)}
          maxCustomerRefund={Number((row as any)?.tx_total_amount ?? txTotalAmount)}
          buyAmount={Number(row.buy_amount || 0)}
          fareDiscountAmount={Number(row.fare_discount_amount || 0)}
          onSaved={load}
        />
      ) : null}

      {/* Requests (Employee) */}
      {row.transaction_id ? (
        <TicketActionRequestModal
          open={requestModal.open}
          ticketId={Number(row.id)}
          actionType={requestModal.type}
          onClose={() => setRequestModal((s) => ({ ...s, open: false }))}
          onSaved={load}
        />
      ) : null}

      {/* Reject request (Manager) */}
      {rejectReq ? (
        <TicketActionRequestRejectModal
          open={!!rejectReq}
          requestId={Number(rejectReq.id)}
          ticketId={Number(row.id)}
          actionType={rejectReq.action_type}
          onClose={() => setRejectReq(null)}
          onSaved={load}
        />
      ) : null}

      {/* Cancel request (Employee) */}
      <ConfirmDialog
        open={!!cancelReq}
        title="إلغاء الطلب"
        message="هل أنت متأكد أنك تريد إلغاء هذا الطلب؟"
        confirmText="نعم، إلغاء"
        cancelText="رجوع"
        variant="warning"
        loading={canceling}
        onCancel={() => {
          if (canceling) return;
          setCancelReq(null);
        }}
        onConfirm={async () => {
          if (!cancelReq) return;
          setCanceling(true);
          try {
            await api.post(`/flight-tickets/action-requests/${cancelReq.id}/cancel`);
            toast.success('تم الإلغاء', 'تم إلغاء الطلب بنجاح');
            setCancelReq(null);
            await load();
          } catch (e: any) {
            toast.error('تعذر الإلغاء', e?.response?.data?.error || 'حدث خطأ أثناء إلغاء الطلب');
          } finally {
            setCanceling(false);
          }
        }}
      />
    </div>
  );
}
