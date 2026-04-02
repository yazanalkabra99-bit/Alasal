import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, Plus, RefreshCw, Search, TrendingUp, DollarSign, ShoppingCart, Clock, AlertTriangle, CheckCircle2, XCircle, Archive } from 'lucide-react';
import { api } from '../utils/api';
import { fmtMoney, fmtDate, extTicketStatusTone, extTicketStatusLabel } from '../utils/format';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { CreateExternalTicketModal } from '../features/externalTickets/CreateExternalTicketModal';

type ExtTicketRow = {
  id: number;
  passenger_name: string;
  passenger_phone?: string;
  pnr?: string;
  airline_company_name?: string;
  source_office_id: number;
  source_office_name: string;
  customer_office_id: number;
  customer_office_name: string;
  customer_party_type?: string;
  buy_amount: number;
  buy_currency_code: string;
  buy_usd: number;
  sell_amount: number;
  sell_currency_code: string;
  sell_usd: number;
  profit_usd: number;
  status: string;
  notes?: string;
  created_by_name: string;
  created_at: string;
};

export function ExternalTicketsListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ExtTicketRow[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(searchParams.get('new') === '1');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (search.trim()) params.q = search.trim();
      if (status) params.status = status;
      console.log('API Request params:', params);
      const res = await api.get('/external-tickets', { params });
      console.log('API Response:', res.data);
      setRows(res.data.data.rows || []);
      setSummary(res.data.data.summary || null);
    } catch (err: any) {
      console.error('Error loading external tickets:', err);
      setError(err?.response?.data?.error || 'Failed to load external tickets');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    console.log('Loading external tickets...', { status, search });
    load(); 
  }, [status, search]);

  const stats = useMemo(() => {
    if (!summary) return { count: 0, totalSales: 0, totalCost: 0, totalProfit: 0 };
    return {
      count: summary.count || 0,
      totalSales: Math.round(summary.total_sell_usd || 0),
      totalCost: Math.round(summary.total_buy_usd || 0),
      totalProfit: Math.round(summary.total_profit_usd || 0),
    };
  }, [summary]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <ArrowLeftRight className="text-blue-400" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">التذاكر الخارجية</h1>
              <p className="text-xs text-slate-400">شراء وبيع التذاكر بين المكاتب والعملاء</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Button variant="secondary" size="md" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
          <Button variant="gradient" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            <span className="hidden sm:inline">تذكرة خارجية جديدة</span>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <ArrowLeftRight size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">عدد التذاكر</p>
            <p className="text-lg font-bold text-white">{stats.count}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <DollarSign size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">المبيعات</p>
            <p className="text-lg font-bold text-white">${stats.totalSales.toLocaleString('en-US')}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10">
            <ShoppingCart size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">التكلفة</p>
            <p className="text-lg font-bold text-white">${stats.totalCost.toLocaleString('en-US')}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <TrendingUp size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">الأرباح</p>
            <p className="text-lg font-bold text-white">${stats.totalProfit.toLocaleString('en-US')}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-xl">
          {['', 'active', 'delivered', 'cancelled'].map((s) => {
            const Icon = s === 'active' ? Clock : s === 'delivered' ? CheckCircle2 : s === 'cancelled' ? XCircle : ArrowLeftRight;
            const colorClass = s === 'active' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 
                              s === 'delivered' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 
                              s === 'cancelled' ? 'text-slate-400 bg-slate-500/10 border-slate-500/20' : 
                              'text-slate-400 hover:text-white';
            return (
              <button
                key={s}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                  status === s ? colorClass + ' border' : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => setStatus(s)}
              >
                {Icon && <Icon size={12} />}
                {s === '' ? 'الكل' : extTicketStatusLabel(s)}
              </button>
            );
          })}
        </div>

        <div className="h-6 w-px bg-slate-700/50 hidden sm:block" />

        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
            placeholder="بحث بالاسم، المكتب، PNR، شركة الطيران..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Error Display */}
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
            <ArrowLeftRight size={32} className="text-slate-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">لا توجد تذاكر خارجية</h3>
          <p className="text-sm text-slate-400 mb-4">ابدأ بإضافة تذكرة خارجية جديدة</p>
          <Button variant="gradient" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            تذكرة خارجية جديدة
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((row, index) => {
            const disp = row.status as any;
            const Icon = disp === 'active' ? Clock : disp === 'delivered' ? CheckCircle2 : disp === 'cancelled' ? XCircle : ArrowLeftRight;
            const colorClass = disp === 'active' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 
                              disp === 'delivered' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 
                              disp === 'cancelled' ? 'text-slate-400 bg-slate-500/10 border-slate-500/20' : 
                              'text-slate-400';

            return (
              <div
                key={row.id}
                onClick={() => navigate(`/external-tickets/${row.id}`)}
                className={`
                  glass-card rounded-xl p-4 cursor-pointer transition-all duration-300 
                  hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-1
                  animate-fade-in opacity-0 group
                `}
                style={{ animationDelay: `${0.25 + index * 0.05}s` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${colorClass}`}>
                    <Icon size={12} />
                    {extTicketStatusLabel(disp)}
                  </div>
                  <span className="text-xs text-slate-500">#{row.id}</span>
                </div>

                {/* Passenger Info */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center text-blue-400 font-bold">
                    {row.passenger_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate group-hover:text-blue-300 transition">{row.passenger_name}</p>
                    {row.pnr && <p className="text-xs text-slate-400">PNR: {row.pnr}</p>}
                  </div>
                </div>

                {/* Airline & Route */}
                <div className="space-y-2 mb-3 text-sm">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight size={14} className="text-slate-500" />
                    <span className="text-slate-300">{row.airline_company_name || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-red-400 truncate">{row.source_office_name}</span>
                    <span className="text-slate-500 mx-1">→</span>
                    <span className="text-green-400 truncate">{row.customer_office_name}</span>
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="text-center p-2 rounded-lg bg-red-500/10">
                    <p className="text-[10px] text-slate-400">شراء</p>
                    <p className="text-red-400 font-bold">{fmtMoney(row.buy_usd, 'USD')}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-blue-500/10">
                    <p className="text-[10px] text-slate-400">بيع</p>
                    <p className="text-blue-400 font-bold">{fmtMoney(row.sell_usd, 'USD')}</p>
                  </div>
                </div>

                {/* Profit */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
                  <div>
                    <p className={`text-lg font-black ${row.profit_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>${Math.abs(Math.round(row.profit_usd)).toLocaleString('en-US')}</p>
                    <p className="text-xs text-slate-500">{row.profit_usd >= 0 ? 'ربح' : 'خسارة'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{fmtDate(row.created_at)}</p>
                    <p className="text-[10px] text-slate-500">{row.created_by_name}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateExternalTicketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          navigate(`/external-tickets/${id}`);
        }}
      />
    </div>
  );
}