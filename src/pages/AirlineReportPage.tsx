import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plane, ArrowRight, Download, Printer, CalendarDays, CalendarCheck, Wallet, ArrowDownCircle, FileSpreadsheet } from 'lucide-react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { fmtMoney, fmtDate } from '../utils/format';

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function firstDayOfMonthYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function AirlineReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [from, setFrom] = useState(firstDayOfMonthYmd());
  const [to, setTo] = useState(todayYmd());
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [data, setData] = useState<any>(null);

  async function loadData(fromOverride?: string, toOverride?: string) {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/reports/airline-statement/${id}`, { params: { from: fromOverride || from, to: toOverride || to } });
      setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  function handleSearch() {
    loadData();
  }

  async function exportExcel() {
    if (!id) return;
    setExporting(true);
    try {
      const qs = new URLSearchParams();
      qs.set('from', from);
      qs.set('to', to);
      const res = await api.get(`/reports/airline-statement/${id}/excel?${qs.toString()}`, { responseType: 'blob' } as any);
      const blob = res.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `airline-report-${data?.airline?.name || id}-${from}-to-${to}.xlsx`;
      a.click();
      setTimeout(() => { try { window.URL.revokeObjectURL(url); } catch {} }, 60_000);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل تصدير Excel');
    } finally {
      setExporting(false);
    }
  }

  async function printReport() {
    if (!id) return;
    setPrinting(true);
    try {
      const qs = new URLSearchParams();
      qs.set('from', from);
      qs.set('to', to);
      const res = await api.get(`/reports/airline-statement/${id}/export?${qs.toString()}`, { responseType: 'blob' } as any);
      const blob = res.data as Blob;
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => { try { window.URL.revokeObjectURL(url); } catch {} }, 60_000);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل فتح التقرير');
    } finally {
      setPrinting(false);
    }
  }

  const kindIcon = (kind: string) => {
    switch (kind) {
      case 'deposit': return <Wallet size={14} className="text-green-400" />;
      case 'withdraw': return <ArrowDownCircle size={14} className="text-red-400" />;
      case 'fare_settlement': return <Wallet size={14} className="text-blue-400" />;
      case 'adjustment': return <Plane size={14} className="text-amber-400" />;
      default: return null;
    }
  };

  const kindLabel = (kind: string) => {
    switch (kind) {
      case 'deposit': return 'إيداع';
      case 'withdraw': return 'سحب / تذكرة';
      case 'fare_settlement': return 'تسوية فير';
      case 'adjustment': return 'تعديل';
      default: return kind;
    }
  };

  if (!data && loading) {
    return <div className="text-center py-10 text-slate-400">جاري التحميل...</div>;
  }

  const cur = data?.airline?.currency_code || 'USD';

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
              <Plane className="text-orange-400" />
              كشف حساب: {data?.airline?.name || 'شركة طيران'}
            </div>
            <div className="text-sm text-slate-400">كشف تفصيلي بجميع حركات المحفظة (إيداع / سحب / تسوية)</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={exportExcel} disabled={exporting}>
            <FileSpreadsheet size={16} className="ml-1" />
            {exporting ? '...' : 'تصدير Excel'}
          </Button>
          <Button variant="secondary" onClick={printReport} disabled={printing}>
            <Printer size={16} className="ml-1" />
            {printing ? '...' : 'طباعة'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <div className="text-xs text-slate-400 mb-1">من تاريخ</div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">إلى تاريخ</div>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleSearch} loading={loading}>بحث</Button>
          </div>
          <div className="flex items-end gap-2 md:col-span-2 md:justify-end">
            <Button variant="secondary" onClick={() => { const d = todayYmd(); setFrom(d); setTo(d); loadData(d, d); }}>
              <CalendarDays size={14} className="ml-1" />
              اليوم
            </Button>
            <Button variant="secondary" onClick={() => { const f = firstDayOfMonthYmd(); const t = todayYmd(); setFrom(f); setTo(t); loadData(f, t); }}>
              <CalendarCheck size={14} className="ml-1" />
              هذا الشهر
            </Button>
          </div>
        </div>
      </Card>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80">
              <div className="text-xs text-slate-400">الرصيد الافتتاحي</div>
              <div className="text-xl font-bold mt-1">{fmtMoney(data.summary.opening_balance, cur)}</div>
              {cur !== 'USD' && <div className="text-xs text-slate-500 mt-1">≈ {fmtMoney(data.summary.opening_balance_usd, 'USD')}</div>}
            </Card>
            <Card className="bg-gradient-to-br from-green-900/30 to-slate-900/80">
              <div className="text-xs text-slate-400">إجمالي الإيداعات</div>
              <div className="text-xl font-bold mt-1 text-green-400">+{fmtMoney(data.summary.total_deposits, cur)}</div>
              {cur !== 'USD' && <div className="text-xs text-slate-500 mt-1">≈ {fmtMoney(data.summary.total_deposits_usd, 'USD')}</div>}
            </Card>
            <Card className="bg-gradient-to-br from-red-900/30 to-slate-900/80">
              <div className="text-xs text-slate-400">إجمالي السحوبات</div>
              <div className="text-xl font-bold mt-1 text-red-400">-{fmtMoney(data.summary.total_withdraws, cur)}</div>
              {cur !== 'USD' && <div className="text-xs text-slate-500 mt-1">≈ {fmtMoney(data.summary.total_withdraws_usd, 'USD')}</div>}
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/30 to-slate-900/80">
              <div className="text-xs text-slate-400">الرصيد الختامي</div>
              <div className={`text-xl font-bold mt-1 ${data.summary.closing_balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmtMoney(data.summary.closing_balance, cur)}
              </div>
              {cur !== 'USD' && <div className="text-xs text-slate-500 mt-1">≈ {fmtMoney(data.summary.closing_balance_usd, 'USD')}</div>}
              <div className="text-xs text-slate-500 mt-1">
                {data.summary.closing_balance >= 0 ? 'رصيد متاح' : 'مكشوف (رصيد سالب)'}
              </div>
            </Card>
          </div>

          {/* Fare Accrual Info */}
          {data.summary.open_fare_accrual > 0 && (
            <Card className="bg-gradient-to-br from-amber-900/20 to-slate-900/80">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-amber-400" />
                <span className="text-sm font-bold">خصومات فير معلّقة:</span>
                <span className="text-sm font-bold text-amber-400">{fmtMoney(data.summary.open_fare_accrual, cur)}</span>
              </div>
            </Card>
          )}

          {/* Ledger Table */}
          <Card>
            <div className="text-base font-black mb-4">كشف الحساب التفصيلي ({data.ledger?.length || 0} حركة)</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="p-3 text-right">التاريخ</th>
                    <th className="p-3 text-right">النوع</th>
                    <th className="p-3 text-right">الوصف</th>
                    <th className="p-3 text-right text-green-400">إيداع</th>
                    <th className="p-3 text-right text-red-400">سحب</th>
                    <th className="p-3 text-right">الرصيد ({cur})</th>
                    {cur !== 'USD' && <th className="p-3 text-right">الرصيد (USD)</th>}
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance Row */}
                  <tr className="bg-slate-800/30">
                    <td className="p-3">{from}</td>
                    <td className="p-3">—</td>
                    <td className="p-3 font-semibold">رصيد افتتاحي</td>
                    <td className="p-3">—</td>
                    <td className="p-3">—</td>
                    <td className="p-3 font-bold">{fmtMoney(data.summary.opening_balance, cur)}</td>
                    {cur !== 'USD' && <td className="p-3 font-bold text-slate-400">≈ {fmtMoney(data.summary.opening_balance_usd, 'USD')}</td>}
                  </tr>
                  {data.ledger?.map((item: any, idx: number) => (
                    <tr key={idx} className="border-t border-slate-700/40 hover:bg-slate-800/30">
                      <td className="p-3 text-slate-400">{fmtDate(item.created_at)}</td>
                      <td className="p-3">
                        <span className="flex items-center gap-1">
                          {kindIcon(item.kind)}
                          <Badge tone={item.direction === 'credit' ? 'green' : 'red'}>
                            {kindLabel(item.kind)}
                          </Badge>
                        </span>
                      </td>
                      <td className="p-3 max-w-xs truncate" title={item.description}>{item.description}</td>
                      <td className="p-3 text-green-400">
                        {item.direction === 'credit' ? fmtMoney(item.amount_abs, cur) : '—'}
                      </td>
                      <td className="p-3 text-red-400">
                        {item.direction === 'debit' ? fmtMoney(item.amount_abs, cur) : '—'}
                      </td>
                      <td className={`p-3 font-semibold ${item.running_balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {fmtMoney(item.running_balance, cur)}
                      </td>
                      {cur !== 'USD' && (
                        <td className={`p-3 text-sm ${item.running_balance_usd >= 0 ? 'text-green-300/70' : 'text-red-300/70'}`}>
                          ≈ {fmtMoney(item.running_balance_usd, 'USD')}
                        </td>
                      )}
                    </tr>
                  ))}
                  {/* Closing Balance Row */}
                  <tr className="bg-slate-800/50 font-bold">
                    <td className="p-3">{to}</td>
                    <td className="p-3">—</td>
                    <td className="p-3">رصيد ختامي</td>
                    <td className="p-3 text-green-400">{fmtMoney(data.summary.total_deposits, cur)}</td>
                    <td className="p-3 text-red-400">{fmtMoney(data.summary.total_withdraws, cur)}</td>
                    <td className={`p-3 ${data.summary.closing_balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fmtMoney(data.summary.closing_balance, cur)}
                    </td>
                    {cur !== 'USD' && (
                      <td className={`p-3 ${data.summary.closing_balance_usd >= 0 ? 'text-green-300/70' : 'text-red-300/70'}`}>
                        ≈ {fmtMoney(data.summary.closing_balance_usd, 'USD')}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
