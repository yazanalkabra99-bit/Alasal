import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bus, Plus, RefreshCw, Search, TrendingUp, DollarSign, Users, Calendar, MapPin } from 'lucide-react';
import { api } from '../utils/api';
import { fmtDate } from '../utils/format';
import { Button } from '../components/ui/Button';
import { useAuth, hasAnyRole } from '../state/auth';
import { CreateTripModal } from '../features/trips/CreateTripModal';
import { STATUS_LABELS, STATUS_COLORS } from '../features/trips/types';

type TripRow = {
  id: number;
  name: string;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  max_passengers: number;
  manager_name?: string | null;
  status: string;
  notes?: string | null;
  created_by_name: string;
  created_at: string;
  passenger_count?: number;
  bus_count?: number;
  total_revenue_usd?: number;
  total_cost_usd?: number;
  total_profit_usd?: number;
};

export function TripsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isAdmin = hasAnyRole(user, 'admin');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<TripRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(searchParams.get('new') === '1');

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/trips');
      setRows(res.data.data?.rows || res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.destination || '').toLowerCase().includes(q) ||
        (r.manager_name || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      count: rows.length,
      passengers: rows.reduce((s, r) => s + (r.passenger_count || 0), 0),
      revenue: Math.round(rows.reduce((s, r) => s + Number(r.total_revenue_usd || 0), 0)),
      profit: Math.round(rows.reduce((s, r) => s + Number(r.total_profit_usd || 0), 0)),
    };
  }, [rows]);

  const statusTabs = [
    { key: 'all', label: 'الكل', count: rows.length },
    { key: 'planning', label: 'تخطيط', count: rows.filter(r => r.status === 'planning').length },
    { key: 'open', label: 'مفتوح', count: rows.filter(r => r.status === 'open').length },
    { key: 'closed', label: 'مغلق', count: rows.filter(r => r.status === 'closed').length },
    { key: 'completed', label: 'مكتمل', count: rows.filter(r => r.status === 'completed').length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <Bus className="text-violet-400" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">رحلات وحملات</h1>
              <p className="text-xs text-slate-400">إدارة الرحلات والحملات السياحية</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Button variant="secondary" size="md" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
          {isAdmin && (
            <Button variant="gradient" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              <span className="hidden sm:inline">رحلة جديدة</span>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10">
            <Bus size={18} className="text-violet-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">عدد الرحلات</p>
            <p className="text-lg font-bold text-white">{stats.count}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Users size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">إجمالي الركاب</p>
            <p className="text-lg font-bold text-white">{stats.passengers}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <DollarSign size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">الإيرادات</p>
            <p className="text-lg font-bold text-white">${stats.revenue.toLocaleString('en-US')}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <TrendingUp size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">الأرباح</p>
            <p className="text-lg font-bold text-white">${stats.profit.toLocaleString('en-US')}</p>
          </div>
        </div>
      </div>

      {/* Status tabs + Search */}
      <div className="flex flex-wrap items-center gap-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-xl">
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === tab.key
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        <div className="h-6 w-px bg-slate-700/50 hidden sm:block" />
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition"
            placeholder="بحث بالاسم أو الوجهة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

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
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
            <Bus size={32} className="text-slate-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">لا توجد رحلات</h3>
          <p className="text-sm text-slate-400 mb-4">ابدأ بإضافة رحلة جديدة</p>
          {isAdmin && (
            <Button variant="gradient" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              رحلة جديدة
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((row, index) => {
            const profit = Number(row.total_profit_usd || 0);
            const pctFull = row.max_passengers > 0 ? Math.round((row.passenger_count || 0) / row.max_passengers * 100) : 0;
            const statusColor = STATUS_COLORS[row.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';

            return (
              <div
                key={row.id}
                onClick={() => navigate(`/trips/${row.id}`)}
                className={`
                  glass-card rounded-xl p-4 cursor-pointer transition-all duration-300
                  hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-1
                  animate-fade-in opacity-0 group
                `}
                style={{ animationDelay: `${0.25 + index * 0.05}s` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${statusColor}`}>
                    {STATUS_LABELS[row.status] || row.status}
                  </div>
                  <span className="text-xs text-slate-500">#{row.id}</span>
                </div>

                {/* Trip Info */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center text-violet-400 font-bold">
                    <Bus size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate group-hover:text-violet-300 transition">{row.name}</p>
                    {row.destination && <p className="text-xs text-slate-400 truncate flex items-center gap-1"><MapPin size={10} />{row.destination}</p>}
                  </div>
                </div>

                {/* Dates */}
                {(row.start_date || row.end_date) && (
                  <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
                    <Calendar size={12} />
                    <span>{row.start_date || '—'} ← {row.end_date || '—'}</span>
                  </div>
                )}

                {/* Passengers progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">الركاب</span>
                    <span className="text-white font-bold">{row.passenger_count || 0} / {row.max_passengers}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pctFull >= 90 ? 'bg-red-500' : pctFull >= 70 ? 'bg-amber-500' : 'bg-violet-500'}`}
                      style={{ width: `${Math.min(pctFull, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="text-center p-2 rounded-lg bg-blue-500/10">
                    <p className="text-[10px] text-slate-400">الباصات</p>
                    <p className="text-blue-400 font-bold">{row.bus_count || 0}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-emerald-500/10">
                    <p className="text-[10px] text-slate-400">الإيرادات</p>
                    <p className="text-emerald-400 font-bold">${Math.round(Number(row.total_revenue_usd || 0)).toLocaleString('en-US')}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
                  <div>
                    <p className={`text-lg font-black ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${Math.abs(Math.round(profit)).toLocaleString('en-US')}
                    </p>
                    <p className="text-xs text-slate-500">{profit >= 0 ? 'ربح' : 'خسارة'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{fmtDate(row.created_at)}</p>
                    {row.manager_name && <p className="text-[10px] text-slate-500">مدير: {row.manager_name}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateTripModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          load();
          navigate(`/trips/${id}`);
        }}
      />
    </div>
  );
}
