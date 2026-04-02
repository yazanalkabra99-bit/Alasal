import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Plus, Receipt, Settings2, ToggleLeft, ToggleRight, Printer, Calculator, Users, Edit3, Save } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../state/auth';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { fmtMoney } from '../utils/format';
import type { Account } from '../utils/types';

type ExpenseReason = {
  id: number;
  name: string;
  is_active: 0 | 1;
  sort_order?: number;
  is_fixed?: 0 | 1;
};

type ExpenseRow = {
  id: number;
  reason_id: number;
  reason_name: string;
  account_id: number;
  account_name: string;
  amount: number;
  currency_code: string;
  amount_usd: number;
  happened_at: string;
  receipt_no?: string | null;
  note?: string | null;
  created_by_name: string;
};

type TotalsRow = { currency_code: string; total_amount: number; total_usd: number };
type DailySummaryRow = { day: string; total_usd: number; cnt: number };
type MonthlySummaryRow = { month: string; total_usd: number; cnt: number };


function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function ymdLocal(d: Date = new Date()) {
  // IMPORTANT: use LOCAL date (not UTC) so filters match the user's day/month.
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function todayYmd() {
  return ymdLocal(new Date());
}

function firstDayOfMonthYmd() {
  const d = new Date();
  return ymdLocal(new Date(d.getFullYear(), d.getMonth(), 1));
}

function firstDayOfPrevMonthYmd() {
  const d = new Date();
  return ymdLocal(new Date(d.getFullYear(), d.getMonth() - 1, 1));
}

function lastDayOfPrevMonthYmd() {
  const d = new Date();
  // day=0 => last day of previous month
  return ymdLocal(new Date(d.getFullYear(), d.getMonth(), 0));
}

function localStartIsoFromYmd(ymd: string) {
  const parts = String(ymd || '').split('-').map((x) => Number(x));
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  if (!y || !m || !d) return '';
  // Create LOCAL midnight then convert to UTC ISO
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

function localEndIsoFromYmd(ymd: string) {
  const parts = String(ymd || '').split('-').map((x) => Number(x));
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  if (!y || !m || !d) return '';
  // Create LOCAL end of day then convert to UTC ISO
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

export function ExpensesPage() {
  const { user, hasRole } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [reasons, setReasons] = useState<ExpenseReason[]>([]);

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [totals, setTotals] = useState<TotalsRow[]>([]);
  const [daily, setDaily] = useState<DailySummaryRow[]>([]);
  const [monthly, setMonthly] = useState<MonthlySummaryRow[]>([]);

  // Filters
  const [from, setFrom] = useState(firstDayOfMonthYmd());
  const [to, setTo] = useState(todayYmd());
  const [accountId, setAccountId] = useState<string>('');
  const [reasonId, setReasonId] = useState<string>('');
  const [q, setQ] = useState('');

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [mAccountId, setMAccountId] = useState<string>('');
  const [mReasonId, setMReasonId] = useState<string>('');
  const [mAmount, setMAmount] = useState<string>('');
  const [mReceiptNo, setMReceiptNo] = useState<string>('');
  const [mHappenedAtLocal, setMHappenedAtLocal] = useState<string>('');
  const [mNote, setMNote] = useState<string>('');

  // Reasons modal
  const [reasonsOpen, setReasonsOpen] = useState(false);

  // Tab: expenses | salary
  const [tab, setTab] = useState<'expenses' | 'salary'>('expenses');

  // Salary calculator state
  type CommissionRate = { id: number; service_type: string; label: string; rate: number; currency_code: string; is_per_passenger: number; is_active: number };
  type SalaryEmployee = {
    employee_id: number; employee_name: string; role: string;
    base_salary: number; salary_currency: string;
    commissions: { service_type: string; label: string; rate: number; currency_code: string; count: number; total: number }[];
    total_commission: number; total_salary: number;
  };
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryFrom, setSalaryFrom] = useState(firstDayOfMonthYmd());
  const [salaryTo, setSalaryTo] = useState(todayYmd());
  const [salaryEmployees, setSalaryEmployees] = useState<SalaryEmployee[]>([]);
  const [commissionRates, setCommissionRates] = useState<CommissionRate[]>([]);
  const [allEmployees, setAllEmployees] = useState<{id:number;name:string;base_salary:number;salary_currency:string}[]>([]);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [salariesOpen, setSalariesOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<{id:number;rate:string}|null>(null);
  const [editingSalary, setEditingSalary] = useState<{id:number;base_salary:string}|null>(null);

  async function loadSalaryReport() {
    setSalaryLoading(true);
    try {
      const res = await api.get(`/reports/salary?from=${salaryFrom}&to=${salaryTo}`);
      const d = res.data.data;
      setSalaryEmployees(d.employees || []);
      setCommissionRates(d.rates || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل تقرير الرواتب');
    } finally {
      setSalaryLoading(false);
    }
  }

  async function loadEmployeeSalaries() {
    try {
      const res = await api.get('/employees/salaries');
      setAllEmployees((res.data.data || []).map((e: any) => ({
        id: e.id, name: e.name, base_salary: Number(e.base_salary || 0), salary_currency: e.salary_currency || 'SYP',
      })));
    } catch {}
  }

  async function loadCommissionRates() {
    try {
      const res = await api.get('/commission-rates');
      setCommissionRates(res.data.data || []);
    } catch {}
  }

  async function saveRate(id: number, rate: number) {
    try {
      await api.patch(`/commission-rates/${id}`, { rate });
      await loadCommissionRates();
      setEditingRate(null);
    } catch {}
  }

  async function saveSalary(id: number, base_salary: number) {
    try {
      await api.patch(`/employees/${id}/salary`, { base_salary });
      await loadEmployeeSalaries();
      setEditingSalary(null);
    } catch {}
  }

  const activeReasons = useMemo(() => reasons.filter(r => Number(r.is_active) === 1), [reasons]);

  async function loadMeta() {
    try {
      const [accRes, reasonsRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/expense-reasons'),
      ]);
      const accs: Account[] = (accRes.data.data || []).map((a: any) => ({
        id: Number(a.id),
        name: String(a.name || ''),
        type: a.type,
        currency_code: String(a.currency_code || 'USD'),
        is_active: Number(a.is_active) as any,
      }));
      setAccounts(accs);

      const rs: ExpenseReason[] = (reasonsRes.data.data || []).map((r: any) => ({
        id: Number(r.id),
        name: String(r.name || ''),
        is_active: Number(r.is_active) as any,
        sort_order: r.sort_order,
        is_fixed: r.is_fixed,
      }));
      setReasons(rs);

      // default modal selections
      const firstAcc = accs.find(a => Number(a.is_active) === 1);
      const firstReason = rs.find(r => Number(r.is_active) === 1);
      if (!mAccountId && firstAcc) setMAccountId(String(firstAcc.id));
      if (!mReasonId && firstReason) setMReasonId(String(firstReason.id));
    } catch (e: any) {
      // ignore meta load errors here
    }
  }

  async function loadExpenses() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      // Send BOTH:
      // - from/to (YYYY-MM-DD) for backward compatibility
      // - from_ts/to_ts (ISO) computed in the browser LOCAL timezone to avoid TZ mismatch
      // This makes the page work even if the backend is on an older build.
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      // Send precise boundaries computed in the BROWSER's LOCAL timezone.
      // This prevents "today"/"this month" filters from breaking if the server
      // timezone differs from the user's browser timezone.
      if (from) {
        const v = localStartIsoFromYmd(from);
        if (v) params.set('from_ts', v);
      }
      if (to) {
        const v = localEndIsoFromYmd(to);
        if (v) params.set('to_ts', v);
      }
      if (accountId) params.set('account_id', accountId);
      if (reasonId) params.set('reason_id', reasonId);

      const res = await api.get(`/expenses?${params.toString()}`);
      const list: ExpenseRow[] = (res.data.data || []).map((r: any) => ({
        id: Number(r.id),
        reason_id: Number(r.reason_id),
        reason_name: String(r.reason_name || ''),
        account_id: Number(r.account_id),
        account_name: String(r.account_name || ''),
        amount: Number(r.amount || 0),
        currency_code: String(r.currency_code || 'USD'),
        amount_usd: Number(r.amount_usd || 0),
        happened_at: String(r.happened_at || ''),
        receipt_no: r.receipt_no ?? null,
        note: r.note ?? null,
        created_by_name: String(r.created_by_name || ''),
      }));
      setRows(list);

      const ts: TotalsRow[] = (res.data.meta?.totals || []).map((t: any) => ({
        currency_code: String(t.currency_code || 'USD'),
        total_amount: Number(t.total_amount || 0),
        total_usd: Number(t.total_usd || 0),
      }));
      setTotals(ts);

      const ds: DailySummaryRow[] = (res.data.meta?.daily || []).map((d: any) => ({
        day: String(d.day || ''),
        total_usd: Number(d.total_usd || 0),
        cnt: Number(d.cnt || 0),
      }));
      setDaily(ds);

      const ms: MonthlySummaryRow[] = (res.data.meta?.monthly || []).map((m: any) => ({
        month: String(m.month || ''),
        total_usd: Number(m.total_usd || 0),
        cnt: Number(m.cnt || 0),
      }));
      setMonthly(ms);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل المصاريف');
      setRows([]);
      setTotals([]);
      setDaily([]);
      setMonthly([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMeta().then(loadExpenses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r => {
      return (
        (r.reason_name || '').toLowerCase().includes(term) ||
        (r.account_name || '').toLowerCase().includes(term) ||
        (r.note || '').toLowerCase().includes(term) ||
        (r.receipt_no || '').toLowerCase().includes(term) ||
        String(r.id).includes(term)
      );
    });
  }, [rows, q]);

  async function createExpense() {
    setSaving(true);
    setError(null);
    try {
      const happened_at = mHappenedAtLocal ? new Date(mHappenedAtLocal).toISOString() : undefined;
      const payload: any = {
        account_id: Number(mAccountId),
        amount: Number(mAmount),
        reason_id: Number(mReasonId),
        receipt_no: mReceiptNo.trim() || undefined,
        note: mNote.trim() || undefined,
        happened_at,
      };
      const res = await api.post('/expenses', payload);
      // close + refresh
      setCreateOpen(false);
      setMAmount('');
      setMReceiptNo('');
      setMNote('');
      setMHappenedAtLocal('');
      // Ensure the new row is visible: reset to "this month" then reload.
      setFrom(firstDayOfMonthYmd());
      setTo(todayYmd());
      // let state apply then load
      setTimeout(loadExpenses, 0);

      // Keep modal selections
      if (!mAccountId) {
        const firstAcc = accounts.find(a => Number(a.is_active) === 1);
        if (firstAcc) setMAccountId(String(firstAcc.id));
      }
      if (!mReasonId) {
        const firstReason = reasons.find(r => Number(r.is_active) === 1);
        if (firstReason) setMReasonId(String(firstReason.id));
      }

      return res;
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر إنشاء المصروف');
    } finally {
      setSaving(false);
    }
  }

  async function toggleReason(id: number) {
    try {
      await api.patch(`/expense-reasons/${id}/toggle`, {});
      await loadMeta();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحديث السبب');
    }
  }

  const totalsCards = totals.length ? totals : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
              <Receipt className="w-6 h-6 text-emerald-400" />
            </div>
            المصاريف
          </h1>
          {/* Tab switcher */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setTab('expenses')}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${tab === 'expenses' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <Receipt size={14} className="inline ml-1" />
              المصاريف
            </button>
            {hasRole('accounting', 'admin') && (
              <button
                onClick={() => { setTab('salary'); loadSalaryReport(); }}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${tab === 'salary' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                <Calculator size={14} className="inline ml-1" />
                حاسبة الرواتب
              </button>
            )}
          </div>
        </div>

        {tab === 'expenses' && <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => { setFrom(todayYmd()); setTo(todayYmd()); setTimeout(loadExpenses, 50); }}>
            اليوم
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { setFrom(firstDayOfMonthYmd()); setTo(todayYmd()); setTimeout(loadExpenses, 50); }}>
            هذا الشهر
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setFrom(firstDayOfPrevMonthYmd());
              setTo(lastDayOfPrevMonthYmd());
              setTimeout(loadExpenses, 50);
            }}
          >
            الشهر السابق
          </Button>
          <Button variant="secondary" size="sm" onClick={async () => { await loadMeta(); await loadExpenses(); }} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            تحديث
          </Button>
          {hasRole('accounting', 'admin') && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              مصروف جديد
            </Button>
          )}
          {hasRole('admin') && (
            <Button variant="secondary" size="sm" onClick={() => setReasonsOpen(true)}>
              <Settings2 size={16} />
              أسباب المصاريف
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              try {
                const params: any = { from, to };
                if (reasonId) params.reason_id = reasonId;
                if (accountId) params.account_id = accountId;
                const r = await api.get('/reports/expenses/print', { params, responseType: 'blob' });
                const url = URL.createObjectURL(r.data as Blob);
                window.open(url, '_blank', 'noopener,noreferrer');
                setTimeout(() => URL.revokeObjectURL(url), 60000);
              } catch (e: any) {
                alert(e?.response?.data?.error || 'تعذر فتح التقرير');
              }
            }}
          >
            <Printer size={16} />
            طباعة التقرير
          </Button>
        </div>}
      </div>

      {/* ====== SALARY TAB ====== */}
      {tab === 'salary' && hasRole('accounting', 'admin') && (
        <div className="space-y-6">
          {/* Salary Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">من</div>
                <Input type="date" value={salaryFrom} onChange={e => setSalaryFrom(e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">إلى</div>
                <Input type="date" value={salaryTo} onChange={e => setSalaryTo(e.target.value)} />
              </div>
              <Button size="sm" onClick={loadSalaryReport} loading={salaryLoading}>
                <RefreshCw size={16} />
                حساب
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { loadCommissionRates(); setRatesOpen(true); }}>
                <Settings2 size={16} />
                أسعار العمولات
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { loadEmployeeSalaries(); setSalariesOpen(true); }}>
                <Users size={16} />
                الرواتب الأساسية
              </Button>
            </div>
          </Card>

          {/* Summary */}
          {salaryEmployees.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="text-xs text-slate-400">إجمالي الرواتب الأساسية</div>
                <div className="text-xl font-black text-white mt-1">
                  {salaryEmployees.reduce((s, e) => s + e.base_salary, 0).toLocaleString()} {salaryEmployees[0]?.salary_currency || 'SYP'}
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-slate-400">إجمالي العمولات</div>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  {salaryEmployees.reduce((s, e) => s + e.total_commission, 0).toLocaleString()} {salaryEmployees[0]?.salary_currency || 'SYP'}
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-slate-400">إجمالي المستحق</div>
                <div className="text-xl font-black text-amber-400 mt-1">
                  {salaryEmployees.reduce((s, e) => s + e.total_salary, 0).toLocaleString()} {salaryEmployees[0]?.salary_currency || 'SYP'}
                </div>
              </Card>
            </div>
          )}

          {/* Employee cards */}
          {salaryLoading ? (
            <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>
          ) : salaryEmployees.length === 0 ? (
            <Card className="p-8 text-center text-slate-400">اضغط "حساب" لعرض تقرير الرواتب</Card>
          ) : (
            <div className="space-y-4">
              {salaryEmployees.filter(e => e.base_salary > 0 || e.total_commission > 0).map(emp => (
                <Card key={emp.employee_id} className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-white">{emp.employee_name}</div>
                      <div className="text-xs text-slate-400">الراتب الأساسي: {emp.base_salary.toLocaleString()} {emp.salary_currency}</div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-slate-400">إجمالي المستحق</div>
                      <div className="text-2xl font-black text-amber-400">{emp.total_salary.toLocaleString()} {emp.salary_currency}</div>
                    </div>
                  </div>
                  {emp.commissions.length > 0 && (
                    <div className="mt-3 border-t border-slate-700/50 pt-3">
                      <div className="text-xs text-slate-400 mb-2">تفاصيل العمولات</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                        {emp.commissions.map(c => (
                          <div key={c.service_type} className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-2">
                            <div className="text-sm font-bold text-white">{c.label}</div>
                            <div className="text-xs text-slate-400">{c.count} × {c.rate} {c.currency_code}</div>
                            <div className="text-sm font-bold text-emerald-400">{c.total.toLocaleString()} {c.currency_code}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Commission Rates Modal */}
          <Modal open={ratesOpen} title="أسعار العمولات" description="تعديل أسعار العمولة لكل نوع خدمة" onClose={() => setRatesOpen(false)} width="max-w-lg">
            <div className="space-y-3">
              {commissionRates.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3">
                  <div>
                    <div className="font-bold text-white">{r.label}</div>
                    <div className="text-xs text-slate-400">{r.is_per_passenger ? 'لكل راكب' : 'لكل طلب'} · {r.currency_code}</div>
                  </div>
                  {editingRate?.id === r.id ? (
                    <div className="flex items-center gap-2">
                      <Input type="number" className="w-24" value={editingRate.rate} onChange={e => setEditingRate({...editingRate, rate: e.target.value})} />
                      <Button size="sm" onClick={() => saveRate(r.id, Number(editingRate.rate))}><Save size={14} /></Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-emerald-400">{r.rate}</span>
                      <Button variant="secondary" size="sm" onClick={() => setEditingRate({id: r.id, rate: String(r.rate)})}><Edit3 size={14} /></Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Modal>

          {/* Employee Base Salaries Modal */}
          <Modal open={salariesOpen} title="الرواتب الأساسية" description="تحديد الراتب المقطوع لكل موظف" onClose={() => setSalariesOpen(false)} width="max-w-lg">
            <div className="space-y-3">
              {allEmployees.map(emp => (
                <div key={emp.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3">
                  <div className="font-bold text-white">{emp.name}</div>
                  {editingSalary?.id === emp.id ? (
                    <div className="flex items-center gap-2">
                      <Input type="number" className="w-28" value={editingSalary.base_salary} onChange={e => setEditingSalary({...editingSalary, base_salary: e.target.value})} />
                      <span className="text-xs text-slate-400">SYP</span>
                      <Button size="sm" onClick={() => saveSalary(emp.id, Number(editingSalary.base_salary))}><Save size={14} /></Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white">{emp.base_salary > 0 ? emp.base_salary.toLocaleString() : '—'}</span>
                      <span className="text-xs text-slate-400">SYP</span>
                      <Button variant="secondary" size="sm" onClick={() => setEditingSalary({id: emp.id, base_salary: String(emp.base_salary)})}><Edit3 size={14} /></Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Modal>
        </div>
      )}

      {/* ====== EXPENSES TAB ====== */}
      {tab === 'expenses' && <>

      {/* Totals */}
      {totalsCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {totalsCards.map((t) => (
            <Card key={t.currency_code} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-400">إجمالي مصاريف ({t.currency_code})</div>
                  <div className="text-2xl font-black text-white mt-1">{fmtMoney(t.total_amount, t.currency_code)}</div>
                  <div className="text-xs text-slate-500 mt-1">USD: {fmtMoney(t.total_usd, 'USD')}</div>
                </div>
                <Badge tone="emerald" variant="subtle">{from} → {to}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review: daily/monthly summaries */}
      {(daily.length > 0 || monthly.length > 0) && (
        <Card className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="font-bold text-white mb-2">ملخص يومي (USD)</div>
              {daily.length === 0 ? (
                <div className="text-slate-500 text-sm">لا توجد بيانات</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-slate-300">
                      <tr>
                        <th className="text-right py-2">اليوم</th>
                        <th className="text-right py-2">عدد</th>
                        <th className="text-right py-2">إجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daily.slice(0, 15).map((d) => (
                        <tr key={d.day} className="border-t border-slate-800/60">
                          <td className="py-2 text-slate-300" dir="ltr">{d.day}</td>
                          <td className="py-2 text-slate-300">{d.cnt}</td>
                          <td className="py-2 font-bold text-white">{fmtMoney(d.total_usd, 'USD')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {daily.length > 15 && (
                <div className="mt-2 text-xs text-slate-500">عرض أول 15 يوم</div>
              )}
            </div>

            <div>
              <div className="font-bold text-white mb-2">ملخص شهري (USD)</div>
              {monthly.length === 0 ? (
                <div className="text-slate-500 text-sm">لا توجد بيانات</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-slate-300">
                      <tr>
                        <th className="text-right py-2">الشهر</th>
                        <th className="text-right py-2">عدد</th>
                        <th className="text-right py-2">إجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.slice(0, 12).map((m) => (
                        <tr key={m.month} className="border-t border-slate-800/60">
                          <td className="py-2 text-slate-300" dir="ltr">{m.month}</td>
                          <td className="py-2 text-slate-300">{m.cnt}</td>
                          <td className="py-2 font-bold text-white">{fmtMoney(m.total_usd, 'USD')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {monthly.length > 12 && (
                <div className="mt-2 text-xs text-slate-500">عرض أول 12 شهر</div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div>
            <div className="text-xs text-slate-400 mb-1">من</div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">إلى</div>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">الصندوق</div>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">كل الصناديق</option>
              {accounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name} ({a.currency_code}){Number(a.is_active) !== 1 ? ' • (موقوف)' : ''}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">السبب</div>
            <Select value={reasonId} onChange={(e) => setReasonId(e.target.value)}>
              <option value="">كل الأسباب</option>
              {reasons.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}{Number(r.is_active) !== 1 ? ' • (غير مفعل)' : ''}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">بحث</div>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="سبب / صندوق / إيصال / ملاحظة..." />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
          <Badge tone="gray" variant="subtle">{filtered.length} حركة</Badge>
          <Button onClick={loadExpenses} disabled={loading}>
            تحديث
          </Button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-800/50 bg-red-950/30 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </Card>

      {/* List */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <div className="font-bold text-white">سجل المصاريف</div>
          <div className="text-xs text-slate-400">كل مصروف يتم تسجيله كحركة OUT ضمن كشف الصندوق</div>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400">لا توجد بيانات ضمن الفترة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/40 text-slate-300">
                <tr>
                  <th className="text-right px-4 py-3">#</th>
                  <th className="text-right px-4 py-3">التاريخ</th>
                  <th className="text-right px-4 py-3">السبب</th>
                  <th className="text-right px-4 py-3">الصندوق</th>
                  <th className="text-right px-4 py-3">المبلغ</th>
                  <th className="text-right px-4 py-3">الإيصال</th>
                  <th className="text-right px-4 py-3">ملاحظة</th>
                  <th className="text-right px-4 py-3">أدخل بواسطة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-slate-800/60">
                    <td className="px-4 py-3 font-black text-slate-200">{r.id}</td>
                    <td className="px-4 py-3 text-slate-300" dir="ltr">
                      {new Date(r.happened_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="emerald" variant="subtle">{r.reason_name}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{r.account_name}</td>
                    <td className="px-4 py-3 font-black text-slate-200">{fmtMoney(r.amount, r.currency_code)}</td>
                    <td className="px-4 py-3 text-slate-300" dir="ltr">{r.receipt_no || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-[320px] truncate" title={r.note || ''}>{r.note || '—'}</td>
                    <td className="px-4 py-3 text-slate-300">{r.created_by_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      </>}

      {/* Create expense modal */}
      <Modal
        open={createOpen}
        title="إضافة مصروف"
        description="سيتم تسجيل المصروف كحركة OUT ضمن كشف الصندوق"
        onClose={() => setCreateOpen(false)}
        width="max-w-xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-400 mb-1">الصندوق</div>
            <Select value={mAccountId} onChange={(e) => setMAccountId(e.target.value)}>
              {accounts.filter(a => Number(a.is_active) === 1).map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name} ({a.currency_code})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">السبب</div>
            <Select value={mReasonId} onChange={(e) => setMReasonId(e.target.value)}>
              {activeReasons.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">المبلغ</div>
            <Input type="number" value={mAmount} onChange={(e) => setMAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">رقم الإيصال (اختياري)</div>
            <Input value={mReceiptNo} onChange={(e) => setMReceiptNo(e.target.value)} placeholder="مثال: 12345" />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-slate-400 mb-1">تاريخ/وقت المصروف (اختياري)</div>
            <Input type="datetime-local" value={mHappenedAtLocal} onChange={(e) => setMHappenedAtLocal(e.target.value)} />
            <div className="text-[11px] text-slate-500 mt-1">إذا تركته فارغًا سيتم اعتماد وقت الإدخال الآن.</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-slate-400 mb-1">ملاحظة</div>
            <Input value={mNote} onChange={(e) => setMNote(e.target.value)} placeholder="تفاصيل إضافية..." />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-800/50 bg-red-950/30 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>إلغاء</Button>
          <Button onClick={createExpense} loading={saving}>حفظ</Button>
        </div>
      </Modal>

      {/* Reasons management (admin) */}
      <Modal
        open={reasonsOpen}
        title="أسباب المصاريف"
        description="يمكنك تفعيل/إيقاف الأسباب (الأسباب ثابتة حسب سياسة المكتب)"
        onClose={() => setReasonsOpen(false)}
        width="max-w-lg"
      >
        <div className="space-y-2">
          {reasons.length === 0 ? (
            <div className="text-sm text-slate-400">لا توجد أسباب</div>
          ) : (
            reasons.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3">
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">{r.name}</div>
                  <div className="text-xs text-slate-500">{Number(r.is_fixed) === 1 ? 'سبب ثابت' : 'سبب'}</div>
                </div>
                <Button
                  variant={Number(r.is_active) === 1 ? 'secondary' : 'secondary'}
                  size="sm"
                  onClick={() => toggleReason(r.id)}
                >
                  {Number(r.is_active) === 1 ? (
                    <span className="inline-flex items-center gap-2">
                      <ToggleRight size={16} className="text-emerald-400" />
                      مفعّل
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <ToggleLeft size={16} className="text-slate-400" />
                      غير مفعّل
                    </span>
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
