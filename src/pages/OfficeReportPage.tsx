import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Download, Printer, FileText, Plane, Globe, CreditCard, ArrowLeftRight, CalendarDays, CalendarCheck } from 'lucide-react';
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

export function OfficeReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [from, setFrom] = useState(firstDayOfMonthYmd());
  const [to, setTo] = useState(todayYmd());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  async function loadData(fromOverride?: string, toOverride?: string) {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/reports/office-detailed/${id}`, { params: { from: fromOverride || from, to: toOverride || to } });
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

  function exportCSV() {
    if (!data) return;
    const rows = [['التاريخ', 'النوع', 'الوصف', 'مدين', 'دائن', 'الرصيد']];
    for (const item of data.ledger) {
      rows.push([
        item.created_at?.slice(0, 10) || '',
        item.type,
        item.description || '',
        item.direction === 'debit' ? String(item.total_usd) : '',
        item.direction === 'credit' ? String(item.total_usd) : '',
        String(item.running_balance)
      ]);
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `office-report-${data.office?.name || id}-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case 'visa': return <Globe size={14} className="text-blue-400" />;
      case 'passport': return <FileText size={14} className="text-purple-400" />;
      case 'ticket': return <Plane size={14} className="text-cyan-400" />;
      case 'external_ticket': return <ArrowLeftRight size={14} className="text-amber-400" />;
      case 'payment': return <CreditCard size={14} className="text-green-400" />;
      case 'netting': return <Building2 size={14} className="text-yellow-400" />;
      default: return null;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case 'visa': return 'فيزا';
      case 'passport': return 'جواز';
      case 'ticket': return 'تذكرة';
      case 'external_ticket': return 'تذكرة خارجية';
      case 'payment': return 'دفعة';
      case 'netting': return 'مقاصة';
      default: return type;
    }
  };

  if (!data && loading) {
    return <div className="text-center py-10 text-slate-400">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4 print:bg-white print:text-black">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowRight size={18} />
          </Button>
          <div>
            <div className="text-xl font-black flex items-center gap-2">
              <Building2 className="text-blue-400" />
              كشف حساب: {data?.office?.name || 'مكتب'}
            </div>
            <div className="text-sm text-slate-400">كشف تفصيلي بجميع العمليات</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={exportCSV}>
            <Download size={16} className="ml-1" />
            تصدير CSV
          </Button>
          <Button variant="secondary" onClick={printReport}>
            <Printer size={16} className="ml-1" />
            طباعة
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
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

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">كشف حساب</h1>
        <h2 className="text-xl">{data?.office?.name}</h2>
        <p className="text-gray-600">من {from} إلى {to}</p>
      </div>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 print:bg-white print:border">
              <div className="text-xs text-slate-400 print:text-gray-500">الرصيد الافتتاحي</div>
              <div className="text-xl font-bold mt-1">{fmtMoney(data.summary.opening_balance, 'USD')}</div>
            </Card>
            <Card className="bg-gradient-to-br from-red-900/30 to-slate-900/80 print:bg-white print:border">
              <div className="text-xs text-slate-400 print:text-gray-500">إجمالي المبيعات (مدين)</div>
              <div className="text-xl font-bold mt-1 text-red-400 print:text-red-600">+{fmtMoney(data.summary.total_debits, 'USD')}</div>
            </Card>
            <Card className="bg-gradient-to-br from-green-900/30 to-slate-900/80 print:bg-white print:border">
              <div className="text-xs text-slate-400 print:text-gray-500">إجمالي المدفوع (دائن)</div>
              <div className="text-xl font-bold mt-1 text-green-400 print:text-green-600">-{fmtMoney(data.summary.total_credits, 'USD')}</div>
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/30 to-slate-900/80 print:bg-white print:border">
              <div className="text-xs text-slate-400 print:text-gray-500">الرصيد الختامي</div>
              <div className={`text-xl font-bold mt-1 ${data.summary.closing_balance > 0 ? 'text-red-400 print:text-red-600' : 'text-green-400 print:text-green-600'}`}>
                {fmtMoney(data.summary.closing_balance, 'USD')}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {data.summary.closing_balance > 0 ? 'مطلوب من المكتب' : 'للمكتب'}
              </div>
            </Card>
          </div>

          {/* Ledger Table */}
          <Card>
            <div className="text-base font-black mb-4">كشف الحساب التفصيلي ({data.ledger?.length || 0} عملية)</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-800/50 print:bg-gray-100">
                  <tr>
                    <th className="p-3 text-right">التاريخ</th>
                    <th className="p-3 text-right">النوع</th>
                    <th className="p-3 text-right">الوصف</th>
                    <th className="p-3 text-right text-red-400 print:text-red-600">مدين</th>
                    <th className="p-3 text-right text-green-400 print:text-green-600">دائن</th>
                    <th className="p-3 text-right">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance Row */}
                  <tr className="bg-slate-800/30 print:bg-gray-50">
                    <td className="p-3">{from}</td>
                    <td className="p-3">—</td>
                    <td className="p-3 font-semibold">رصيد افتتاحي</td>
                    <td className="p-3">—</td>
                    <td className="p-3">—</td>
                    <td className="p-3 font-bold">{fmtMoney(data.summary.opening_balance, 'USD')}</td>
                  </tr>
                  {data.ledger?.map((item: any, idx: number) => (
                    <tr key={idx} className="border-t border-slate-700/40 print:border-gray-200 hover:bg-slate-800/30">
                      <td className="p-3 text-slate-400 print:text-gray-500">{fmtDate(item.created_at)}</td>
                      <td className="p-3">
                        <span className="flex items-center gap-1">
                          {typeIcon(item.type)}
                          <Badge tone={item.direction === 'debit' ? 'red' : 'green'}>
                            {typeLabel(item.type)}
                          </Badge>
                        </span>
                      </td>
                      <td className="p-3">{item.description}</td>
                      <td className="p-3 text-red-400 print:text-red-600">
                        {item.direction === 'debit' ? fmtMoney(item.total_usd, 'USD') : '—'}
                      </td>
                      <td className="p-3 text-green-400 print:text-green-600">
                        {item.direction === 'credit' ? fmtMoney(item.total_usd, 'USD') : '—'}
                      </td>
                      <td className={`p-3 font-semibold ${item.running_balance > 0 ? 'text-red-400 print:text-red-600' : 'text-green-400 print:text-green-600'}`}>
                        {fmtMoney(item.running_balance, 'USD')}
                      </td>
                    </tr>
                  ))}
                  {/* Closing Balance Row */}
                  <tr className="bg-slate-800/50 print:bg-gray-100 font-bold">
                    <td className="p-3">{to}</td>
                    <td className="p-3">—</td>
                    <td className="p-3">رصيد ختامي</td>
                    <td className="p-3 text-red-400 print:text-red-600">{fmtMoney(data.summary.total_debits, 'USD')}</td>
                    <td className="p-3 text-green-400 print:text-green-600">{fmtMoney(data.summary.total_credits, 'USD')}</td>
                    <td className={`p-3 ${data.summary.closing_balance > 0 ? 'text-red-400 print:text-red-600' : 'text-green-400 print:text-green-600'}`}>
                      {fmtMoney(data.summary.closing_balance, 'USD')}
                    </td>
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
