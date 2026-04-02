import React, { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, Ticket, IdCard, Plane, DollarSign, Calendar,
  Download, FileText, Filter, RefreshCw, ChevronDown, ChevronUp, ArrowLeftRight
} from 'lucide-react';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { fmtMoney, fmtDate } from '../utils/format';

type ServiceType = 'all' | 'visa' | 'passport' | 'ticket' | 'external_ticket' | 'service_sale';

export function ProfitsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  
  // Date filter
  const [dateFilter, setDateFilter] = useState<'custom' | 'today' | 'this_week' | 'this_month'>('this_month');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  
  const [serviceFilter, setServiceFilter] = useState<ServiceType>('all');
  const [expandedSection, setExpandedSection] = useState<string | null>('all');

  async function load() {
    setLoading(true);
    try {
      let fromDate = from;
      let toDate = to;
      
      if (dateFilter === 'today') {
        const today = new Date().toISOString().slice(0, 10);
        fromDate = today;
        toDate = today;
      } else if (dateFilter === 'this_week') {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        fromDate = weekStart.toISOString().slice(0, 10);
        toDate = now.toISOString().slice(0, 10);
      } else if (dateFilter === 'this_month') {
        const now = new Date();
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        toDate = now.toISOString().slice(0, 10);
      }
      
      const res = await api.get('/reports/all-profits', { params: { from: fromDate, to: toDate } });
      setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    if (serviceFilter === 'all') return data.rows;
    return data.rows.filter((r: any) => r.service_type === serviceFilter);
  }, [data, serviceFilter]);

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'visa': return Ticket;
      case 'passport': return IdCard;
      case 'ticket': return Plane;
      case 'external_ticket': return ArrowLeftRight;
      case 'service_sale': return DollarSign;
      default: return FileText;
    }
  };

  const getServiceColor = (type: string) => {
    switch (type) {
      case 'visa': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      case 'passport': return 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30';
      case 'ticket': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'external_ticket': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'service_sale': return 'text-pink-400 bg-pink-500/20 border-pink-500/30';
      default: return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    }
  };

  const getServiceLabel = (type: string) => {
    switch (type) {
      case 'visa': return 'فيزا';
      case 'passport': return 'جواز';
      case 'ticket': return 'تذكرة';
      case 'external_ticket': return 'تذكرة خارجية';
      case 'service_sale': return 'خدمة';
      default: return type;
    }
  };

  const handleExportExcel = async () => {
    try {
      if (!data?.rows?.length) return;
      const params: any = { from, to };
      if (serviceFilter !== 'all') params.service = serviceFilter;

      const res = await api.get('/reports/all-profits/export', {
        params,
        responseType: 'blob' as any,
      });

      const blob = res.data as Blob;
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => { try { window.URL.revokeObjectURL(url); } catch {} }, 60_000);
    } catch (err) {
      console.error(err);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
              <TrendingUp className="text-green-400" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">تقرير الأرباح</h1>
              <p className="text-xs text-slate-400">أرباح جميع الخدمات: فيزا، جوازات، تذاكر طيران، تذاكر خارجية، خدمات</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-2">
            <select 
              className="px-3 py-2 bg-slate-800/50 rounded-xl text-sm text-white border border-slate-700 focus:outline-none focus:border-cyan-500"
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value as any)}
            >
              <option value="today">هذا اليوم</option>
              <option value="this_week">هذا الأسبوع</option>
              <option value="this_month">هذا الشهر</option>
              <option value="custom">فترة مخصصة</option>
            </select>
          </div>
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl p-1">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-transparent border-none text-sm text-white px-2 py-1 focus:outline-none"
              />
              <span className="text-slate-500">-</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-transparent border-none text-sm text-white px-2 py-1 focus:outline-none"
              />
            </div>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 transition"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-blue-400' : 'text-blue-400'} />
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/20 border border-green-500/30 hover:bg-green-500/30 transition text-sm text-green-400"
          >
            <Download size={16} />
            طباعة التقرير
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {data?.totals && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Total */}
          <div 
            className={`glass-card rounded-2xl p-4 cursor-pointer transition ${serviceFilter === 'all' ? 'ring-2 ring-green-500/50' : ''}`}
            onClick={() => setServiceFilter('all')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">إجمالي الأرباح</span>
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingUp size={16} className="text-green-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-white">${Math.round(data.totals.all.profit_usd).toLocaleString('en-US')}</p>
            <p className="text-xs text-slate-500 mt-1">{data.totals.all.count} عملية</p>
          </div>

          {/* Visa */}
          <div 
            className={`glass-card rounded-2xl p-4 cursor-pointer transition ${serviceFilter === 'visa' ? 'ring-2 ring-purple-500/50' : ''}`}
            onClick={() => setServiceFilter('visa')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">أرباح الفيزا</span>
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Ticket size={16} className="text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-white">${Math.round(data.totals.visa.profit_usd).toLocaleString('en-US')}</p>
            <p className="text-xs text-slate-500 mt-1">{data.totals.visa.count} طلب</p>
          </div>

          {/* Passport */}
          <div 
            className={`glass-card rounded-2xl p-4 cursor-pointer transition ${serviceFilter === 'passport' ? 'ring-2 ring-cyan-500/50' : ''}`}
            onClick={() => setServiceFilter('passport')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">أرباح الجوازات</span>
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <IdCard size={16} className="text-cyan-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-white">${Math.round(data.totals.passport.profit_usd).toLocaleString('en-US')}</p>
            <p className="text-xs text-slate-500 mt-1">{data.totals.passport.count} طلب</p>
          </div>

          {/* Tickets */}
          <div 
            className={`glass-card rounded-2xl p-4 cursor-pointer transition ${serviceFilter === 'ticket' ? 'ring-2 ring-orange-500/50' : ''}`}
            onClick={() => setServiceFilter('ticket')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">أرباح التذاكر</span>
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Plane size={16} className="text-orange-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-white">${Math.round(data.totals.ticket.profit_usd).toLocaleString('en-US')}</p>
            <p className="text-xs text-slate-500 mt-1">{data.totals.ticket.count} تذكرة</p>
          </div>

          {/* External Tickets */}
          <div 
            className={`glass-card rounded-2xl p-4 cursor-pointer transition ${serviceFilter === 'external_ticket' ? 'ring-2 ring-blue-500/50' : ''}`}
            onClick={() => setServiceFilter('external_ticket')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">تذاكر خارجية</span>
              <div className="p-2 rounded-lg bg-blue-500/20">
                <ArrowLeftRight size={16} className="text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-white">${Math.round(data.totals.external_ticket?.profit_usd || 0).toLocaleString('en-US')}</p>
            <p className="text-xs text-slate-500 mt-1">{data.totals.external_ticket?.count || 0} تذكرة</p>
          </div>

          {/* Service Sales */}
          <div 
            className={`glass-card rounded-2xl p-4 cursor-pointer transition ${serviceFilter === 'service_sale' ? 'ring-2 ring-pink-500/50' : ''}`}
            onClick={() => setServiceFilter('service_sale')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">خدمات</span>
              <div className="p-2 rounded-lg bg-pink-500/20">
                <DollarSign size={16} className="text-pink-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-white">${Math.round(data.totals.service_sale?.profit_usd || 0).toLocaleString('en-US')}</p>
            <p className="text-xs text-slate-500 mt-1">{data.totals.service_sale?.count || 0} خدمة</p>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-700/30">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">تفاصيل العمليات</h2>
            <span className="text-xs text-slate-500">{filteredRows.length} عملية</span>
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton h-16 w-full" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-8 text-center">
            <DollarSign size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">لا توجد عمليات في هذه الفترة</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {filteredRows.map((row: any, index: number) => {
              const Icon = getServiceIcon(row.service_type);
              const link = row.service_type === 'visa' ? `/visa/${row.request_id}` 
                : row.service_type === 'passport' ? `/passport/${row.request_id}`
                : row.service_type === 'external_ticket' ? `/external-tickets/${row.request_id}`
                : row.service_type === 'service_sale' ? `/service-sales/${row.request_id}`
                : `/flight-tickets/${row.request_id}`;

              return (
                <div
                  key={`${row.service_type}-${row.request_id}`}
                  className="p-4 hover:bg-slate-800/30 transition cursor-pointer"
                  onClick={() => navigate(link)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg border ${getServiceColor(row.service_type)}`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-white">{row.applicant_name}</p>
                        <p className="text-xs text-slate-400">
                          {getServiceLabel(row.service_type)} • {row.type_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className={`text-lg font-bold ${row.profit_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${Math.round(row.profit_usd || 0).toLocaleString('en-US')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {fmtDate(row.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                    <span>مبيعات: ${Math.round(row.selling_usd || 0).toLocaleString('en-US')}</span>
                    <span>تكلفة: ${Math.round(row.cost_usd || 0).toLocaleString('en-US')}</span>
                    <span>الموظف: {row.employee_name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
