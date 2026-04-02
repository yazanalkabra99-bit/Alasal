import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Phone, RefreshCw, User, MessageCircle, Clock, CheckCircle2,
  XCircle, TrendingUp, HandMetal, Send, PhoneCall, UserCheck, UserX,
  PhoneOff, ArrowUpRight, Edit3, Unlock
} from 'lucide-react';
import { api } from '../utils/api';
import {
  fmtDate, leadStatusTone, leadStatusLabel, leadServiceLabel,
  leadResultLabel, leadMethodLabel, timeAgo
} from '../utils/format';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth, hasAnyRole } from '../state/auth';

// ─── Follow-Up Modal ───
function FollowUpModal({ open, onClose, leadId, onDone }: { open: boolean; onClose: () => void; leadId: number; onDone: () => void }) {
  const [method, setMethod] = useState('whatsapp');
  const [result, setResult] = useState('contacted');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() { setMethod('whatsapp'); setResult('contacted'); setNotes(''); setError(null); }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/leads/${leadId}/follow-up`, {
        method, result,
        notes: notes.trim() || null,
      });
      reset();
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تسجيل المتابعة');
    } finally {
      setSaving(false);
    }
  }

  const resultOptions = [
    { value: 'contacted', label: '✅ تم التواصل', color: 'text-green-400' },
    { value: 'no_answer', label: '📵 لا رد', color: 'text-red-400' },
    { value: 'interested', label: '🌟 مهتم', color: 'text-emerald-400' },
    { value: 'not_interested', label: '❌ غير مهتم', color: 'text-red-400' },
    { value: 'callback', label: '📞 اتصال لاحقاً', color: 'text-amber-400' },
  ];

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="تسجيل نتيجة المتابعة" width="max-w-md">
      <div className="space-y-4">
        {error && <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}

        <div>
          <label className="text-xs text-slate-400 mb-1 block">طريقة التواصل</label>
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="whatsapp">واتساب</option>
            <option value="phone">هاتف</option>
            <option value="in_person">شخصياً</option>
            <option value="other">أخرى</option>
          </Select>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-2 block">النتيجة</label>
          <div className="grid grid-cols-1 gap-2">
            {resultOptions.map(opt => (
              <button
                key={opt.value}
                className={`p-3 rounded-xl border text-sm text-right transition ${
                  result === opt.value
                    ? 'bg-slate-700/50 border-amber-500/50 text-white'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
                onClick={() => setResult(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">ملاحظات</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none text-sm"
            placeholder="ملاحظات عن المحادثة..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
          <Button variant="secondary" onClick={() => { reset(); onClose(); }}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={saving}>
            <Send size={16} />
            تسجيل المتابعة
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Result icon ───
function resultIcon(r: string) {
  switch (r) {
    case 'contacted': return <CheckCircle2 size={14} className="text-green-400" />;
    case 'no_answer': return <PhoneOff size={14} className="text-red-400" />;
    case 'interested': return <TrendingUp size={14} className="text-emerald-400" />;
    case 'not_interested': return <XCircle size={14} className="text-red-400" />;
    case 'callback': return <PhoneCall size={14} className="text-amber-400" />;
    default: return <Phone size={14} className="text-slate-400" />;
  }
}

// ─── Main Page ───
export function LeadDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = hasAnyRole(user, 'admin', 'accounting');
  const isOwner = (lead: any) => lead?.claimed_by === user?.id;
  const isCreator = (lead: any) => lead?.created_by === user?.id;

  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/leads/${id}`);
      setLead(res.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleClaim() {
    setActionLoading(true);
    try {
      await api.patch(`/leads/${id}/claim`);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل استلام العميل');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRelease() {
    if (!window.confirm('هل أنت متأكد من إعادة العميل لقائمة الانتظار؟')) return;
    setActionLoading(true);
    try {
      await api.patch(`/leads/${id}/release`);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClose(status: string) {
    const label = status === 'not_interested' ? 'غير مهتم' : 'مغلق';
    if (!window.confirm(`هل أنت متأكد من تغيير الحالة إلى "${label}"؟`)) return;
    setActionLoading(true);
    try {
      await api.patch(`/leads/${id}/close`, { status });
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConvert() {
    if (!window.confirm('هل تم تحويل هذا العميل لعملية بيع فعلية؟')) return;
    setActionLoading(true);
    try {
      await api.patch(`/leads/${id}/convert`, {});
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error && !lead) {
    return (
      <Card className="p-8 text-center">
        <div className="text-red-400 mb-4">{error}</div>
        <Button variant="secondary" onClick={() => navigate('/customers?tab=followup')}>
          <ArrowLeft size={16} /> العودة
        </Button>
      </Card>
    );
  }

  if (!lead) return null;

  const canFollowUp = isOwner(lead) && !['converted', 'not_interested', 'closed'].includes(lead.status);
  const canClaim = lead.status === 'open';
  const canRelease = (isOwner(lead) || isAdmin) && ['claimed', 'contacted'].includes(lead.status);
  const canConvert = (isOwner(lead) || isAdmin) && !['converted', 'closed'].includes(lead.status) && lead.status !== 'open';
  const canClose = (isOwner(lead) || isAdmin) && !['converted', 'closed'].includes(lead.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/customers?tab=followup')}
            className="p-2 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-400" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black bg-green-500/10 text-green-400 border border-green-500/20">
                {lead.customer_name?.[0]}
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">{lead.customer_name}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge tone={leadStatusTone(lead.status) as any}>{leadStatusLabel(lead.status)}</Badge>
                  <span className="text-xs text-slate-400">{leadServiceLabel(lead.service_interest)}</span>
                  <span className="text-xs text-slate-500">{timeAgo(lead.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw size={16} />
          </Button>

          {canClaim && (
            <Button onClick={handleClaim} loading={actionLoading} className="bg-green-600 hover:bg-green-700">
              <HandMetal size={16} />
              استلام المتابعة
            </Button>
          )}

          {canFollowUp && (
            <Button onClick={() => setFollowUpOpen(true)}>
              <Send size={16} />
              تسجيل متابعة
            </Button>
          )}

          {canConvert && (
            <Button onClick={handleConvert} loading={actionLoading} className="bg-emerald-600 hover:bg-emerald-700">
              <TrendingUp size={16} />
              تحويل لبيع
            </Button>
          )}

          {canRelease && (
            <Button variant="secondary" size="sm" onClick={handleRelease} loading={actionLoading}>
              <Unlock size={16} />
              تحرير
            </Button>
          )}

          {canClose && (
            <Button variant="secondary" size="sm" onClick={() => handleClose('closed')} loading={actionLoading}>
              <XCircle size={16} />
              إغلاق
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customer Info */}
        <Card>
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <User size={18} className="text-green-400" />
            بيانات العميل
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-slate-400 block">الاسم</span>
              <span className="text-white font-medium">{lead.customer_name}</span>
            </div>
            {lead.customer_phone && (
              <div>
                <span className="text-xs text-slate-400 block">الهاتف</span>
                <div className="flex items-center gap-2">
                  <span className="text-white" dir="ltr">{lead.customer_phone}</span>
                  <a
                    href={`https://wa.me/${lead.customer_phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition"
                    title="واتساب"
                  >
                    <MessageCircle size={14} />
                  </a>
                  <a
                    href={`tel:${lead.customer_phone}`}
                    className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition"
                    title="اتصال"
                  >
                    <PhoneCall size={14} />
                  </a>
                </div>
              </div>
            )}
            <div>
              <span className="text-xs text-slate-400 block">الخدمة المهتم بها</span>
              <span className="text-white">{leadServiceLabel(lead.service_interest)}</span>
            </div>
            {lead.notes && (
              <div>
                <span className="text-xs text-slate-400 block">ملاحظات</span>
                <span className="text-slate-300 text-sm whitespace-pre-wrap">{lead.notes}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Tracking Info */}
        <Card>
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Clock size={18} className="text-amber-400" />
            معلومات التتبع
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800/50">
              <span className="text-slate-400 text-sm">سجّل الزيارة</span>
              <span className="text-white text-sm font-medium">{lead.created_by_name}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800/50">
              <span className="text-slate-400 text-sm">تاريخ الزيارة</span>
              <span className="text-white text-sm">{fmtDate(lead.created_at)}</span>
            </div>
            {lead.claimed_by_name && (
              <div className="flex justify-between items-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-blue-400 text-sm">يتابعه</span>
                <span className="text-white text-sm font-bold">{lead.claimed_by_name}</span>
              </div>
            )}
            {lead.claimed_at && (
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800/50">
                <span className="text-slate-400 text-sm">تاريخ الاستلام</span>
                <span className="text-white text-sm">{fmtDate(lead.claimed_at)}</span>
              </div>
            )}
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800/50">
              <span className="text-slate-400 text-sm">عدد المتابعات</span>
              <span className="text-white text-sm font-bold">{lead.follow_ups?.length || 0}</span>
            </div>
            {lead.converted_to_type && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-emerald-400 text-xs block">تم التحويل لبيع</span>
                <span className="text-white font-medium text-sm">
                  {leadServiceLabel(lead.converted_to_type)}
                  {lead.converted_to_id && ` #${lead.converted_to_id}`}
                </span>
              </div>
            )}

            {/* Followers History — who followed first / second */}
            {lead.followers && lead.followers.length > 0 && (
              <div className="pt-2 border-t border-slate-700/40">
                <span className="text-xs text-slate-500 block mb-2">سجل المتابعين</span>
                {lead.followers.map((f: any, idx: number) => (
                  <div key={f.user_id} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30 mb-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                      <span className="text-white font-medium">{f.user_name}</span>
                    </div>
                    <span className="text-slate-400">{f.attempts} محاولة</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card>
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <ArrowUpRight size={18} className="text-purple-400" />
            إجراءات سريعة
          </h3>
          <div className="space-y-2">
            {lead.customer_phone && (
              <>
                <a
                  href={`https://wa.me/${lead.customer_phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition text-sm"
                >
                  <MessageCircle size={18} />
                  <span className="font-medium">فتح واتساب</span>
                </a>
                <a
                  href={`tel:${lead.customer_phone}`}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition text-sm"
                >
                  <PhoneCall size={18} />
                  <span className="font-medium">اتصال هاتفي</span>
                </a>
              </>
            )}
            {canFollowUp && (
              <button
                onClick={() => setFollowUpOpen(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition text-sm"
              >
                <Send size={18} />
                <span className="font-medium">تسجيل نتيجة المتابعة</span>
              </button>
            )}
            {canConvert && (
              <button
                onClick={handleConvert}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition text-sm"
              >
                <TrendingUp size={18} />
                <span className="font-medium">تحويل لعملية بيع</span>
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* Follow-up Timeline */}
      <Card>
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <MessageCircle size={18} className="text-purple-400" />
          سجل المتابعات ({lead.follow_ups?.length || 0})
        </h3>

        {!lead.follow_ups || lead.follow_ups.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <MessageCircle size={32} className="mx-auto mb-2 text-slate-600" />
            <p className="text-sm">لا توجد متابعات بعد</p>
          </div>
        ) : (
          <div className="space-y-0">
            {lead.follow_ups.map((f: any, idx: number) => (
              <div
                key={f.id}
                className="flex gap-3 relative"
              >
                {/* Timeline line */}
                {idx < lead.follow_ups.length - 1 && (
                  <div className="absolute right-[19px] top-[32px] bottom-0 w-[2px] bg-slate-700/50" />
                )}
                {/* Timeline dot */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 border border-slate-700 shrink-0 z-10">
                  {resultIcon(f.result)}
                </div>
                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-bold">{f.user_name}</span>
                        <Badge
                          tone={
                           (f.result === 'interested' ? 'green' :
                            f.result === 'not_interested' ? 'red' :
                            f.result === 'no_answer' ? 'amber' : 'blue') as any
                              }
                          >
                          {leadResultLabel(f.result)}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-500">{timeAgo(f.created_at)}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      عبر: {leadMethodLabel(f.method)} • {fmtDate(f.created_at)}
                    </div>
                    {f.notes && (
                      <p className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">{f.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <FollowUpModal
        open={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        leadId={Number(id)}
        onDone={() => {
          setFollowUpOpen(false);
          load();
        }}
      />
    </div>
  );
}
