import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Phone, Plus, RefreshCw, Search, UserPlus, Clock, CheckCircle2,
  XCircle, TrendingUp, Users, MessageCircle, Eye, HandMetal, ArrowUpRight
} from 'lucide-react';
import { api } from '../utils/api';
import { fmtDate, leadStatusTone, leadStatusLabel, leadServiceLabel, timeAgo } from '../utils/format';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useAuth, hasAnyRole } from '../state/auth';

// ─── Register Visit Modal ───
function RegisterVisitModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('visa');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() { setName(''); setPhone(''); setService('visa'); setNotes(''); setError(null); }

  async function handleSubmit() {
    if (!name.trim()) return setError('اسم العميل مطلوب');
    setSaving(true);
    setError(null);
    try {
      await api.post('/leads', {
        customer_name: name.trim(),
        customer_phone: phone.trim() || null,
        service_interest: service,
        notes: notes.trim() || null,
      });
      reset();
      onCreated();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تسجيل الزيارة');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="تسجيل زيارة عميل جديد" width="max-w-lg">
      <div className="space-y-4">
        {error && <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}

        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-3">
          <h4 className="text-xs font-bold text-amber-400">بيانات العميل</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">اسم العميل *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">رقم الهاتف</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="05..." />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">الخدمة المهتم بها *</label>
            <Select value={service} onChange={(e) => setService(e.target.value)}>
              <option value="visa">فيزا</option>
              <option value="passport">جوازات</option>
              <option value="ticket">تذاكر طيران</option>
              <option value="external_ticket">تذاكر خارجية</option>
              <option value="other">أخرى</option>
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">ملاحظة سريعة</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none text-sm"
              placeholder="مثال: يسأل عن فيزا شنغن..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
          <Button variant="secondary" onClick={() => { reset(); onClose(); }}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={saving}>
            <UserPlus size={16} />
            تسجيل الزيارة
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Service color/icon helpers ───
function serviceColor(s: string) {
  switch (s) {
    case 'visa': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    case 'passport': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    case 'ticket': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'external_ticket': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  }
}

// ─── Main Page ───
export function LeadsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = hasAnyRole(user, 'admin', 'accounting');

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(searchParams.get('tab') || 'open');
  const [createOpen, setCreateOpen] = useState(searchParams.get('new') === '1');
  const [claimingId, setClaimingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
      if (tab === 'open') params.status = 'open';
      else if (tab === 'mine') params.mine = '1';
      else if (tab === 'active') params.status = 'active';
      else if (tab === 'done') params.status = 'done';
      // 'all' = no filter

      const res = await api.get('/leads', { params });
      setRows(res.data.data.rows || []);
      setStats(res.data.data.stats || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.customer_name?.toLowerCase().includes(q) ||
      r.customer_phone?.toLowerCase().includes(q) ||
      r.claimed_by_name?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  async function handleClaim(id: number) {
    setClaimingId(id);
    try {
      await api.patch(`/leads/${id}/claim`);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل استلام العميل');
    } finally {
      setClaimingId(null);
    }
  }

  const tabs = [
    { key: 'open', label: 'بانتظار المتابعة', count: stats.open, icon: Clock, color: 'amber' },
    { key: 'mine', label: 'عملائي', count: null, icon: HandMetal, color: 'blue' },
    { key: 'active', label: 'قيد المتابعة', count: (stats.claimed || 0) + (stats.contacted || 0) + (stats.interested || 0), icon: MessageCircle, color: 'purple' },
    { key: 'done', label: 'مكتملة', count: (stats.converted || 0) + (stats.not_interested || 0) + (stats.closed || 0), icon: CheckCircle2, color: 'green' },
    ...(isAdmin ? [{ key: 'all', label: 'الكل', count: stats.total, icon: Eye, color: 'slate' }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
              <Phone className="text-green-400" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">متابعة العملاء</h1>
              <p className="text-xs text-slate-400">تسجيل الزيارات واستلام المتابعات</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
          {isAdmin && (
            <Button variant="secondary" size="sm" onClick={() => navigate('/leads/reports')}>
              <TrendingUp size={16} />
              التقارير
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            تسجيل زيارة
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">بانتظار</span>
            <Clock size={14} className="text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-400">{stats.open || 0}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">قيد المتابعة</span>
            <MessageCircle size={14} className="text-blue-400" />
          </div>
          <p className="text-xl font-black text-blue-400">{(stats.claimed || 0) + (stats.contacted || 0)}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">مهتمين</span>
            <Users size={14} className="text-green-400" />
          </div>
          <p className="text-xl font-black text-green-400">{stats.interested || 0}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">تم التحويل</span>
            <CheckCircle2 size={14} className="text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400">{stats.converted || 0}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">الإجمالي</span>
            <Phone size={14} className="text-slate-400" />
          </div>
          <p className="text-xl font-black text-white">{stats.total || 0}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition flex items-center gap-2 ${
                tab === t.key
                  ? `bg-${t.color}-500/20 border-${t.color}-500/30 text-white`
                  : 'border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-white'
              }`}
              onClick={() => setTab(t.key)}
            >
              <Icon size={14} />
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className="bg-slate-700 text-xs px-1.5 py-0.5 rounded-full">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </Card>

      {/* Leads List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse"><div className="h-16 bg-slate-800 rounded-xl" /></Card>
          ))
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Phone size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400">
              {tab === 'open' ? 'لا يوجد عملاء بانتظار المتابعة' : 'لا توجد نتائج'}
            </p>
          </Card>
        ) : (
          filtered.map((lead) => (
            <Card
              key={lead.id}
              className={`p-4 hover:bg-slate-800/30 transition cursor-pointer ${
                lead.status === 'open' ? 'border-r-4 border-r-amber-500' : ''
              }`}
              onClick={() => {
                if (lead.status === 'open') return; // click disabled for open, use claim button
                navigate(`/leads/${lead.id}`);
              }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Left: Info */}
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black border ${serviceColor(lead.service_interest)}`}>
                    {lead.customer_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">{lead.customer_name}</span>
                      <Badge tone={leadStatusTone(lead.status) as any}>{leadStatusLabel(lead.status)}</Badge>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${serviceColor(lead.service_interest)}`}>
                        {leadServiceLabel(lead.service_interest)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                      {lead.customer_phone && (
                        <span dir="ltr">{lead.customer_phone}</span>
                      )}
                      <span>{timeAgo(lead.created_at)}</span>
                      <span>سجّله: {lead.created_by_name}</span>
                      {lead.claimed_by_name && (
                        <span className="text-blue-400">يتابعه: {lead.claimed_by_name}</span>
                      )}
                      {lead.follow_up_count > 0 && (
                        <span className="text-purple-400">{lead.follow_up_count} متابعة</span>
                      )}
                      {lead.last_result && (
                        <span className={`${lead.last_result === 'interested' ? 'text-green-400' : lead.last_result === 'no_answer' ? 'text-red-400' : 'text-slate-300'}`}>
                          آخر نتيجة: {lead.last_result === 'contacted' ? 'تم التواصل' : lead.last_result === 'no_answer' ? 'لا رد' : lead.last_result === 'interested' ? 'مهتم' : lead.last_result === 'not_interested' ? 'غير مهتم' : lead.last_result}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {lead.status === 'open' && (
                    <Button
                      size="sm"
                      onClick={() => handleClaim(lead.id)}
                      loading={claimingId === lead.id}
                      className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                    >
                      <HandMetal size={14} />
                      استلام متابعة
                    </Button>
                  )}
                  {lead.status !== 'open' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      <ArrowUpRight size={14} />
                      التفاصيل
                    </Button>
                  )}
                  {lead.customer_phone && (
                    <a
                      href={`https://wa.me/${lead.customer_phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition"
                      title="واتساب"
                    >
                      <MessageCircle size={16} />
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <RegisterVisitModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          load();
        }}
      />
    </div>
  );
}
