import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, Ticket, Clock, AlertTriangle, CheckCircle2, XCircle, Archive, RefreshCw, ChevronLeft, User, Calendar, DollarSign, FileBarChart } from 'lucide-react';
import { api } from '../utils/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import type { VisaRequestRow, VisaStatus } from '../utils/types';
import { fmtMoney, fmtDate, daysLeft, statusTone, statusLabel } from '../utils/format';
import { useAuth, hasAnyRole } from '../state/auth';
import { CreateVisaModal } from '../features/visa/CreateVisaModal';

const statuses: VisaStatus[] = ['submitted','processing','issued','delivered','rejected','cancelled'];

const statusIcons: Record<string, any> = {
  submitted: Clock,
  processing: RefreshCw,
  issued: CheckCircle2,
  delivered: CheckCircle2,
  rejected: XCircle,
  cancelled: XCircle,
  overdue: AlertTriangle,
};

const statusColors: Record<string, string> = {
  submitted: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  processing: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  issued: 'text-green-400 bg-green-500/10 border-green-500/20',
  delivered: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  rejected: 'text-red-400 bg-red-500/10 border-red-500/20',
  cancelled: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  overdue: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
};

export function VisaListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<VisaRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<VisaStatus | ''>('');
  const [special, setSpecial] = useState<'all' | 'due_soon' | 'overdue' | 'archived'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  function partyTypeLabel(t: VisaRequestRow['billing_party_type']) {
    if (t === 'office') return 'مكتب';
        return 'عميل';
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (q) params.q = q;
      if (status) params.status = status;
      if (special === 'due_soon') params.due_soon = 1;
      if (special === 'overdue') params.overdue = 1;
      if (special === 'archived') params.archived = 1;

      const res = await api.get('/visa-requests', { params });
      setRows(res.data.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل طلبات الفيز');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [status, special]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.visa_status] = (c[r.visa_status] || 0) + 1;
    return c;
  }, [rows]);

  const specialCounts = useMemo(() => {
    return {
      dueSoon: rows.filter((r) => r.is_due_soon === 1).length,
      overdue: rows.filter((r) => r.is_overdue === 1 || r.display_status === 'overdue').length,
      archived: rows.filter((r) => r.is_archived === 1).length,
    };
  }, [rows]);

  // Stats
  const totalRevenue = useMemo(() => rows.reduce((sum, r) => sum + (r.total_usd || 0), 0), [rows]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Ticket className="text-purple-400" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">طلبات الفيزا</h1>
              <p className="text-xs text-slate-400">إدارة كاملة: طلب ← معالجة ← تحصيل ← سداد مصدر</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              className="w-48 md:w-64 pr-10 pl-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition"
              placeholder="بحث بالاسم / الرقم"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
            />
          </div>
          <Button variant="secondary" size="md" onClick={load}>
            <Filter size={16} />
            <span className="hidden sm:inline">فلترة</span>
          </Button>
          {hasAnyRole(user, 'visa_admin', 'admin') && (
            <Button variant="secondary" onClick={() => navigate('/reports/visa-daily')}>
              <FileBarChart size={16} />
              <span className="hidden sm:inline">تقرير الفيزا</span>
            </Button>
          )}
          {hasAnyRole(user, 'employee', 'admin') && (
            <Button variant="gradient" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              <span className="hidden sm:inline">طلب جديد</span>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Clock size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">بانتظار المعالجة</p>
            <p className="text-lg font-bold text-white">{counts.submitted || 0}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <RefreshCw size={18} className="text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">قيد المعالجة</p>
            <p className="text-lg font-bold text-white">{counts.processing || 0}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <AlertTriangle size={18} className="text-orange-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">متأخرة</p>
            <p className="text-lg font-bold text-white">{specialCounts.overdue}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <DollarSign size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">إجمالي المبيعات</p>
            <p className="text-lg font-bold text-white">${totalRevenue.toLocaleString('en-US')}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-xl">
          <button
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${special === 'overdue' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:text-white'}`}
            onClick={() => { setSpecial('overdue'); setStatus(''); }}
          >
            <AlertTriangle size={14} className="inline ml-1" />
            متأخرة ({specialCounts.overdue})
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${special === 'due_soon' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400 hover:text-white'}`}
            onClick={() => { setSpecial('due_soon'); setStatus(''); }}
          >
            <Clock size={14} className="inline ml-1" />
            قرب الموعد ({specialCounts.dueSoon})
          </button>
          {hasAnyRole(user, 'visa_admin', 'visa_admin_2', 'admin') && (
            <button
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${special === 'archived' ? 'bg-slate-500/20 text-slate-300' : 'text-slate-400 hover:text-white'}`}
              onClick={() => { setSpecial('archived'); setStatus(''); }}
            >
              <Archive size={14} className="inline ml-1" />
              مؤرشفة ({specialCounts.archived})
            </button>
          )}
        </div>

        <div className="h-6 w-px bg-slate-700/50 hidden sm:block" />

        <div className="flex flex-wrap gap-1.5">
          <button
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${status === '' && special === 'all' ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : 'border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-white'}`}
            onClick={() => { setStatus(''); setSpecial('all'); }}
          >
            الكل ({rows.length})
          </button>
          {statuses.map((s) => {
            const Icon = statusIcons[s];
            return (
              <button
                key={s}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1 ${status === s ? statusColors[s] + ' border' : 'border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-white'}`}
                onClick={() => { setStatus(s); setSpecial('all'); }}
              >
                {Icon && <Icon size={12} />}
                {statusLabel(s)} ({counts[s] || 0})
              </button>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 flex items-center gap-3 animate-fade-in">
          <XCircle size={18} />
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="glass-card rounded-xl p-4 space-y-3">
              <div className="skeleton h-6 w-24" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
              <div className="flex gap-2">
                <div className="skeleton h-8 w-20" />
                <div className="skeleton h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
            <Ticket size={32} className="text-slate-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">لا توجد طلبات</h3>
          <p className="text-sm text-slate-400 mb-4">ابدأ بإضافة طلب فيزا جديد</p>
          {hasAnyRole(user, 'employee', 'admin') && (
            <Button variant="gradient" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              طلب جديد
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r, index) => {
            const left = typeof r.days_left === 'number' ? r.days_left : daysLeft(r.expected_delivery_date);
            const disp = (r.display_status || r.visa_status) as any;
            const isDueSoon = (r.is_due_soon === 1) || (left > 0 && left <= Number(r.alert_days || 5));
            const isOver = (r.is_overdue === 1) || disp === 'overdue' || left <= 0;
            const Icon = statusIcons[disp] || Clock;

            return (
              <div
                key={r.visa_request_id}
                onClick={() => navigate(`/visa/${r.visa_request_id}`)}
                className={`
                  glass-card rounded-xl p-4 cursor-pointer transition-all duration-300 
                  hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 hover:-translate-y-1
                  animate-fade-in opacity-0 group
                  ${isOver ? 'border-red-500/30 bg-red-500/5' : isDueSoon ? 'border-orange-500/30 bg-orange-500/5' : ''}
                `}
                style={{ animationDelay: `${0.25 + index * 0.05}s` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[disp]}`}>
                    <Icon size={12} />
                    {statusLabel(disp)}
                  </div>
                  <span className="text-xs text-slate-500">#{r.visa_request_id}</span>
                </div>

                {/* Customer Info */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-purple-400 font-bold">
                    {r.applicant_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate group-hover:text-purple-300 transition">{r.applicant_name}</p>
                    <p className="text-xs text-slate-400">{r.applicant_phone}</p>
                  </div>
                </div>

                {/* Visa Type */}
                <div className="flex items-center gap-2 mb-3 text-sm">
                  <Ticket size={14} className="text-slate-500" />
                  <span className="text-slate-300">{r.visa_type_name}</span>
                </div>

                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar size={12} />
                    <span>{fmtDate(r.submission_date)}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${isOver ? 'text-red-400' : isDueSoon ? 'text-orange-400' : 'text-slate-400'}`}>
                    <Clock size={12} />
                    <span>{isOver ? 'متأخر' : `باقي ${left} يوم`}</span>
                  </div>
                </div>

                {/* Creator */}
                {r.created_by_name && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                    <User size={11} />
                    <span>أنشأه: <span className="text-slate-400">{r.created_by_name}</span></span>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/30">
                  <div>
                    <p className="text-lg font-black text-white">{fmtMoney(r.total_amount, r.currency_code)}</p>
                    <p className="text-xs text-slate-500">≈ {fmtMoney(r.total_usd, 'USD')}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-400">{r.billing_party_name}</p>
                    <p className="text-[10px] text-slate-500">{partyTypeLabel(r.billing_party_type)}</p>
                  </div>
                </div>

                {/* Archived Badge */}
                {r.is_archived === 1 && (
                  <div className="absolute top-2 left-2">
                    <Badge tone="gray">مؤرشفة</Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateVisaModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => navigate(`/visa/${id}`)}
      />
    </div>
  );
}
