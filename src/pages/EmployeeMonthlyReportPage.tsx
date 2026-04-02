import React, { useEffect, useState } from 'react';
import { User, Download, Printer, Globe, FileText, Plane, CreditCard, TrendingUp, ArrowLeftRight } from 'lucide-react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { fmtMoney } from '../utils/format';

function getCurrentMonth() {
  const d = new Date();
  return String(d.getMonth() + 1);
}

function getCurrentYear() {
  const d = new Date();
  return String(d.getFullYear());
}

interface EmployeeData {
  user_id: number;
  name: string;
  visa: { count: number; sales_usd: number; profit_usd: number };
  passport: { count: number; sales_usd: number; profit_usd: number };
  ticket: { count: number; sales_usd: number; profit_usd: number };
  external_ticket: { count: number; sales_usd: number; profit_usd: number };
  service_sales: { count: number; sales_usd: number; profit_usd: number };
  payments: { count: number; total_usd: number };
  total: { count: number; sales_usd: number; profit_usd: number };
}

export function EmployeeMonthlyReportPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());
  const [dateFilter, setDateFilter] = useState<'custom' | 'today' | 'this_month'>('this_month');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ employees: EmployeeData[]; summary: any } | null>(null);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: number; name: string }>>([]);

  async function loadData() {
    setLoading(true);
    try {
      let params: any = {};
      
      if (dateFilter === 'today') {
        const today = new Date();
        params.date = today.toISOString().split('T')[0];
      } else if (dateFilter === 'this_month') {
        const now = new Date();
        params.month = now.getMonth() + 1;
        params.year = now.getFullYear();
      } else {
        params.month = month;
        params.year = year;
      }
      
      if (selectedEmployee !== 'all') {
        params.userId = selectedEmployee;
      }
      
      const res = await api.get('/reports/employees-monthly-summary', { params });
      setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Load employees list
    api.get('/users').then(res => {
      const users = res.data.data || [];
      setAllEmployees(users.filter((u: any) => u.is_active).map((u: any) => ({ id: u.id, name: u.name })));
    }).catch(console.error);
    
    loadData();
  }, []);

  function handleSearch() {
    loadData();
  }

  async function exportReport() {
    if (!data) return;
    try {
      const params: any = {};
      if (dateFilter === 'today') {
        params.date = new Date().toISOString().split('T')[0];
      } else if (dateFilter === 'this_month') {
        params.month = new Date().getMonth() + 1;
        params.year = new Date().getFullYear();
      } else {
        params.month = month;
        params.year = year;
      }
      if (selectedEmployee !== 'all') {
        params.userId = selectedEmployee;
      }

      const res = await api.get('/reports/employees-monthly-summary/export', {
        params,
        responseType: 'blob',
      });

      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 60_000);
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.error || 'فشل إنشاء التقرير');
    }
  }

  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  return (
    <div className="space-y-4 print:bg-white print:text-black">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between print:hidden">
        <div>
          <div className="text-xl font-black flex items-center gap-2">
            <User className="text-blue-400" />
            تقرير الموظفين الشهري
          </div>
          <div className="text-sm text-slate-400">أداء الموظفين والمبيعات والأرباح</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={exportReport}>
            <Printer size={16} className="ml-1" />
            طباعة التقرير
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <div className="text-xs text-slate-400 mb-1">فترة التقرير</div>
            <Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)}>
              <option value="today">هذا اليوم</option>
              <option value="this_month">هذا الشهر</option>
              <option value="custom">فترة مخصصة</option>
            </Select>
          </div>
          {dateFilter === 'custom' && (
            <>
              <div>
                <div className="text-xs text-slate-400 mb-1">الشهر</div>
                <Select value={month} onChange={(e) => setMonth(e.target.value)}>
                  {monthNames.map((name, idx) => (
                    <option key={idx} value={String(idx + 1)}>{name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">السنة</div>
                <Select value={year} onChange={(e) => setYear(e.target.value)}>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </Select>
              </div>
            </>
          )}
          <div>
            <div className="text-xs text-slate-400 mb-1">الموظف</div>
            <Select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
              <option value="all">جميع الموظفين</option>
              {allEmployees.map(emp => (
                <option key={emp.id} value={String(emp.id)}>{emp.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleSearch} loading={loading}>بحث</Button>
          </div>
        </div>
      </Card>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">تقرير الموظفين الشهري</h1>
        <p className="text-gray-600">
          {dateFilter === 'today' && `ليوم ${new Date().toLocaleDateString('ar-EG')}`}
          {dateFilter === 'this_month' && `${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}`}
          {dateFilter === 'custom' && `${monthNames[Number(month) - 1]} ${year}`}
          {selectedEmployee !== 'all' && ` - ${allEmployees.find(e => e.id === Number(selectedEmployee))?.name}`}
        </p>
      </div>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            <Card className="bg-gradient-to-br from-blue-900/30 to-slate-900/80 print:bg-white print:border">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="text-blue-400" size={18} />
                <span className="text-xs text-slate-400">فيزا</span>
              </div>
              <div className="text-lg font-bold">{data.summary?.visa_count || 0}</div>
              <div className="text-xs text-slate-400">{fmtMoney(data.summary?.visa_sales || 0, 'USD')}</div>
            </Card>
            <Card className="bg-gradient-to-br from-purple-900/30 to-slate-900/80 print:bg-white print:border">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="text-purple-400" size={18} />
                <span className="text-xs text-slate-400">جوازات</span>
              </div>
              <div className="text-lg font-bold">{data.summary?.passport_count || 0}</div>
              <div className="text-xs text-slate-400">{fmtMoney(data.summary?.passport_sales || 0, 'USD')}</div>
            </Card>
            <Card className="bg-gradient-to-br from-cyan-900/30 to-slate-900/80 print:bg-white print:border">
              <div className="flex items-center gap-2 mb-2">
                <Plane className="text-cyan-400" size={18} />
                <span className="text-xs text-slate-400">تذاكر</span>
              </div>
              <div className="text-lg font-bold">{data.summary?.ticket_count || 0}</div>
              <div className="text-xs text-slate-400">{fmtMoney(data.summary?.ticket_sales || 0, 'USD')}</div>
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/30 to-slate-900/80 print:bg-white print:border">
              <div className="flex items-center gap-2 mb-2">
                <ArrowLeftRight className="text-blue-400" size={18} />
                <span className="text-xs text-slate-400">تذاكر خارجية</span>
              </div>
              <div className="text-lg font-bold">{data.summary?.ext_ticket_count || 0}</div>
              <div className="text-xs text-slate-400">{fmtMoney(data.summary?.ext_ticket_sales || 0, 'USD')}</div>
            </Card>
            <Card className="bg-gradient-to-br from-green-900/30 to-slate-900/80 print:bg-white print:border">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="text-green-400" size={18} />
                <span className="text-xs text-slate-400">تحصيل</span>
              </div>
              <div className="text-lg font-bold">{data.summary?.payments_count || 0}</div>
              <div className="text-xs text-slate-400">{fmtMoney(data.summary?.payments_total || 0, 'USD')}</div>
            </Card>
            <Card className="bg-gradient-to-br from-pink-900/30 to-slate-900/80 print:bg-white print:border">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="text-pink-400" size={18} />
                <span className="text-xs text-slate-400">خدمات</span>
              </div>
              <div className="text-lg font-bold">{data.summary?.service_sales_count || 0}</div>
              <div className="text-xs text-slate-400">{fmtMoney(data.summary?.service_sales_sales || 0, 'USD')}</div>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-900/30 to-slate-900/80 print:bg-white print:border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-emerald-400" size={18} />
                <span className="text-xs text-slate-400">إجمالي الأرباح</span>
              </div>
              <div className="text-lg font-bold text-emerald-400">{fmtMoney(data.summary?.total_profit || 0, 'USD')}</div>
            </Card>
          </div>

          {/* Employees Table */}
          <Card>
            <div className="text-base font-black mb-4">تفاصيل الموظفين ({data.employees?.length || 0})</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-800/50 print:bg-gray-100">
                  <tr>
                    <th className="p-3 text-right" rowSpan={2}>الموظف</th>
                    <th className="p-3 text-center text-blue-400 print:text-blue-600" colSpan={3}>فيزا</th>
                    <th className="p-3 text-center text-purple-400 print:text-purple-600" colSpan={3}>جوازات</th>
                    <th className="p-3 text-center text-cyan-400 print:text-cyan-600" colSpan={3}>تذاكر</th>
                    <th className="p-3 text-center text-blue-400 print:text-blue-600" colSpan={3}>خارجية</th>
                    <th className="p-3 text-center text-pink-400 print:text-pink-600" colSpan={3}>خدمات</th>
                    <th className="p-3 text-center text-green-400 print:text-green-600" colSpan={2}>تحصيل</th>
                    <th className="p-3 text-right text-emerald-400 print:text-emerald-600" rowSpan={2}>إجمالي الربح</th>
                  </tr>
                  <tr className="text-xs">
                    <th className="p-2 text-right">عدد</th>
                    <th className="p-2 text-right">مبيعات</th>
                    <th className="p-2 text-right">ربح</th>
                    <th className="p-2 text-right">عدد</th>
                    <th className="p-2 text-right">مبيعات</th>
                    <th className="p-2 text-right">ربح</th>
                    <th className="p-2 text-right">عدد</th>
                    <th className="p-2 text-right">مبيعات</th>
                    <th className="p-2 text-right">ربح</th>
                    <th className="p-2 text-right">عدد</th>
                    <th className="p-2 text-right">مبيعات</th>
                    <th className="p-2 text-right">ربح</th>
                    <th className="p-2 text-right">عدد</th>
                    <th className="p-2 text-right">مبيعات</th>
                    <th className="p-2 text-right">ربح</th>
                    <th className="p-2 text-right">عدد</th>
                    <th className="p-2 text-right">مبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.employees?.map((emp) => (
                    <tr key={emp.user_id} className="border-t border-slate-700/40 print:border-gray-200 hover:bg-slate-800/30">
                      <td className="p-3 font-semibold">{emp.name}</td>
                      {/* Visa */}
                      <td className="p-2 text-center">{emp.visa.count}</td>
                      <td className="p-2 text-right text-slate-400">{fmtMoney(emp.visa.sales_usd, 'USD')}</td>
                      <td className="p-2 text-right text-blue-400 print:text-blue-600">{fmtMoney(emp.visa.profit_usd, 'USD')}</td>
                      {/* Passport */}
                      <td className="p-2 text-center">{emp.passport.count}</td>
                      <td className="p-2 text-right text-slate-400">{fmtMoney(emp.passport.sales_usd, 'USD')}</td>
                      <td className="p-2 text-right text-purple-400 print:text-purple-600">{fmtMoney(emp.passport.profit_usd, 'USD')}</td>
                      {/* Ticket */}
                      <td className="p-2 text-center">{emp.ticket.count}</td>
                      <td className="p-2 text-right text-slate-400">{fmtMoney(emp.ticket.sales_usd, 'USD')}</td>
                      <td className="p-2 text-right text-cyan-400 print:text-cyan-600">{fmtMoney(emp.ticket.profit_usd, 'USD')}</td>
                      {/* External Ticket */}
                      <td className="p-2 text-center">{emp.external_ticket?.count || 0}</td>
                      <td className="p-2 text-right text-slate-400">{fmtMoney(emp.external_ticket?.sales_usd || 0, 'USD')}</td>
                      <td className="p-2 text-right text-blue-400 print:text-blue-600">{fmtMoney(emp.external_ticket?.profit_usd || 0, 'USD')}</td>
                      {/* Service Sales */}
                      <td className="p-2 text-center">{emp.service_sales?.count || 0}</td>
                      <td className="p-2 text-right text-slate-400">{fmtMoney(emp.service_sales?.sales_usd || 0, 'USD')}</td>
                      <td className="p-2 text-right text-pink-400 print:text-pink-600">{fmtMoney(emp.service_sales?.profit_usd || 0, 'USD')}</td>
                      {/* Payments */}
                      <td className="p-2 text-center">{emp.payments.count}</td>
                      <td className="p-2 text-right text-green-400 print:text-green-600">{fmtMoney(emp.payments.total_usd, 'USD')}</td>
                      {/* Total Profit */}
                      <td className="p-3 font-bold text-emerald-400 print:text-emerald-600">{fmtMoney(emp.total.profit_usd, 'USD')}</td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-slate-800/50 print:bg-gray-100 font-bold border-t-2 border-slate-600">
                    <td className="p-3">الإجمالي</td>
                    <td className="p-2 text-center">{data.summary?.visa_count || 0}</td>
                    <td className="p-2 text-right">{fmtMoney(data.summary?.visa_sales || 0, 'USD')}</td>
                    <td className="p-2 text-right text-blue-400">{fmtMoney(data.summary?.visa_profit || 0, 'USD')}</td>
                    <td className="p-2 text-center">{data.summary?.passport_count || 0}</td>
                    <td className="p-2 text-right">{fmtMoney(data.summary?.passport_sales || 0, 'USD')}</td>
                    <td className="p-2 text-right text-purple-400">{fmtMoney(data.summary?.passport_profit || 0, 'USD')}</td>
                    <td className="p-2 text-center">{data.summary?.ticket_count || 0}</td>
                    <td className="p-2 text-right">{fmtMoney(data.summary?.ticket_sales || 0, 'USD')}</td>
                    <td className="p-2 text-right text-cyan-400">{fmtMoney(data.summary?.ticket_profit || 0, 'USD')}</td>
                    <td className="p-2 text-center">{data.summary?.ext_ticket_count || 0}</td>
                    <td className="p-2 text-right">{fmtMoney(data.summary?.ext_ticket_sales || 0, 'USD')}</td>
                    <td className="p-2 text-right text-blue-400">{fmtMoney(data.summary?.ext_ticket_profit || 0, 'USD')}</td>
                    <td className="p-2 text-center">{data.summary?.service_sales_count || 0}</td>
                    <td className="p-2 text-right">{fmtMoney(data.summary?.service_sales_sales || 0, 'USD')}</td>
                    <td className="p-2 text-right text-pink-400">{fmtMoney(data.summary?.service_sales_profit || 0, 'USD')}</td>
                    <td className="p-2 text-center">{data.summary?.payments_count || 0}</td>
                    <td className="p-2 text-right text-green-400">{fmtMoney(data.summary?.payments_total || 0, 'USD')}</td>
                    <td className="p-3 text-emerald-400">{fmtMoney(data.summary?.total_profit || 0, 'USD')}</td>
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
