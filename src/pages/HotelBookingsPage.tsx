import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Hotel, Plus, RefreshCw, Search, TrendingUp, DollarSign, ShoppingCart, Calendar, Moon } from 'lucide-react';
import { api } from '../utils/api';
import { fmtMoney, fmtDate } from '../utils/format';
import { Button } from '../components/ui/Button';
import { CreateHotelBookingModal } from '../features/hotelBookings/CreateHotelBookingModal';

type HotelBookingRow = {
  id: number;
  party_name: string;
  party_type: string;
  hotel_name?: string | null;
  guest_name: string;
  check_in_date?: string | null;
  check_out_date?: string | null;
  nights?: number | null;
  room_details?: string | null;
  confirmation_number?: string | null;
  cost_amount: number;
  cost_currency_code: string;
  cost_usd: number;
  sell_amount: number;
  sell_currency_code: string;
  sell_usd: number;
  profit_usd: number;
  status: string;
  created_by_name: string;
  created_at: string;
};

export function HotelBookingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HotelBookingRow[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(searchParams.get('new') === '1');

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/hotel-bookings');
      setRows(res.data.data.rows || []);
      setSummary(res.data.data.summary || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      (r.guest_name || '').toLowerCase().includes(q) ||
      (r.hotel_name || '').toLowerCase().includes(q) ||
      (r.party_name || '').toLowerCase().includes(q) ||
      (r.confirmation_number || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const s = summary || {};
    return {
      count: s.count || rows.length,
      totalSell: Math.round(Number(s.total_sell_usd || 0)),
      totalCost: Math.round(Number(s.total_cost_usd || 0)),
      totalProfit: Math.round(Number(s.total_profit_usd || 0)),
    };
  }, [summary, rows.length]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <Hotel className="text-rose-400" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">الحجوزات الفندقية</h1>
              <p className="text-xs text-slate-400">تسجيل حجوزات فندقية للعملاء والمكاتب</p>
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
            <span className="hidden sm:inline">حجز فندقي جديد</span>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-500/10">
            <Hotel size={18} className="text-rose-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">عدد الحجوزات</p>
            <p className="text-lg font-bold text-white">{stats.count}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <DollarSign size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">المبيعات</p>
            <p className="text-lg font-bold text-white">${stats.totalSell.toLocaleString('en-US')}</p>
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

      {/* Search */}
      <div className="flex flex-wrap items-center gap-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-xl">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium transition text-slate-400 hover:text-white">
            <Hotel size={12} className="inline ml-1" />
            الكل ({filtered.length})
          </button>
        </div>
        <div className="h-6 w-px bg-slate-700/50 hidden sm:block" />
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition"
            placeholder="بحث بالنزيل أو الفندق أو الطرف أو رقم التأكيد..."
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
            <Hotel size={32} className="text-slate-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">لا توجد حجوزات فندقية</h3>
          <p className="text-sm text-slate-400 mb-4">ابدأ بإضافة حجز فندقي جديد</p>
          <Button variant="gradient" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            حجز فندقي جديد
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((row, index) => {
            const profit = Number(row.profit_usd || 0);
            const isProfit = profit >= 0;

            return (
              <div
                key={row.id}
                onClick={() => navigate(`/hotel-bookings/${row.id}`)}
                className={`
                  glass-card rounded-xl p-4 cursor-pointer transition-all duration-300
                  hover:border-rose-500/30 hover:shadow-lg hover:shadow-rose-500/5 hover:-translate-y-1
                  animate-fade-in opacity-0 group
                `}
                style={{ animationDelay: `${0.25 + index * 0.05}s` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                    isProfit ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'
                  }`}>
                    <Hotel size={12} />
                    {isProfit ? 'ربح' : 'خسارة'}
                  </div>
                  <span className="text-xs text-slate-500">#{row.id}</span>
                </div>

                {/* Guest Info */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center text-rose-400 font-bold">
                    {row.guest_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate group-hover:text-rose-300 transition">{row.guest_name}</p>
                    <p className="text-xs text-slate-400 truncate">{row.party_name} {row.party_type === 'office' ? '(مكتب)' : ''}</p>
                  </div>
                </div>

                {/* Hotel & Dates */}
                {row.hotel_name && (
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    <Hotel size={14} className="text-slate-500" />
                    <span className="text-slate-300 truncate">{row.hotel_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3 text-xs text-slate-400">
                  {row.check_in_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {row.check_in_date} {row.check_out_date ? `← ${row.check_out_date}` : ''}
                    </span>
                  )}
                  {row.nights && (
                    <span className="flex items-center gap-1">
                      <Moon size={12} />
                      {row.nights} ليلة
                    </span>
                  )}
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="text-center p-2 rounded-lg bg-red-500/10">
                    <p className="text-[10px] text-slate-400">الشراء</p>
                    <p className="text-red-400 font-bold">{fmtMoney(row.cost_amount, row.cost_currency_code)}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-blue-500/10">
                    <p className="text-[10px] text-slate-400">البيع</p>
                    <p className="text-blue-400 font-bold">{fmtMoney(row.sell_amount, row.sell_currency_code)}</p>
                  </div>
                </div>

                {/* Profit */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
                  <div>
                    <p className={`text-lg font-black ${isProfit ? 'text-green-400' : 'text-red-400'}`}>${Math.abs(Math.round(profit)).toLocaleString('en-US')}</p>
                    <p className="text-xs text-slate-500">{isProfit ? 'ربح' : 'خسارة'}</p>
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

      <CreateHotelBookingModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          load();
          navigate(`/hotel-bookings/${id}`);
        }}
      />
    </div>
  );
}
