import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket, ArrowRight, Printer, CalendarDays, CalendarCheck,
  DollarSign, Users, Building2, TrendingUp, FileText, EyeOff, Eye,
  ChevronDown, ChevronUp, Store,
} from 'lucide-react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { fmtMoney, fmtDate, statusTone, statusLabel } from '../utils/format';

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function firstDayOfMonthYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function VisaReportPage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(todayYmd());
  const [to, setTo] = useState(todayYmd());
  const [statusFilter, setStatusFilter] = useState('');
  const [visaTypeId, setVisaTypeId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [offices, setOffices] = useState<{id:number;name:string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [data, setData] = useState<any>(null);
  const [showCost, setShowCost] = useState(true);
  const [showSell, setShowSell] = useState(true);
  const [tab, setTab] = useState<'daily' | 'sources'>('daily');
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  function toggleSource(key: string) {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // Load offices for vendor filter
  useEffect(() => {
    api.get('/meta/offices').then(r => {
      setOffices((r.data.data || []).map((o: any) => ({ id: o.id, name: o.name })));
    }).catch(() => {});
  }, []);

  async function loadData(fromOv?: string, toOv?: string) {
    setLoading(true);
    try {
      const params: any = { from: fromOv || from, to: toOv || to };
      if (statusFilter) params.status = statusFilter;
      if (visaTypeId) params.visa_type_id = visaTypeId;
      if (vendorId) params.vendor_id = vendorId;
      const res = await api.get('/reports/visa-daily', { params });
      setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function handleSearch() { loadData(); }

  async function printReport() {
    setPrinting(true);
    try {
      const qs = new URLSearchParams();
      qs.set('from', from);
      qs.set('to', to);
      if (statusFilter) qs.set('status', statusFilter);
      if (visaTypeId) qs.set('visa_type_id', visaTypeId);
      if (vendorId) qs.set('vendor_id', vendorId);
      if (!showCost) qs.set('hide_cost', '1');
      if (!showSell) qs.set('hide_sell', '1');
      const res = await api.get(`/reports/visa-daily/print?${qs.toString()}`, { responseType: 'blob' } as any);
      const blob = new Blob([res.data], { type: 'text/html; charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        // fallback: try direct location
        window.location.href = url;
      }
      setTimeout(() => { try { window.URL.revokeObjectURL(url); } catch {} }, 120_000);
    } catch (e: any) {
      // Try to read error from blob
      let errorMsg = 'فشل فتح التقرير';
      try {
        if (e?.response?.data instanceof Blob) {
          const text = await e.response.data.text();
          const parsed = JSON.parse(text);
          errorMsg = parsed.error || errorMsg;
        } else if (e?.response?.data?.error) {
          errorMsg = e.response.data.error;
        }
      } catch {}
      alert(errorMsg);
    } finally {
      setPrinting(false);
    }
  }

  async function printSourcesReport() {
    setPrinting(true);
    try {
      const qs = new URLSearchParams();
      qs.set('from', from);
      qs.set('to', to);
      if (statusFilter) qs.set('status', statusFilter);
      if (visaTypeId) qs.set('visa_type_id', visaTypeId);
      if (vendorId) qs.set('vendor_id', vendorId);
      if (!showCost) qs.set('hide_cost', '1');
      if (!showSell) qs.set('hide_sell', '1');
      const res = await api.get(`/reports/visa-daily/sources-print?${qs.toString()}`, { responseType: 'blob' } as any);
      const blob = new Blob([res.data], { type: 'text/html; charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) window.location.href = url;
      setTimeout(() => { try { window.URL.revokeObjectURL(url); } catch {} }, 120_000);
    } catch (e: any) {
      let errorMsg = 'فشل فتح التقرير';
      try {
        if (e?.response?.data instanceof Blob) {
          const text = await e.response.data.text();
          const parsed = JSON.parse(text);
          errorMsg = parsed.error || errorMsg;
        } else if (e?.response?.data?.error) {
          errorMsg = e.response.data.error;
        }
      } catch {}
      alert(errorMsg);
    } finally {
      setPrinting(false);
    }
  }

  function VisaTable({ visas, title, icon }: { visas: any[]; title: string; icon: React.ReactNode }) {
    if (!visas.length) {
      return (
        <Card className="mt-4">
          <div className="text-center py-6 text-slate-500">{title} — لا توجد فيز</div>
        </Card>
      );
    }

    const totalSell = visas.reduce((s: number, r: any) => s + Number(r.total_usd || 0), 0);
    const totalCost = visas.reduce((s: number, r: any) => s + Math.max(Number(r.items_cost_usd || 0), Number(r.cost_usd || 0)), 0);

    return (
      <Card className="mt-4">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <span className="text-base font-black">{title}</span>
          <Badge tone="purple">{visas.length} فيزا</Badge>
        </div>

        {/* Mini summary */}
        <div className={`grid gap-3 mb-4 grid-cols-${(showSell ? 1 : 0) + (showCost ? 1 : 0) || 1}`}>
          {showSell && (
            <div className="bg-slate-800/40 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-400">المبيعات</div>
              <div className="text-sm font-bold text-purple-400 mt-1">{fmtMoney(totalSell, 'USD')}</div>
            </div>
          )}
          {showCost && (
            <div className="bg-slate-800/40 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-400">التكاليف</div>
              <div className="text-sm font-bold text-red-400 mt-1">{fmtMoney(totalCost, 'USD')}</div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="p-3 text-right">#</th>
                <th className="p-3 text-right">مقدم الطلب</th>
                <th className="p-3 text-right">نوع الفيزا</th>
                <th className="p-3 text-right">الحالة</th>
                {showSell && <th className="p-3 text-right">المبلغ (USD)</th>}
                {showCost && <th className="p-3 text-right">التكلفة</th>}
                <th className="p-3 text-right">تاريخ التقديم</th>
                <th className="p-3 text-right">الموظف</th>
              </tr>
            </thead>
            <tbody>
              {visas.map((v: any) => {
                const cost = Math.max(Number(v.items_cost_usd || 0), Number(v.cost_usd || 0));
                return (
                  <tr key={v.visa_id} className="border-t border-slate-700/40 hover:bg-slate-800/30 cursor-pointer" onClick={() => navigate(`/visa/${v.visa_id}`)}>
                    <td className="p-3 text-slate-500">{v.visa_id}</td>
                    <td className="p-3">
                      <div className="font-semibold">{v.applicant_name}</div>
                      {v.applicant_phone && <div className="text-xs text-slate-500">{v.applicant_phone}</div>}
                    </td>
                    <td className="p-3">{v.visa_type_name}</td>
                    <td className="p-3">
                      <Badge tone={statusTone(v.visa_status)}>{statusLabel(v.visa_status)}</Badge>
                    </td>
                    {showSell && <td className="p-3 font-semibold">{fmtMoney(v.total_usd, 'USD')}</td>}
                    {showCost && <td className="p-3 text-slate-400">{fmtMoney(cost, 'USD')}</td>}
                    <td className="p-3 text-slate-400">{v.submission_date ? fmtDate(v.submission_date) : '—'}</td>
                    <td className="p-3 text-slate-400">{v.created_by_name || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-800/50 font-bold">
                <td className="p-3" colSpan={4}>المجموع</td>
                {showSell && <td className="p-3">{fmtMoney(totalSell, 'USD')}</td>}
                {showCost && <td className="p-3 text-slate-400">{fmtMoney(totalCost, 'USD')}</td>}
                <td className="p-3" colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    );
  }

  if (!data && loading) {
    return <div className="text-center py-10 text-slate-400">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowRight size={18} />
          </Button>
          <div>
            <div className="text-xl font-black flex items-center gap-2">
              <Ticket className="text-purple-400" />
              تقرير الفيزا
            </div>
            <div className="text-sm text-slate-400">تقرير تفصيلي بجميع الفيز — عملاؤنا + المكاتب + المصادر</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setShowSell(!showSell)}
            title={showSell ? 'إخفاء المبيعات' : 'إظهار المبيعات'}
          >
            {showSell ? <EyeOff size={16} className="ml-1" /> : <Eye size={16} className="ml-1" />}
            {showSell ? 'إخفاء المبيعات' : 'إظهار المبيعات'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowCost(!showCost)}
            title={showCost ? 'إخفاء التكلفة' : 'إظهار التكلفة'}
          >
            {showCost ? <EyeOff size={16} className="ml-1" /> : <Eye size={16} className="ml-1" />}
            {showCost ? 'إخفاء التكلفة' : 'إظهار التكلفة'}
          </Button>
          <Button variant="secondary" onClick={tab === 'sources' ? printSourcesReport : printReport} disabled={printing}>
            <Printer size={16} className="ml-1" />
            {printing ? '...' : 'طباعة التقرير'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('daily')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === 'daily'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
          }`}
        >
          <FileText size={14} className="inline ml-1" />
          التقرير اليومي
        </button>
        <button
          onClick={() => setTab('sources')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === 'sources'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
          }`}
        >
          <Store size={14} className="inline ml-1" />
          تقرير المصادر
        </button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          <div>
            <div className="text-xs text-slate-400 mb-1">من تاريخ</div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">إلى تاريخ</div>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">الحالة</div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">الكل</option>
              <option value="submitted">بانتظار</option>
              <option value="processing">معالجة</option>
              <option value="issued">صدرت</option>
              <option value="delivered">تم التسليم</option>
              <option value="rejected">مرفوضة</option>
              <option value="cancelled">ملغاة</option>
            </Select>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">نوع الفيزا</div>
            <Select value={visaTypeId} onChange={(e) => setVisaTypeId(e.target.value)}>
              <option value="">الكل</option>
              {data?.visa_types?.map((vt: any) => (
                <option key={vt.id} value={vt.id}>{vt.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">المصدر (مكتب)</div>
            <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">الكل</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleSearch} loading={loading} className="w-full">بحث</Button>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="secondary" onClick={() => { const d = todayYmd(); setFrom(d); setTo(d); loadData(d, d); }}>
              <CalendarDays size={14} className="ml-1" />
              اليوم
            </Button>
            <Button variant="secondary" onClick={() => { const f = firstDayOfMonthYmd(); const t = todayYmd(); setFrom(f); setTo(t); loadData(f, t); }}>
              <CalendarCheck size={14} className="ml-1" />
              الشهر
            </Button>
          </div>
        </div>
      </Card>

      {data && tab === 'daily' && (
        <>
          {/* Summary Cards */}
          <div className={`grid grid-cols-2 gap-4 ${showCost ? 'md:grid-cols-4' : 'md:grid-cols-2'}`}>
            <Card className="bg-gradient-to-br from-purple-900/30 to-slate-900/80">
              <div className="text-xs text-slate-400">إجمالي الفيز</div>
              <div className="text-2xl font-bold mt-1 text-purple-400">{data.summary.total_count}</div>
              <div className="text-xs text-slate-500 mt-1">
                {data.summary.our_count} عملاؤنا · {data.summary.office_count} مكاتب
              </div>
            </Card>
            {showSell && (
              <Card className="bg-gradient-to-br from-blue-900/30 to-slate-900/80">
                <div className="text-xs text-slate-400">إجمالي المبيعات</div>
                <div className="text-xl font-bold mt-1 text-blue-400">{fmtMoney(data.summary.total_sell_usd, 'USD')}</div>
              </Card>
            )}
            {showCost && (
              <Card className="bg-gradient-to-br from-red-900/30 to-slate-900/80">
                <div className="text-xs text-slate-400">إجمالي التكاليف</div>
                <div className="text-xl font-bold mt-1 text-red-400">{fmtMoney(data.summary.total_cost_usd, 'USD')}</div>
              </Card>
            )}
          </div>

          {/* Our Visas Table */}
          <VisaTable
            visas={data.our_visas}
            title="فيز عملائنا"
            icon={<Users size={20} className="text-purple-400" />}
          />

          {/* Office Visas Tables */}
          {data.offices?.map((office: any) => (
            <VisaTable
              key={office.office_id}
              visas={office.visas}
              title={office.office_name}
              icon={<Building2 size={20} className="text-pink-400" />}
            />
          ))}

          {data.offices?.length === 0 && (
            <Card className="mt-4">
              <div className="text-center py-6 text-slate-500">
                <Building2 size={24} className="mx-auto mb-2 text-slate-600" />
                لا توجد فيز لمكاتب خارجية في هذه الفترة
              </div>
            </Card>
          )}
        </>
      )}

      {data && tab === 'sources' && (
        <>
          {/* Sources Summary Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="bg-gradient-to-br from-purple-900/30 to-slate-900/80">
              <div className="text-xs text-slate-400">إجمالي الفيز</div>
              <div className="text-2xl font-bold mt-1 text-purple-400">{data.summary.total_count}</div>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-900/30 to-slate-900/80">
              <div className="text-xs text-slate-400">عدد المصادر</div>
              <div className="text-2xl font-bold mt-1 text-indigo-400">{data.sources?.length || 0}</div>
            </Card>
            {showSell && (
              <Card className="bg-gradient-to-br from-blue-900/30 to-slate-900/80">
                <div className="text-xs text-slate-400">إجمالي المبيعات</div>
                <div className="text-xl font-bold mt-1 text-blue-400">{fmtMoney(data.summary.total_sell_usd, 'USD')}</div>
              </Card>
            )}
            {showCost && (
              <Card className="bg-gradient-to-br from-red-900/30 to-slate-900/80">
                <div className="text-xs text-slate-400">إجمالي التكاليف</div>
                <div className="text-xl font-bold mt-1 text-red-400">{fmtMoney(data.summary.total_cost_usd, 'USD')}</div>
              </Card>
            )}
          </div>

          {/* Sources Summary Table */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Store size={20} className="text-purple-400" />
              <span className="text-base font-black">ملخص المصادر</span>
              <Badge tone="purple">{data.sources?.length || 0} مصدر</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="p-3 text-right">#</th>
                    <th className="p-3 text-right">المصدر</th>
                    <th className="p-3 text-right">النوع</th>
                    <th className="p-3 text-right">عدد الفيز</th>
                    {showSell && <th className="p-3 text-right">المبيعات (USD)</th>}
                    {showCost && <th className="p-3 text-right">التكاليف (USD)</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.sources?.map((src: any, idx: number) => {
                    const profit = src.total_sell_usd - src.total_cost_usd;
                    return (
                      <tr key={src.vendor_id || 'internal'} className="border-t border-slate-700/40 hover:bg-slate-800/30">
                        <td className="p-3 text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-semibold">{src.vendor_name}</td>
                        <td className="p-3">
                          <Badge tone={src.source_type === 'internal' ? 'blue' : 'purple'}>
                            {src.source_type === 'internal' ? 'داخلي' : 'خارجي'}
                          </Badge>
                        </td>
                        <td className="p-3 font-semibold">{src.count}</td>
                        {showSell && <td className="p-3 font-semibold text-blue-400">{fmtMoney(src.total_sell_usd, 'USD')}</td>}
                        {showCost && <td className="p-3 text-red-400">{fmtMoney(src.total_cost_usd, 'USD')}</td>}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800/50 font-bold">
                    <td className="p-3" colSpan={3}>الإجمالي</td>
                    <td className="p-3">{data.summary.total_count}</td>
                    {showSell && <td className="p-3 text-blue-400">{fmtMoney(data.summary.total_sell_usd, 'USD')}</td>}
                    {showCost && <td className="p-3 text-red-400">{fmtMoney(data.summary.total_cost_usd, 'USD')}</td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Expandable Source Cards */}
          {data.sources?.map((src: any) => {
            const key = String(src.vendor_id || 'internal');
            const isExpanded = expandedSources.has(key);
            const profit = src.total_sell_usd - src.total_cost_usd;
            return (
              <Card key={key} className="mt-2">
                <button
                  onClick={() => toggleSource(key)}
                  className="w-full flex items-center justify-between text-right"
                >
                  <div className="flex items-center gap-3">
                    <Store size={18} className={src.source_type === 'internal' ? 'text-blue-400' : 'text-purple-400'} />
                    <div>
                      <div className="font-bold text-sm">{src.vendor_name}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge tone="purple">{src.count} فيزا</Badge>
                        {showSell && <span className="text-xs text-blue-400">{fmtMoney(src.total_sell_usd, 'USD')}</span>}
                        {showCost && <span className="text-xs text-red-400">{fmtMoney(src.total_cost_usd, 'USD')}</span>}
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="mt-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-800/50">
                          <tr>
                            <th className="p-3 text-right">#</th>
                            <th className="p-3 text-right">مقدم الطلب</th>
                            <th className="p-3 text-right">نوع الفيزا</th>
                            <th className="p-3 text-right">الحالة</th>
                            {showSell && <th className="p-3 text-right">المبلغ (USD)</th>}
                            {showCost && <th className="p-3 text-right">التكلفة</th>}
                            <th className="p-3 text-right">تاريخ التقديم</th>
                            <th className="p-3 text-right">الموظف</th>
                          </tr>
                        </thead>
                        <tbody>
                          {src.visas.map((v: any) => {
                            const cost = Math.max(Number(v.items_cost_usd || 0), Number(v.cost_usd || 0));
                            return (
                              <tr key={v.visa_id} className="border-t border-slate-700/40 hover:bg-slate-800/30 cursor-pointer" onClick={() => navigate(`/visa/${v.visa_id}`)}>
                                <td className="p-3 text-slate-500">{v.visa_id}</td>
                                <td className="p-3">
                                  <div className="font-semibold">{v.applicant_name}</div>
                                  {v.applicant_phone && <div className="text-xs text-slate-500">{v.applicant_phone}</div>}
                                </td>
                                <td className="p-3">{v.visa_type_name}</td>
                                <td className="p-3">
                                  <Badge tone={statusTone(v.visa_status)}>{statusLabel(v.visa_status)}</Badge>
                                </td>
                                {showSell && <td className="p-3 font-semibold">{fmtMoney(v.total_usd, 'USD')}</td>}
                                {showCost && <td className="p-3 text-slate-400">{fmtMoney(cost, 'USD')}</td>}
                                <td className="p-3 text-slate-400">{v.submission_date ? fmtDate(v.submission_date) : '—'}</td>
                                <td className="p-3 text-slate-400">{v.created_by_name || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-800/50 font-bold">
                            <td className="p-3" colSpan={4}>المجموع</td>
                            {showSell && <td className="p-3">{fmtMoney(src.total_sell_usd, 'USD')}</td>}
                            {showCost && <td className="p-3 text-slate-400">{fmtMoney(src.total_cost_usd, 'USD')}</td>}
                            <td className="p-3" colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {(!data.sources || data.sources.length === 0) && (
            <Card className="mt-4">
              <div className="text-center py-6 text-slate-500">
                <Store size={24} className="mx-auto mb-2 text-slate-600" />
                لا توجد بيانات مصادر في هذه الفترة
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
