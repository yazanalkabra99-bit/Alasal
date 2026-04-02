import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, Plane, Clock, CheckCircle2, XCircle, RefreshCw, Archive, DollarSign, TrendingUp, Users, User, Calendar, CreditCard, AlertTriangle } from 'lucide-react';
import { api } from '../utils/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { FlightTicketRow, FlightTicketStatus } from '../utils/types';
import { fmtMoney, fmtDate, flightTicketStatusTone, flightTicketStatusLabel } from '../utils/format';
import { useAuth, hasAnyRole } from '../state/auth';
import { CreateFlightTicketModal } from '../features/flightTickets/CreateFlightTicketModal';

const statuses: FlightTicketStatus[] = ['pending','sold', 'issued', 'cancelled', 'refunded', 'void'];

const statusIcons: Record<string, any> = {
  pending: Clock,
  sold: CheckCircle2,
  issued: CheckCircle2,
  cancelled: XCircle,
  refunded: RefreshCw,
  void: XCircle,
};

const statusColors: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  sold: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  issued: 'text-green-400 bg-green-500/10 border-green-500/20',
  cancelled: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  refunded: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  void: 'text-red-400 bg-red-500/10 border-red-500/20',
};

export function FlightTicketsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isEmployee = hasAnyRole(user, 'employee');
  const canManage = hasAnyRole(user, 'accounting', 'admin', 'airline_admin');

  const [rows, setRows] = useState<FlightTicketRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<FlightTicketStatus | ''>('');
  const [special, setSpecial] = useState<'all' | 'archived'>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const airlineCompanyId = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return Number(sp.get('airline_company_id') || 0);
  }, [location.search]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (q) params.q = q;
      if (status) params.status = status;
      if (special === 'archived') params.archived = 1;
      const sp = new URLSearchParams(location.search);
      const acId = Number(sp.get('airline_company_id') || 0);
      if (Number.isFinite(acId) && acId > 0) params.airline_company_id = acId;
      const res = await api.get('/flight-tickets', { params });
      setRows(res.data.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل تذاكر الطيران');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [status, special, airlineCompanyId]);

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    if (sp.get('new') === '1') {
      setCreateOpen(true);
      sp.delete('new');
      navigate({ pathname: '/flight-tickets', search: sp.toString() ? `?${sp.toString()}` : '' }, { replace: true });
    }
  }, [location.search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rows]);

  const archivedCount = useMemo(() => rows.filter((r) => r.is_archived === 1).length, [rows]);

  // Stats
  const stats = useMemo(() => {
    const totalSales = rows.reduce((sum, r) => sum + (r.sell_usd || 0), 0);
    const totalProfit = rows.reduce((sum, r) => sum + (r.profit_usd || 0), 0);
    const totalCollected = rows.reduce((sum, r) => sum + (r.paid_usd || 0), 0);
    const pending = rows.filter(r => r.status === 'pending').length;
    return { totalSales, totalProfit, totalCollected, pending };
  }, [rows]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <Plane className="text-orange-400" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">تذاكر الطيران</h1>
              <p className="text-xs text-slate-400">
                {(!canManage) ? 'عرض تذاكرك فقط' : 'إدارة جميع حجوزات الطيران'}
              </p>
            </div>
          </div>
          {airlineCompanyId > 0 && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-300">
              <Filter size={12} />
              مفلتر على شركة الطيران #{airlineCompanyId}
              <button
                className="text-orange-400 hover:text-orange-300 underline"
                onClick={() => {
                  const sp = new URLSearchParams(location.search);
                  sp.delete('airline_company_id');
                  navigate({ pathname: '/flight-tickets', search: sp.toString() ? `?${sp.toString()}` : '' }, { replace: true });
                }}
              >
                إزالة
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              className="w-48 md:w-64 pr-10 pl-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition"
              placeholder="بحث بالاسم / PNR"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
            />
          </div>
          <Button variant="secondary" size="md" onClick={load}>
            <Filter size={16} />
            <span className="hidden sm:inline">فلترة</span>
          </Button>
          {(isEmployee || canManage) && (
            <Button variant="gradient" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              <span className="hidden sm:inline">تذكرة جديدة</span>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <Clock size={18} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">بانتظار الموافقة</p>
            <p className="text-lg font-bold text-white">{stats.pending}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <DollarSign size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">إجمالي المبيعات</p>
            <p className="text-lg font-bold text-white">${stats.totalSales.toLocaleString('en-US')}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <CreditCard size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">المحصّل</p>
            <p className="text-lg font-bold text-white">${stats.totalCollected.toLocaleString('en-US')}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">إجمالي الأرباح</p>
            <p className="text-lg font-bold text-white">${stats.totalProfit.toLocaleString('en-US')}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        {canManage && (
          <button
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1 ${special === 'archived' ? 'bg-slate-500/20 border-slate-500/30 text-slate-300' : 'border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-white'}`}
            onClick={() => { setSpecial('archived'); setStatus(''); }}
          >
            <Archive size={12} />
            مؤرشفة ({archivedCount})
          </button>
        )}

        <div className="h-6 w-px bg-slate-700/50 hidden sm:block" />

        <button
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${status === '' && special === 'all' ? 'bg-orange-500/20 border-orange-500/30 text-orange-300' : 'border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-white'}`}
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
              {flightTicketStatusLabel(s)} ({counts[s] || 0})
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 flex items-center gap-3 animate-fade-in">
          <XCircle size={18} />
          {error}
        </div>
      )}

      {/* Content - Cards View */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="glass-card rounded-xl p-4 space-y-3">
              <div className="skeleton h-6 w-24" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
            <Plane size={32} className="text-slate-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">لا توجد تذاكر</h3>
          <p className="text-sm text-slate-400 mb-4">
            {canManage ? 'لا توجد تذاكر مطابقة للبحث' : 'لم تقم بإضافة أي تذاكر بعد. أضف تذكرة جديدة وستظهر هنا.'}
          </p>
          {(isEmployee || canManage) && (
            <Button variant="gradient" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              تذكرة جديدة
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r, index) => {
            const Icon = statusIcons[r.status] || Clock;
            const remaining = r.remaining_usd ?? r.sell_usd;
            const hasRemaining = remaining > 0.01;

            return (
              <div
                key={r.id}
                onClick={() => navigate(`/flight-tickets/${r.id}`)}
                className="glass-card rounded-xl p-4 cursor-pointer transition-all duration-300 hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-1 animate-fade-in opacity-0 group relative"
                style={{ animationDelay: `${0.25 + index * 0.05}s` }}
              >
                {/* Status Badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[r.status]}`}>
                    <Icon size={12} />
                    {flightTicketStatusLabel(r.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    {r.is_archived === 1 && <Badge tone="gray">مؤرشفة</Badge>}
                    <span className="text-xs text-slate-500">#{r.id}</span>
                  </div>
                </div>

                {/* Passenger Info */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center text-orange-400 font-bold">
                    {r.passenger_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate group-hover:text-orange-300 transition">{r.passenger_name}</p>
                    <p className="text-xs text-slate-400">{r.passenger_phone || 'لا يوجد رقم'}</p>
                  </div>
                </div>

                {/* Flight Info */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Plane size={12} />
                    <span className="truncate">{r.airline_company_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="font-mono text-slate-300">{r.pnr || '—'}</span>
                  </div>
                </div>

                {/* Prices */}
                <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-slate-800/30 mb-3">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500">الشراء</p>
                    <p className="text-xs font-bold text-slate-300">${r.buy_usd.toFixed(0)}</p>
                  </div>
                  <div className="text-center border-x border-slate-700/50">
                    <p className="text-[10px] text-slate-500">المبيع</p>
                    <p className="text-xs font-bold text-white">${r.sell_usd.toFixed(0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500">الربح</p>
                    <p className={`text-xs font-bold ${r.profit_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${r.profit_usd.toFixed(0)}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar size={12} />
                    {fmtDate(r.created_at)}
                  </div>
                  {hasRemaining && (
                    <div className="flex items-center gap-1 text-xs text-orange-400">
                      <AlertTriangle size={12} />
                      متبقي ${remaining.toFixed(0)}
                    </div>
                  )}
                </div>

                {/* Creator & Billing */}
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  {r.created_by_name && (
                    <div className="flex items-center gap-1">
                      <User size={11} />
                      <span>أنشأه: <span className="text-slate-400">{r.created_by_name}</span></span>
                    </div>
                  )}
                  <div className="text-left">
                    <span className="text-slate-400">{r.billing_party_name}</span>
                    <span className="mr-1 text-slate-600">{r.billing_party_type === 'office' ? '(مكتب)' : '(عميل)'}</span>
                  </div>
                </div>

                {/* Fare Discount Badge */}
                {r.fare_discount_usd > 0 && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-green-500/20 text-[10px] text-green-400 font-medium">
                    فير ${r.fare_discount_usd.toFixed(0)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateFlightTicketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => navigate(`/flight-tickets/${id}`)}
      />
    </div>
  );
}
