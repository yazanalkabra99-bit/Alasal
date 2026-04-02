import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Briefcase, FileText, Paperclip, RefreshCw, CreditCard, RotateCcw, Pencil } from 'lucide-react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { fmtMoney, fmtDate } from '../utils/format';
import { useAuth, hasAnyRole } from '../state/auth';
import { PaymentModal } from '../features/visa/PaymentModal';
import { TransactionRefundModal } from '../features/flightTickets/TransactionRefundModal';
import { EditServiceSaleModal } from '../features/serviceSales/EditServiceSaleModal';

type PaymentRow = {
  id: number;
  account_id: number;
  account_name?: string;
  amount: number;
  currency_code: string;
  amount_usd: number;
  paid_at: string;
  receipt_no?: string | null;
  note?: string | null;
  created_by_name?: string | null;
};

type RefundRow = {
  id: number;
  account_id: number;
  account_name?: string;
  amount: number;
  currency_code: string;
  amount_usd: number;
  happened_at: string;
  note?: string | null;
  created_by_name?: string | null;
};

type TxSummary = {
  tx: { id: number; total_usd: number } | null;
  paid_usd: number;
  refunded_usd: number;
  remaining_usd: number;
} | null;

export function ServiceSaleDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageMoney = hasAnyRole(user, 'accounting', 'admin');

  const [loading, setLoading] = useState(false);
  const [sale, setSale] = useState<any>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [summary, setSummary] = useState<TxSummary>(null);

  const [error, setError] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/service-sales/${id}`);
      const payload = res.data?.data;
      // Backward-compatible: older shape was {data: sale}
      const s = payload?.sale || payload;
      setSale(s || null);
      setPayments(Array.isArray(payload?.payments) ? payload.payments : []);
      setRefunds(Array.isArray(payload?.refunds) ? payload.refunds : []);
      setSummary(payload?.summary || null);

      const attRes = await api.get(`/service-sales/${id}/attachments`).catch(() => ({ data: { data: [] } }));
      setAttachments(attRes.data?.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تحميل العملية');
      setSale(null);
      setPayments([]);
      setRefunds([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const remainingUsd = useMemo(() => Math.max(0, Number(summary?.remaining_usd || 0)), [summary]);

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
        await api.post(`/service-sales/${id}/attachments`, fd, {
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
    const res = await api.get(`/service-sales/${id}/attachments/${att.id}/download`, {
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

  if (!id) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowRight size={16} />
          رجوع
        </Button>
        <Card className="p-4">
          <div className="text-red-200">معرّف العملية غير صحيح.</div>
        </Card>
      </div>
    );
  }

  if (!sale && loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  // Prevent white page: if sale is still null for any reason, show a safe fallback UI.
  if (!sale && !loading) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowRight size={16} />
          رجوع
        </Button>
        <Card className="p-4">
          <div className="text-slate-300">{error || 'لم يتم تحميل تفاصيل العملية.'}</div>
          <div className="mt-3">
            <Button variant="secondary" onClick={load} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              إعادة المحاولة
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(() => {
        const canEdit =
          hasAnyRole(user, 'admin', 'accounting', 'airline_admin') ||
          (sale && Number(user?.id) === Number(sale.created_by));
        return (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
                <ArrowRight size={16} />
                رجوع
              </Button>
              <div className="flex items-center gap-2">
                <Briefcase className="text-emerald-400" size={20} />
                <div>
                  <div className="text-sm font-black text-white">بيع خدمة #{sale?.id}</div>
                  <div className="text-xs text-slate-400">{sale?.created_at ? fmtDate(sale.created_at) : '—'}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <Button size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil size={15} />
                  تعديل
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>
        );
      })()}

      {error && (
        <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Main details */}
      <Card className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-2">
            <div className="text-lg font-black text-white">{sale.customer_name}</div>
            <div className="text-sm text-slate-300">
              الخدمة: <span className="font-bold">{sale.service_name}</span>
            </div>
            <div className="text-xs text-slate-500" dir="ltr">{sale.customer_phone || '—'}</div>
            {sale.source_name && (
              <div className="text-sm text-slate-300">
                المصدر: <span className="font-bold text-amber-400">{sale.source_name}</span>
              </div>
            )}
            <div className="text-xs text-slate-500">الموظف: {sale.created_by_name}</div>
          </div>
          <div className="space-y-2">
            <div className="rounded-2xl border border-slate-800/60 p-3 bg-slate-900/30">
              <div className="text-xs text-slate-400 mb-1">قيمة الخدمة</div>
              <div className="text-sm font-bold text-white">{fmtMoney(sale.cost_amount, sale.cost_currency_code)}</div>
              <div className="text-[11px] text-slate-500">≈ ${Math.round(Number(sale.cost_usd || 0)).toLocaleString('en-US')}</div>
            </div>
            <div className="rounded-2xl border border-slate-800/60 p-3 bg-slate-900/30">
              <div className="text-xs text-slate-400 mb-1">سعر البيع</div>
              <div className="text-sm font-bold text-white">{fmtMoney(sale.sell_amount, sale.sell_currency_code)}</div>
              <div className="text-[11px] text-slate-500">≈ ${Math.round(Number(sale.sell_usd || 0)).toLocaleString('en-US')}</div>
            </div>
            <div className="rounded-2xl border border-slate-800/60 p-3 bg-slate-900/30">
              <div className="text-xs text-slate-400 mb-1">الربح (USD)</div>
              <div className={`text-lg font-black ${Number(sale.profit_usd) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${Math.round(Number(sale.profit_usd || 0)).toLocaleString('en-US')}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Collection / Refund (Accounting/Admin) */}
      {canManageMoney && sale?.transaction_id ? (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black flex items-center gap-2">
                <CreditCard size={18} className="text-slate-400" />
                التحصيل
              </div>
              <div className="text-xs text-slate-400">تحصيل دفعات للعميل + استرداد (مرتبط بالعملية)</div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setPayOpen(true)} disabled={remainingUsd <= 0}>
                تحصيل
              </Button>
              <Button variant="secondary" onClick={() => setRefundOpen(true)} disabled={(summary?.paid_usd || 0) <= 0}>
                <RotateCcw size={16} />
                استرداد
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-800/60 p-3 bg-slate-900/30">
              <div className="text-xs text-slate-400">الإجمالي (USD)</div>
              <div className="text-sm font-black text-white">${Math.round(Number(summary?.tx?.total_usd || 0)).toLocaleString('en-US')}</div>
            </div>
            <div className="rounded-2xl border border-slate-800/60 p-3 bg-slate-900/30">
              <div className="text-xs text-slate-400">المحصّل (USD)</div>
              <div className="text-sm font-black text-green-400">${Math.round(Number(summary?.paid_usd || 0)).toLocaleString('en-US')}</div>
            </div>
            <div className="rounded-2xl border border-slate-800/60 p-3 bg-slate-900/30">
              <div className="text-xs text-slate-400">المسترد (USD)</div>
              <div className="text-sm font-black text-amber-300">${Math.round(Number(summary?.refunded_usd || 0)).toLocaleString('en-US')}</div>
            </div>
            <div className="rounded-2xl border border-slate-800/60 p-3 bg-slate-900/30">
              <div className="text-xs text-slate-400">المتبقي (USD)</div>
              <div className="text-sm font-black text-white">${Math.round(remainingUsd).toLocaleString('en-US')}</div>
            </div>
          </div>

          {/* Payments list */}
          <div className="mt-5 rounded-2xl border border-slate-800/60 overflow-hidden">
            <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between">
              <div className="text-xs text-slate-400">دفعات التحصيل</div>
              <div className="text-xs text-slate-500">{payments.length} دفعة</div>
            </div>
            {payments.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">لا يوجد تحصيلات بعد.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900/50 text-slate-300">
                    <tr>
                      <th className="text-right px-4 py-3 font-bold">التاريخ</th>
                      <th className="text-right px-4 py-3 font-bold">الحساب</th>
                      <th className="text-right px-4 py-3 font-bold">المبلغ</th>
                      <th className="text-right px-4 py-3 font-bold">الإيصال</th>
                      <th className="text-right px-4 py-3 font-bold">المستخدم</th>
                      <th className="text-right px-4 py-3 font-bold">ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-slate-500">{p.paid_at ? fmtDate(p.paid_at) : '—'}</td>
                        <td className="px-4 py-3 text-slate-300">{p.account_name || p.account_id}</td>
                        <td className="px-4 py-3 text-slate-200 font-bold">{fmtMoney(p.amount, p.currency_code)}</td>
                        <td className="px-4 py-3 text-slate-400">{p.receipt_no || '—'}</td>
                        <td className="px-4 py-3 text-slate-400">{p.created_by_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{p.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Refunds list */}
          <div className="mt-4 rounded-2xl border border-slate-800/60 overflow-hidden">
            <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between">
              <div className="text-xs text-slate-400">استردادات للعميل</div>
              <div className="text-xs text-slate-500">{refunds.length} حركة</div>
            </div>
            {refunds.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">لا يوجد استردادات بعد.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900/50 text-slate-300">
                    <tr>
                      <th className="text-right px-4 py-3 font-bold">التاريخ</th>
                      <th className="text-right px-4 py-3 font-bold">الحساب</th>
                      <th className="text-right px-4 py-3 font-bold">المبلغ</th>
                      <th className="text-right px-4 py-3 font-bold">المستخدم</th>
                      <th className="text-right px-4 py-3 font-bold">ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {refunds.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-slate-500">{r.happened_at ? fmtDate(r.happened_at) : '—'}</td>
                        <td className="px-4 py-3 text-slate-300">{r.account_name || r.account_id}</td>
                        <td className="px-4 py-3 text-amber-300 font-bold">{fmtMoney(r.amount, r.currency_code)}</td>
                        <td className="px-4 py-3 text-slate-400">{r.created_by_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{r.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {/* Attachments */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-black flex items-center gap-2">
              <Paperclip size={18} className="text-slate-400" />
              المرفقات
            </div>
            <div className="text-xs text-slate-400">PDF / صور / مستندات مرتبطة بالعملية</div>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-xs text-slate-400 mb-1">رفع مرفقات جديدة</div>
          <input
            className="w-full rounded-xl bg-slate-900/50 border border-slate-700/70 px-3 py-2 text-sm text-slate-100"
            type="file"
            multiple
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
      {sale.notes && (
        <Card className="p-4">
          <h3 className="font-bold text-white mb-2 flex items-center gap-2">
            <FileText size={18} className="text-slate-400" />
            ملاحظات
          </h3>
          <p className="text-slate-300 text-sm whitespace-pre-wrap">{sale.notes}</p>
        </Card>
      )}

      {/* Modals */}
      {canManageMoney && sale?.transaction_id ? (
        <>
          <PaymentModal
            open={payOpen}
            onClose={() => setPayOpen(false)}
            transactionId={Number(sale.transaction_id)}
            defaultCurrencyCode={sale.sell_currency_code}
            onSaved={() => load()}
          />
          <TransactionRefundModal
            open={refundOpen}
            onClose={() => setRefundOpen(false)}
            transactionId={Number(sale.transaction_id)}
            onSaved={() => load()}
          />
        </>
      ) : null}

      <EditServiceSaleModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => load()}
        sale={sale}
      />
    </div>
  );
}
