import React, { useEffect, useState } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, DollarSign, Download, Printer } from 'lucide-react';
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

interface AccountWithMovements {
  account: {
    id: number;
    name: string;
    type: string;
    currency_code: string;
  };
  opening: number;
  in: number;
  out: number;
  closing: number;
  movements: any[];
}

interface CurrencySummary {
  currency_code: string;
  opening: number;
  in: number;
  out: number;
  closing: number;
}

export function CashReportPage() {
  const [from, setFrom] = useState(firstDayOfMonthYmd());
  const [to, setTo] = useState(todayYmd());
  const [loading, setLoading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [accounts, setAccounts] = useState<AccountWithMovements[]>([]);
  const [currencySummary, setCurrencySummary] = useState<CurrencySummary[]>([]);
  const [expandedAccount, setExpandedAccount] = useState<number | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.get('/reports/cash-summary', { params: { from, to } });
      setAccounts(res.data.data.accounts || []);
      setCurrencySummary(res.data.data.currencySummary || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleSearch() {
    loadData();
  }

  function exportCSV() {
    const rows = [['الحساب', 'العملة', 'الرصيد الافتتاحي', 'الوارد', 'الصادر', 'الرصيد الختامي']];
    for (const acc of accounts) {
      rows.push([
        acc.account.name,
        acc.account.currency_code,
        String(acc.opening),
        String(acc.in),
        String(acc.out),
        String(acc.closing)
      ]);
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportExcel() {
    setExportingExcel(true);
    try {
      const res = await api.get('/reports/cash-summary/export', {
        params: { from, to },
        responseType: 'blob',
      });

      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 60_000);
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.error || 'تعذر فتح التقرير');
    } finally {
      setExportingExcel(false);
    }
  }

  function printReport() {
    window.print();
  }

  const accountTypeLabel = (type: string) => {
    switch (type) {
      case 'cash': return 'نقدي';
      case 'bank': return 'بنك';
      case 'wallet': return 'محفظة';
      default: return type;
    }
  };

  return (
    <div className="space-y-4 print:bg-white print:text-black">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between print:hidden">
        <div>
          <div className="text-xl font-black flex items-center gap-2">
            <Wallet className="text-emerald-400" />
            تقرير الصناديق
          </div>
          <div className="text-sm text-slate-400">حركة الصناديق والأرصدة اليومية</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={exportExcel} loading={exportingExcel}>
            <Printer size={16} className="ml-1" />
            طباعة التقرير
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="text-xs text-slate-400 mb-1">من تاريخ</div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">إلى تاريخ</div>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={handleSearch} loading={loading}>بحث</Button>
          </div>
        </div>
      </Card>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">تقرير الصناديق</h1>
        <p className="text-gray-600">من {from} إلى {to}</p>
      </div>

      {/* Currency Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {currencySummary.map((cur) => (
          <Card key={cur.currency_code} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 print:bg-white print:border">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-bold">{cur.currency_code}</div>
              <DollarSign className="text-emerald-400 print:text-emerald-600" size={24} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-400 print:text-gray-500">افتتاحي:</span>
                <div className="font-semibold">{fmtMoney(cur.opening, cur.currency_code as any)}</div>
              </div>
              <div>
                <span className="text-slate-400 print:text-gray-500">ختامي:</span>
                <div className="font-semibold text-emerald-400 print:text-emerald-600">{fmtMoney(cur.closing, cur.currency_code as any)}</div>
              </div>
              <div>
                <span className="text-green-400 print:text-green-600">وارد:</span>
                <div className="font-semibold text-green-400 print:text-green-600">+{fmtMoney(cur.in, cur.currency_code as any)}</div>
              </div>
              <div>
                <span className="text-red-400 print:text-red-600">صادر:</span>
                <div className="font-semibold text-red-400 print:text-red-600">-{fmtMoney(cur.out, cur.currency_code as any)}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Accounts Table */}
      <Card>
        <div className="text-base font-black mb-4">تفاصيل الحسابات</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800/50 print:bg-gray-100">
              <tr>
                <th className="p-3 text-right">الحساب</th>
                <th className="p-3 text-right">النوع</th>
                <th className="p-3 text-right">العملة</th>
                <th className="p-3 text-right">الافتتاحي</th>
                <th className="p-3 text-right text-green-400 print:text-green-600">الوارد</th>
                <th className="p-3 text-right text-red-400 print:text-red-600">الصادر</th>
                <th className="p-3 text-right">الختامي</th>
                <th className="p-3 text-right print:hidden">تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <React.Fragment key={acc.account.id}>
                  <tr className="border-t border-slate-700/40 print:border-gray-200 hover:bg-slate-800/30">
                    <td className="p-3 font-semibold">{acc.account.name}</td>
                    <td className="p-3">
                      <Badge tone="blue">{accountTypeLabel(acc.account.type)}</Badge>
                    </td>
                    <td className="p-3">{acc.account.currency_code}</td>
                    <td className="p-3">{fmtMoney(acc.opening, acc.account.currency_code as any)}</td>
                    <td className="p-3 text-green-400 print:text-green-600">+{fmtMoney(acc.in, acc.account.currency_code as any)}</td>
                    <td className="p-3 text-red-400 print:text-red-600">-{fmtMoney(acc.out, acc.account.currency_code as any)}</td>
                    <td className="p-3 font-bold">{fmtMoney(acc.closing, acc.account.currency_code as any)}</td>
                    <td className="p-3 print:hidden">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedAccount(expandedAccount === acc.account.id ? null : acc.account.id)}
                        >
                          {expandedAccount === acc.account.id ? 'إخفاء' : 'عرض'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              const r = await api.get('/reports/cash-summary/export-account', {
                                params: { account_id: acc.account.id, from, to },
                                responseType: 'blob',
                              });
                              const url = URL.createObjectURL(r.data as Blob);
                              window.open(url, '_blank', 'noopener,noreferrer');
                              setTimeout(() => URL.revokeObjectURL(url), 60000);
                            } catch (e: any) {
                              alert(e?.response?.data?.error || 'تعذر فتح التقرير');
                            }
                          }}
                        >
                          <Printer size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expandedAccount === acc.account.id && acc.movements.length > 0 && (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <div className="bg-slate-900/50 p-3 mx-3 mb-3 rounded-lg">
                          <div className="text-xs font-semibold mb-2 text-slate-400">حركات الحساب ({acc.movements.length})</div>
                          <table className="min-w-full text-xs">
                            <thead className="text-slate-500">
                              <tr>
                                <th className="p-1 text-right">التاريخ</th>
                                <th className="p-1 text-right">الاتجاه</th>
                                <th className="p-1 text-right">المبلغ</th>
                                <th className="p-1 text-right">الطرف</th>
                                <th className="p-1 text-right">ملاحظة</th>
                              </tr>
                            </thead>
                            <tbody>
                              {acc.movements.map((m: any) => (
                                <tr key={m.id} className="border-t border-slate-700/30">
                                  <td className="p-1">{fmtDate(m.happened_at)}</td>
                                  <td className="p-1">
                                    {m.direction === 'in' ? (
                                      <span className="flex items-center gap-1 text-green-400">
                                        <ArrowDownCircle size={12} /> وارد
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-red-400">
                                        <ArrowUpCircle size={12} /> صادر
                                      </span>
                                    )}
                                  </td>
                                  <td className={`p-1 ${m.direction === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                                    {m.direction === 'in' ? '+' : '-'}{fmtMoney(m.amount, acc.account.currency_code as any)}
                                  </td>
                                  <td className="p-1">{m.party_name || '—'}</td>
                                  <td className="p-1 text-slate-400">{m.note || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
