import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { fmtMoney } from '../utils/format';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  TrendingUp, TrendingDown, Users, Building2, 
  RefreshCw, FileText, DollarSign, AlertCircle, Printer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type CustomerDebt = {
  party_id: number;
  party_name: string;
  party_type: 'customer';
  phone?: string;
  email?: string;
  opening_balance_usd: number;
  total_sales_usd: number;
  total_collections_usd: number;
  total_refunds_usd: number;
  balance_usd: number;
  status: 'debtor' | 'creditor' | 'settled';
};

type OfficeDebt = {
  party_id: number;
  party_name: string;
  party_type: 'office';
  phone?: string;
  email?: string;
  ar_sales_usd: number;
  ar_collected_usd: number;
  ar_refunds_usd: number;
  ar_balance_usd: number;
  ap_purchases_usd: number;
  ap_paid_usd: number;
  ap_balance_usd: number;
  net_balance_usd: number;
  nettings_usd: number;
  status: 'debtor' | 'creditor' | 'settled';
};

type DebtsSummary = {
  total_customers_debt_usd: number;
  total_customers_credit_usd: number;
  total_offices_debt_usd: number;
  total_offices_credit_usd: number;
  total_receivables_usd: number;
  total_payables_usd: number;
};

export function DebtsReportPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerDebt[]>([]);
  const [offices, setOffices] = useState<OfficeDebt[]>([]);
  const [summary, setSummary] = useState<DebtsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'debtor' | 'creditor'>('all');
  const [partyType, setPartyType] = useState<'all' | 'customer' | 'office'>('all');
  const [printing, setPrinting] = useState(false);

  async function handlePrint() {
    setPrinting(true);
    try {
      const res = await api.get('/reports/debts/export', { responseType: 'blob' } as any);
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

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (partyType !== 'all') params.party_type = partyType;
      
      const res = await api.get('/debts/summary', { params });
      setCustomers(res.data.data.customers || []);
      setOffices(res.data.data.offices || []);
      setSummary(res.data.data.summary);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل تقرير الديون');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyType]);

  const filteredCustomers = customers.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const filteredOffices = offices.filter(o => {
    if (filter === 'all') return true;
    return o.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <DollarSign className="text-amber-400" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">تقرير الديون</h1>
              <p className="text-xs text-slate-400">الذمم المدينة والدائنة - عملاء ومكاتب</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} variant="secondary" disabled={printing}>
            <Printer size={16} />
            {printing ? '...' : 'طباعة'}
          </Button>
          <Button onClick={loadData} disabled={loading} variant="secondary">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            تحديث
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-800/60 bg-red-950/30 p-4 text-sm text-red-200 flex items-start gap-3">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="gradient-card-green">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">المستحقات (عملاء)</span>
              <TrendingUp size={16} className="text-green-400" />
            </div>
            <p className="text-2xl font-black text-white">${Math.round(summary.total_customers_debt_usd).toLocaleString('en-US')}</p>
            <p className="text-xs text-slate-500 mt-1">لنا عليهم (مدينون)</p>
          </Card>

          <Card className="gradient-card-red">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">المستحقات علينا (عملاء)</span>
              <TrendingDown size={16} className="text-red-400" />
            </div>
            <p className="text-2xl font-black text-white">${Math.round(summary.total_customers_credit_usd).toLocaleString('en-US')}</p>
            <p className="text-xs text-slate-500 mt-1">لهم علينا (دائنون)</p>
          </Card>

          <Card className="gradient-card-blue">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">المستحقات (مكاتب)</span>
              <TrendingUp size={16} className="text-blue-400" />
            </div>
            <p className="text-2xl font-black text-white">${Math.round(summary.total_offices_debt_usd).toLocaleString('en-US')}</p>
            <p className="text-xs text-slate-500 mt-1">لنا عليهم (مدينون)</p>
          </Card>

          <Card className="gradient-card-orange">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">المستحقات علينا (مكاتب)</span>
              <TrendingDown size={16} className="text-orange-400" />
            </div>
            <p className="text-2xl font-black text-white">${Math.round(summary.total_offices_credit_usd).toLocaleString('en-US')}</p>
            <p className="text-xs text-slate-500 mt-1">لهم علينا (دائنون)</p>
          </Card>
        </div>

        {/* Important Note about Settlements */}
        <Card className="bg-amber-500/5 border-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-400 mb-1">ملاحظة مهمة عن التسويات</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>التسويات (Settlements)</strong> هي مدفوعات إجمالية من المكاتب. لاحظ أن:
              </p>
              <ul className="text-xs text-slate-400 mt-2 space-y-1 list-disc list-inside">
                <li>التسوية = دفعة واحدة تغطي عدة تذاكر/خدمات</li>
                <li>الرصيد المعروض هنا يشمل جميع التسويات والمقاصات</li>
                <li>التذاكر الفردية قد تظهر "غير محصلة" في صفحة المكتب، لكن الدفعة الإجمالية محسوبة هنا</li>
                <li>للحصول على التفاصيل الكاملة، راجع <strong>كشف الحساب</strong> للمكتب</li>
              </ul>
            </div>
          </div>
        </Card>
      </>
      )}

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-bold">عرض:</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPartyType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                partyType === 'all'
                  ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setPartyType('customer')}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                partyType === 'customer'
                  ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Users size={14} className="inline mr-1" />
              عملاء
            </button>
            <button
              onClick={() => setPartyType('office')}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                partyType === 'office'
                  ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Building2 size={14} className="inline mr-1" />
              مكاتب
            </button>
          </div>

          <div className="h-6 w-px bg-slate-700"></div>

          <div className="text-sm font-bold">الفلترة:</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                filter === 'all'
                  ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilter('debtor')}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                filter === 'debtor'
                  ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              مدينون (لنا عليهم)
            </button>
            <button
              onClick={() => setFilter('creditor')}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                filter === 'creditor'
                  ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              دائنون (لهم علينا)
            </button>
          </div>
        </div>
      </Card>

      {/* Customers Table */}
      {(partyType === 'all' || partyType === 'customer') && filteredCustomers.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-cyan-400" />
              <h2 className="text-base font-bold">العملاء</h2>
            </div>
            <Badge tone="gray">{filteredCustomers.length} عميل</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/40 text-slate-300">
                <tr>
                  <th className="text-right px-4 py-3">العميل</th>
                  <th className="text-right px-4 py-3">رصيد افتتاحي</th>
                  <th className="text-right px-4 py-3">إجمالي عليه</th>
                  <th className="text-right px-4 py-3">إجمالي له</th>
                  <th className="text-right px-4 py-3">المرتجعات</th>
                  <th className="text-right px-4 py-3">الرصيد</th>
                  <th className="text-right px-4 py-3">الحالة</th>
                  <th className="text-right px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.party_id} className="border-t border-slate-800/60 hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold">{c.party_name}</div>
                      {c.phone && <div className="text-xs text-slate-500">{c.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {c.opening_balance_usd !== 0
                        ? <span className={c.opening_balance_usd > 0 ? 'text-amber-400 font-semibold' : 'text-purple-400 font-semibold'}>{fmtMoney(c.opening_balance_usd, 'USD')}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 font-bold">{fmtMoney(c.total_sales_usd, 'USD')}</td>
                    <td className="px-4 py-3 font-bold text-green-400">{fmtMoney(c.total_collections_usd, 'USD')}</td>
                    <td className="px-4 py-3 font-bold text-red-400">{fmtMoney(c.total_refunds_usd, 'USD')}</td>
                    <td className="px-4 py-3">
                      <div className={`text-lg font-black ${c.balance_usd > 0 ? 'text-green-400' : c.balance_usd < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        {fmtMoney(Math.abs(c.balance_usd), 'USD')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.status === 'debtor' ? (
                        <Badge tone="green">لنا عليهم</Badge>
                      ) : c.status === 'creditor' ? (
                        <Badge tone="red">لهم علينا</Badge>
                      ) : (
                        <Badge tone="gray">مسدد</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="secondary"
                        className="px-3 py-1 text-xs"
                        onClick={() => navigate(`/customers/${c.party_id}`)}
                      >
                        <FileText size={14} className="inline mr-1" />
                        كشف حساب
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Offices Table */}
      {(partyType === 'all' || partyType === 'office') && filteredOffices.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={20} className="text-pink-400" />
              <h2 className="text-base font-bold">المكاتب</h2>
            </div>
            <Badge tone="gray">{filteredOffices.length} مكتب</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/40 text-slate-300">
                <tr>
                  <th className="text-right px-4 py-3">المكتب</th>
                  <th className="text-right px-4 py-3">على المكتب لنا</th>
                  <th className="text-right px-4 py-3">علينا للمكتب</th>
                  <th className="text-right px-4 py-3">المقاصات</th>
                  <th className="text-right px-4 py-3">صافي الرصيد</th>
                  <th className="text-right px-4 py-3">الحالة</th>
                  <th className="text-right px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredOffices.map((o) => (
                  <tr key={o.party_id} className="border-t border-slate-800/60 hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold">{o.party_name}</div>
                      {o.phone && <div className="text-xs text-slate-500">{o.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-500">مبيعات: {fmtMoney(o.ar_sales_usd, 'USD')}</div>
                      <div className="text-xs text-green-500">محصل: {fmtMoney(o.ar_collected_usd, 'USD')}</div>
                      <div className="font-bold text-green-400">رصيد: {fmtMoney(o.ar_balance_usd, 'USD')}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-500">مشتريات: {fmtMoney(o.ap_purchases_usd, 'USD')}</div>
                      <div className="text-xs text-orange-500">مدفوع: {fmtMoney(o.ap_paid_usd, 'USD')}</div>
                      <div className="font-bold text-red-400">رصيد: {fmtMoney(o.ap_balance_usd, 'USD')}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-purple-400">{fmtMoney(o.nettings_usd, 'USD')}</td>
                    <td className="px-4 py-3">
                      <div className={`text-lg font-black ${o.net_balance_usd > 0 ? 'text-green-400' : o.net_balance_usd < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        {fmtMoney(Math.abs(o.net_balance_usd), 'USD')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {o.status === 'debtor' ? (
                        <Badge tone="green">لنا عليهم</Badge>
                      ) : o.status === 'creditor' ? (
                        <Badge tone="red">لهم علينا</Badge>
                      ) : (
                        <Badge tone="gray">مسدد</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="secondary"
                        className="px-3 py-1 text-xs"
                        onClick={() => navigate(`/offices/${o.party_id}`)}
                      >
                        <FileText size={14} className="inline mr-1" />
                        كشف حساب
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredCustomers.length === 0 && filteredOffices.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <DollarSign size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">لا توجد ديون في هذه الفئة</p>
          </div>
        </Card>
      )}

    </div>
  );
}

