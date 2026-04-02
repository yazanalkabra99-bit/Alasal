import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowLeftRight, RefreshCw, User, Phone, MapPin,
  Building2, TrendingUp, CheckCircle2, XCircle, Calendar, FileText, Pencil
} from 'lucide-react';
import { api } from '../utils/api';
import { fmtMoney, fmtDate, extTicketStatusTone, extTicketStatusLabel } from '../utils/format';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth, hasAnyRole } from '../state/auth';
import { ExternalTicketCollectModal } from '../features/externalTickets/ExternalTicketCollectModal';
import { ExternalTicketRefundModal } from '../features/externalTickets/ExternalTicketRefundModal';
import { ExternalTicketSourcePaymentModal } from '../features/externalTickets/ExternalTicketSourcePaymentModal';
import { ExternalTicketProcessRefundModal } from '../features/externalTickets/ExternalTicketProcessRefundModal';
import { EditExternalTicketModal } from '../features/externalTickets/EditExternalTicketModal';
import { ExternalTicketVoidModal } from '../features/externalTickets/ExternalTicketVoidModal';

export function ExternalTicketDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = hasAnyRole(user, 'accounting', 'admin', 'airline_admin');
  const canAccounting = hasAnyRole(user, 'accounting', 'admin');

  const [ticket, setTicket] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [financials, setFinancials] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [collectOpen, setCollectOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [paySourceOpen, setPaySourceOpen] = useState(false);
  const [processRefundOpen, setProcessRefundOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/external-tickets/${id}`);
      setTicket(res.data.data);
      try {
        const attRes = await api.get(`/external-tickets/${id}/attachments`);
        setAttachments(attRes.data.data || []);
      } catch {
        setAttachments([]);
      }

      if (hasAnyRole(user, 'accounting', 'admin')) {
        try {
          const [finRes, movRes] = await Promise.all([
            api.get(`/external-tickets/${id}/financials`),
            api.get(`/external-tickets/${id}/movements`),
          ]);
          setFinancials(finRes.data.data);
          setMovements(movRes.data.data || []);
        } catch {
          setFinancials(null);
          setMovements([]);
        }
      } else {
        setFinancials(null);
        setMovements([]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل التذكرة');
    } finally {
      setLoading(false);
    }
  }

  async function uploadAttachments() {
    if (!id) return;
    if (!uploadFiles.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const f of uploadFiles) {
        const fd = new FormData();
        fd.append('file', f);
        fd.append('label', 'مرفق');
        await api.post(`/external-tickets/${id}/attachments`, fd, {
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

  async function downloadAttachment(att: any) {
    if (!id) return;
    const res = await api.get(`/external-tickets/${id}/attachments/${att.id}/download`, {
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

  useEffect(() => { load(); }, [id]);

  async function updateStatus(newStatus: string) {
    if (!window.confirm(`هل أنت متأكد من تغيير الحالة إلى "${extTicketStatusLabel(newStatus)}"؟`)) return;
    setStatusLoading(true);
    try {
      await api.patch(`/external-tickets/${id}/status`, { status: newStatus });
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تحديث الحالة');
    } finally {
      setStatusLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <Card className="p-8 text-center">
        <div className="text-red-400 mb-4">{error}</div>
        <Button variant="secondary" onClick={() => navigate('/external-tickets')}>
          <ArrowLeft size={16} /> العودة
        </Button>
      </Card>
    );
  }

  if (!ticket) return null;

  const isOwner = Number(ticket.created_by) === Number(user?.id);
  const canRefundVoid = (canAccounting || isOwner) && !['cancelled', 'refunded', 'void'].includes(ticket.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/external-tickets')}
            className="p-2 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-400" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black bg-amber-500/10 text-amber-400">
                <ArrowLeftRight size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">تذكرة خارجية #{ticket.id}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge tone={extTicketStatusTone(ticket.status) as any}>
                    {extTicketStatusLabel(ticket.status)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {(canManage || isOwner) && ticket.status !== 'cancelled' && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
            {canManage && ticket.status !== 'cancelled' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <Pencil size={16} />
                تعديل
              </Button>
            )}
            {ticket.status === 'active' && canManage && (
              <Button
                onClick={() => updateStatus('delivered')}
                loading={statusLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 size={16} />
                تم التسليم
              </Button>
            )}
            {/* Void and Refund buttons for employees on their own tickets */}
            {canRefundVoid && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setProcessRefundOpen(true)}
                  disabled={ticket.status === 'cancelled'}
                >
                  استرجاع
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setVoidOpen(true)}
                >
                  VOID
                </Button>
              </>
            )}
            {ticket.status !== 'cancelled' && ticket.status !== 'void' && canManage && !canRefundVoid && (
              <Button
                variant="secondary"
                onClick={() => updateStatus('cancelled')}
                loading={statusLoading}
              >
                <XCircle size={16} />
                إلغاء
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-800/60 bg-red-950/30 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Passenger Info */}
        <Card>
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <User size={18} className="text-amber-400" />
            بيانات المسافر
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-slate-400 block">الاسم</span>
              <span className="text-white font-medium">{ticket.passenger_name}</span>
            </div>
            {ticket.passenger_phone && (
              <div>
                <span className="text-xs text-slate-400 block">الهاتف</span>
                <span className="text-white" dir="ltr">{ticket.passenger_phone}</span>
              </div>
            )}
            {ticket.pnr && (
              <div>
                <span className="text-xs text-slate-400 block">PNR</span>
                <span className="text-white font-mono">{ticket.pnr}</span>
              </div>
            )}
            {ticket.airline_company_name && (
              <div>
                <span className="text-xs text-slate-400 block">شركة الطيران</span>
                <span className="text-white">{ticket.airline_company_name}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Parties */}
        <Card>
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-amber-400" />
            الجهات
          </h3>
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <span className="text-xs text-red-400 block mb-1">مكتب المصدر (نشتري منه)</span>
              <Link to={`/offices/${ticket.source_office_id}`} className="text-white font-bold hover:text-red-300 transition">
                {ticket.source_office_name}
              </Link>
              <div className="text-sm text-red-400 mt-1">
                {fmtMoney(ticket.buy_amount, ticket.buy_currency_code)}
                {ticket.buy_currency_code !== 'USD' && (
                  <span className="text-xs text-slate-500 mr-2">≈ {fmtMoney(ticket.buy_usd, 'USD')}</span>
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowLeftRight size={20} className="text-slate-600" />
            </div>

            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <span className="text-xs text-green-400 block mb-1">العميل (نبيع له)</span>
              <div className="flex items-center gap-2">
                {ticket.customer_party_type === 'customer' ? (
                  <Link to={`/customers/${ticket.customer_office_id}`} className="text-white font-bold hover:text-green-300 transition">
                    {ticket.customer_office_name}
                  </Link>
                ) : ticket.customer_party_type ? (
                  <Link to={`/offices/${ticket.customer_office_id}`} className="text-white font-bold hover:text-green-300 transition">
                    {ticket.customer_office_name}
                  </Link>
                ) : (
                  <span className="text-white font-bold">{ticket.customer_office_name}</span>
                )}
                {ticket.customer_party_type === 'customer' ? (
                  <Badge tone="blue" size="sm" variant="subtle">عميل</Badge>
                ) : (
                  <Badge tone="gray" size="sm" variant="subtle">مكتب</Badge>
                )}
</div>
              <div className="text-sm text-green-400 mt-1">
                {fmtMoney(ticket.sell_amount, ticket.sell_currency_code)}
                {ticket.sell_currency_code !== 'USD' && (
                  <span className="text-xs text-slate-500 mr-2">≈ {fmtMoney(ticket.sell_usd, 'USD')}</span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Financial Summary */}
        <Card>
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-400" />
            الملخص المالي
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800/50">
              <span className="text-slate-400">سعر الشراء</span>
              <span className="text-red-400 font-bold">{fmtMoney(ticket.buy_usd, 'USD')}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800/50">
              <span className="text-slate-400">سعر البيع</span>
              <span className="text-blue-400 font-bold">{fmtMoney(ticket.sell_usd, 'USD')}</span>
            </div>
            <div className={`flex justify-between items-center p-3 rounded-xl border ${
              ticket.profit_usd >= 0
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <span className="text-white font-bold">الربح</span>
              <span className={`text-xl font-black ${ticket.profit_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmtMoney(ticket.profit_usd, 'USD')}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">تاريخ الإنشاء</span>
              <span className="text-white">{fmtDate(ticket.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">الموظف</span>
              <span className="text-white">{ticket.created_by_name}</span>
            </div>
          </div>
        </Card>
      </div>

      {canAccounting && (
        <Card>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-black">التحصيل والسداد</div>
              <div className="text-xs text-slate-400">ربط تحصيل العميل وسداد المصدر بالتذكرة</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setCollectOpen(true)}
                disabled={!financials || ticket.status === 'cancelled' || Number(financials?.remaining_sell_usd || 0) <= 0}
              >
                تحصيل
              </Button>
              <Button
                variant="secondary"
                onClick={() => setRefundOpen(true)}
                disabled={!financials || Number(financials?.collected_usd || 0) <= 0}
              >
                استرداد
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPaySourceOpen(true)}
                disabled={!financials || ticket.status === 'cancelled' || Number(financials?.remaining_buy_usd || 0) <= 0}
              >
                سداد المصدر
              </Button>
            </div>
          </div>

          {financials ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-slate-800/50">
                <div className="text-xs text-slate-400">محصّل (USD)</div>
                <div className="font-black text-slate-100">{fmtMoney(financials.collected_usd, 'USD')}</div>
                <div className="text-[11px] text-slate-500 mt-1">متبقي تحصيل: {fmtMoney(financials.remaining_sell_usd, 'USD')}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/50">
                <div className="text-xs text-slate-400">مدفوع للمصدر (USD)</div>
                <div className="font-black text-slate-100">{fmtMoney(financials.paid_to_source_usd, 'USD')}</div>
                <div className="text-[11px] text-slate-500 mt-1">متبقي سداد: {fmtMoney(financials.remaining_buy_usd, 'USD')}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/50">
                <div className="text-xs text-slate-400">استردادات (USD)</div>
                <div className="font-black text-rose-200">{fmtMoney(financials.refunded_usd, 'USD')}</div>
                <div className="text-[11px] text-slate-500 mt-1">تحصيل قبل الاسترداد: {fmtMoney(financials.collected_in_usd, 'USD')}</div>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-slate-500">—</div>
          )}

          <div className="mt-4 rounded-2xl border border-slate-800/60 overflow-hidden">
            <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between">
              <div className="text-xs text-slate-400">حركات مرتبطة بالتذكرة</div>
              <div className="text-xs text-slate-500">{movements.length} حركة</div>
            </div>
            {movements.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">لا يوجد تحصيل/سداد مرتبط بالتذكرة بعد.</div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {movements.map((m) => (
                  <div key={m.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-200 truncate">
                        {m.direction === 'in' ? '⬅' : '➡'} {m.category} — {fmtMoney(m.amount, m.currency_code)}
                        {m.currency_code !== 'USD' ? (
                          <span className="text-xs text-slate-500 mr-2">≈ {fmtMoney(m.amount_usd, 'USD')}</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-500">
                        {fmtDate(m.happened_at)} — صندوق: {m.account_name}
                        {m.receipt_no ? ` — إيصال: ${m.receipt_no}` : ''}
                        {m.party_name ? ` — طرف: ${m.party_name}` : ''}
                        {m.created_by_name ? ` — بواسطة: ${m.created_by_name}` : ''}
                      </div>
                      {m.note ? <div className="text-xs text-slate-400 mt-1">{m.note}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ExternalTicketCollectModal
            open={collectOpen}
            onClose={() => setCollectOpen(false)}
            ticketId={Number(ticket.id)}
            defaultCurrencyCode={ticket.sell_currency_code}
            onSaved={load}
          />

          {canAccounting && (
            <ExternalTicketRefundModal
              open={refundOpen}
              onClose={() => setRefundOpen(false)}
              ticketId={Number(ticket.id)}
              defaultCurrencyCode={ticket.sell_currency_code}
              onSaved={load}
            />
          )}

          <ExternalTicketSourcePaymentModal
            open={paySourceOpen}
            onClose={() => setPaySourceOpen(false)}
            ticketId={Number(ticket.id)}
            defaultCurrencyCode={ticket.buy_currency_code}
            onSaved={load}
          />
        </Card>
      )}

      {/* Attachments */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-black">المرفقات</div>
            <div className="text-xs text-slate-400">PDF / صور مرتبطة بالتذكرة</div>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-xs text-slate-400 mb-1">رفع مرفقات جديدة</div>
          <input
            className="w-full rounded-xl bg-slate-900/50 border border-slate-700/70 px-3 py-2 text-sm text-slate-100"
            type="file"
            multiple
            accept="application/pdf,image/*,.doc,.docx"
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
                  <div className="min-w-0">
                    <div className="font-bold text-slate-200 text-sm truncate">{a.original_name}</div>
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

      {/* Notes */}
      {ticket.notes && (
        <Card>
          <h3 className="font-bold text-white mb-2 flex items-center gap-2">
            <FileText size={18} className="text-slate-400" />
            ملاحظات
          </h3>
          <p className="text-slate-300 text-sm whitespace-pre-wrap">{ticket.notes}</p>
        </Card>
      )}

      {/* Process Refund Modal (for employees) */}
      {canRefundVoid && (
        <ExternalTicketProcessRefundModal
          open={processRefundOpen}
          onClose={() => setProcessRefundOpen(false)}
          ticketId={Number(ticket.id)}
          sellCurrencyCode={ticket.sell_currency_code}
          buyCurrencyCode={ticket.buy_currency_code}
          maxCustomerRefund={Number(ticket.sell_amount || 0)}
          maxSourceRefund={Number(ticket.buy_amount || 0)}
          onSaved={load}
        />
      )}

      {/* Edit Modal */}
      {canManage && (
        <EditExternalTicketModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          ticket={ticket}
          onSaved={load}
        />
      )}

      {/* Void Modal */}
      <ExternalTicketVoidModal
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        ticketId={Number(ticket.id)}
        onSaved={load}
        sellCurrencyCode={ticket.sell_currency_code || 'USD'}
        maxSellAmount={Number(ticket.sell_amount || 0)}
      />
    </div>
  );
}
