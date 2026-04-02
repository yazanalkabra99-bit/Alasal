import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api';
import type { Account } from '../utils/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { fmtDate, fmtMoney } from '../utils/format';
import { useAuth, hasAnyRole } from '../state/auth';

type CashReportMovement = {
  id: number;
  happened_at: string;
  direction: 'in' | 'out';
  category: string;
  receipt_no?: string | null;
  amount: number;
  currency_code: string;
  note?: string | null;
  account_id: number;
  account_name: string;
  account_type: string;
  party_id?: number | null;
  party_name?: string | null;
  related_transaction_id?: number | null;
  related_visa_request_id?: number | null;
};


type CashReportAccountSummary = {
  account: Account;
  opening: number;
  in: number;
  out: number;
  closing: number;
};

type CashReportCurrencySummary = {
  currency_code: string;
  opening: number;
  in: number;
  out: number;
  closing: number;
};

type CashReportResp = {
  period: { from: string; to: string };
  filters: { currency: string; account_id: number | null; category: string | null };
  currencySummary: CashReportCurrencySummary[];
  accountsSummary: CashReportAccountSummary[];
  movements: CashReportMovement[];
};

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function firstDayOfMonthYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function categoryLabel(cat: string) {
  switch (cat) {
    case 'collection':
      return 'تحصيل';
    case 'vendor_payment':
      return 'سداد مصدر';
    case 'expense':
      return 'مصروف';
    case 'refund':
      return 'مرتجع';
    case 'office_settlement':
      return 'تسوية مكتب';
    case 'transfer_fee':
      return 'عمولة تحويل';
    case 'transfer_fee_income':
      return 'عمولة تحويل (لنا)';
    case 'transfer':
      return 'تحويل بين الصناديق';
    case 'airline_deposit':
      return 'إيداع شركة طيران';
    case 'airline_deposit_fee':
      return 'عمولة تحويل (شركة طيران)';
    case 'cash_in':
      return 'إضافة رصيد';
    case 'cash_out':
      return 'سحب رصيد';
    case 'opening_balance':
      return 'رصيد افتتاحي';
    case 'balance_adjustment':
      return 'تعديل رصيد';
    default:
      return cat;
  }
}

function categoryTone(cat: string) {
  switch (cat) {
    case 'collection':
      return 'green';
    case 'vendor_payment':
      return 'blue';
    case 'expense':
      return 'amber';
    case 'refund':
      return 'red';
    case 'office_settlement':
      return 'purple';
    case 'transfer_fee':
      return 'amber';
    case 'transfer_fee_income':
      return 'green';
    case 'transfer':
      return 'gray';
    case 'airline_deposit':
      return 'blue';
    case 'airline_deposit_fee':
      return 'amber';
    case 'cash_in':
      return 'green';
    case 'cash_out':
      return 'red';
    default:
      return 'gray';
  }
}

export function AccountsPage() {
  const { user } = useAuth();
  const canManage = hasAnyRole(user, 'accounting', 'admin');
  const [mode, setMode] = useState<'report' | 'manage'>('report');

  const [metaAccounts, setMetaAccounts] = useState<Account[]>([]);

  // Accounts management (Accounting only)
  const [manageAccounts, setManageAccounts] = useState<Account[]>([]);
  const [currenciesMeta, setCurrenciesMeta] = useState<{ code: string; name: string; symbol?: string | null; is_active?: 0 | 1 }[]>([]);
  const [perUsdMap, setPerUsdMap] = useState<Record<string, number>>({ USD: 1 });
  const [manageLoading, setManageLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);

  // Cashbox operations (Accounting only)
  const activeAccounts = useMemo(() => manageAccounts.filter((a) => !!a.is_active), [manageAccounts]);
  const [opSaving, setOpSaving] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const [transferOpen, setTransferOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  // Transfer form
  const [trFromId, setTrFromId] = useState<string>('');
  const [trToId, setTrToId] = useState<string>('');
  const [trAmount, setTrAmount] = useState<string>('');
  const [trFeeEnabled, setTrFeeEnabled] = useState<boolean>(false);
  const [trFeeMode, setTrFeeMode] = useState<'separate' | 'deduct' | 'income'>('separate');
  const [trFeeAmount, setTrFeeAmount] = useState<string>('');
  const [trFeeIncomeAccountId, setTrFeeIncomeAccountId] = useState<string>('');
  const [trRateFromPerUsd, setTrRateFromPerUsd] = useState<string>('');
  const [trRateToPerUsd, setTrRateToPerUsd] = useState<string>('');
  const [trDate, setTrDate] = useState<string>(todayYmd());
  const [trNote, setTrNote] = useState<string>('');

  // Auto-enable transfer fee if a fee amount is entered
  useEffect(() => {
    const feeAmtRaw = Number(trFeeAmount || 0);
    if (feeAmtRaw > 0 && !trFeeEnabled) setTrFeeEnabled(true);
  }, [trFeeAmount, trFeeEnabled]);


  // Deposit/Withdraw form
  const [adjAccountId, setAdjAccountId] = useState<string>('');
  const [adjAmount, setAdjAmount] = useState<string>('');
  const [adjReason, setAdjReason] = useState<string>('');
  const [adjDate, setAdjDate] = useState<string>(todayYmd());
  const [adjNote, setAdjNote] = useState<string>('');

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'cash' | 'bank' | 'wallet'>('cash');
  const [formCurrency, setFormCurrency] = useState<string>('USD');
  const [formOpeningBalance, setFormOpeningBalance] = useState<string>('');
  const [editId, setEditId] = useState<number | null>(null);

  // Set balance modal
  const [setBalOpen, setSetBalOpen] = useState(false);
  const [setBalAccount, setSetBalAccount] = useState<Account | null>(null);
  const [setBalCurrent, setSetBalCurrent] = useState<number | null>(null);
  const [setBalTarget, setSetBalTarget] = useState<string>('');
  const [setBalNote, setSetBalNote] = useState<string>('');
  const [setBalSaving, setSetBalSaving] = useState(false);
  const [setBalError, setSetBalError] = useState<string | null>(null);
  const [report, setReport] = useState<CashReportResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState<string>(todayYmd());
  const [to, setTo] = useState<string>(todayYmd());
  const [currency, setCurrency] = useState<string>('ALL');
  const [accountId, setAccountId] = useState<string>('');
  const [category, setCategory] = useState<string>('');

  async function loadMeta() {
    try {
      const res = await api.get('/meta/accounts');
      setMetaAccounts(res.data.data || []);
    } catch (e: any) {
      // ignore - report can still load
    }
  }

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      // Backend treats missing currency as "ALL". Avoid sending currency=ALL to prevent accidental filtering.
      if (currency && currency !== 'ALL') qs.set('currency', currency);
      if (accountId) qs.set('account_id', accountId);
      if (category) qs.set('category', category);

      const res = await api.get(`/reports/cash?${qs.toString()}`);
      setReport(res.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل تقرير الصناديق');
    } finally {
      setLoading(false);
    }
  }

  async function loadManage() {
    if (!canManage) return;
    setManageLoading(true);
    setManageError(null);
    try {
      const [accRes, curRes] = await Promise.all([api.get('/accounts'), api.get('/currencies')]);
      setManageAccounts(accRes.data.data || []);
      const curRows = curRes.data.data || [];
      setCurrenciesMeta(curRows);
      const m: Record<string, number> = { USD: 1 };
      (curRows || []).forEach((r: any) => {
        const c = String(r.code || '').toUpperCase();
        if (!c) return;
        if (c === 'USD') { m.USD = 1; return; }
        const v = Number((r as any).usd_to_currency);
        if (Number.isFinite(v) && v > 0) m[c] = v;
      });
      setPerUsdMap(m);
    } catch (e: any) {
      setManageError(e?.response?.data?.error || 'تعذر تحميل الحسابات');
    } finally {
      setManageLoading(false);
    }
  }

  function perUsdHint(cur: string) {
    const c = String(cur || '').toUpperCase();
    const v = (perUsdMap as any)[c];
    return v ? String(v) : '';
  }

  function resetForm() {
    setFormName('');
    setFormType('cash');
    setFormCurrency('USD');
    setFormOpeningBalance('');
    setEditId(null);
  }

  function openAddModal() {
    resetForm();
    setAddOpen(true);
  }

  async function openSetBalance(acc: Account) {
    setSetBalAccount(acc);
    setSetBalTarget('');
    setSetBalNote('');
    setSetBalError(null);
    setSetBalCurrent(null);
    setSetBalOpen(true);
    // Fetch current balance
    try {
      const res = await api.get(`/accounts/${acc.id}/balance`);
      setSetBalCurrent(Number(res.data.data.balance));
      setSetBalTarget(String(Number(res.data.data.balance)));
    } catch {
      setSetBalCurrent(0);
      setSetBalTarget('0');
    }
  }

  async function submitSetBalance() {
    if (!setBalAccount) return;
    const target = Number(setBalTarget);
    if (!Number.isFinite(target)) { setSetBalError('أدخل رقماً صحيحاً'); return; }
    setSetBalSaving(true);
    setSetBalError(null);
    try {
      await api.post(`/accounts/${setBalAccount.id}/set-balance`, {
        target_balance: target,
        note: setBalNote || 'تعديل رصيد',
      });
      setSetBalOpen(false);
      await Promise.all([loadManage(), loadReport()]);
    } catch (e: any) {
      setSetBalError(e?.response?.data?.error || 'فشل التعديل');
    } finally {
      setSetBalSaving(false);
    }
  }

  function openEditModal(acc: Account) {
    setEditId(acc.id);
    setFormName(acc.name);
    setFormType(acc.type as any);
    setFormCurrency(acc.currency_code);
    setEditOpen(true);
  }

  async function createAccount() {
    if (!formName.trim()) return;
    setSaving(true);
    setManageError(null);
    try {
      const payload: any = { name: formName.trim(), type: formType, currency_code: formCurrency };
      if (formOpeningBalance !== '' && Number(formOpeningBalance) !== 0) {
        payload.opening_balance = Number(formOpeningBalance);
        payload.opening_balance_note = 'رصيد افتتاحي';
      }
      await api.post('/accounts', payload);
      setAddOpen(false);
      await Promise.all([loadManage(), loadMeta()]);
    } catch (e: any) {
      setManageError(e?.response?.data?.error || 'تعذر إضافة الحساب');
    } finally {
      setSaving(false);
    }
  }

  async function updateAccount() {
    if (!editId) return;
    setSaving(true);
    setManageError(null);
    try {
      await api.patch(`/accounts/${editId}`, { name: formName.trim(), type: formType, currency_code: formCurrency });
      setEditOpen(false);
      await Promise.all([loadManage(), loadMeta()]);
    } catch (e: any) {
      setManageError(e?.response?.data?.error || 'تعذر تعديل الحساب');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAccount(id: number) {
    setSaving(true);
    setManageError(null);
    try {
      await api.patch(`/accounts/${id}/toggle`, {});
      await Promise.all([loadManage(), loadMeta()]);
    } catch (e: any) {
      setManageError(e?.response?.data?.error || 'تعذر تغيير حالة الحساب');
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------
  // Cashbox Operations (Deposit / Withdraw / Transfer)
  // ---------------------------
  function resetOps() {
    setOpError(null);
    setTrFromId('');
    setTrToId('');
    setTrAmount('');
    setTrFeeEnabled(false);
    setTrFeeMode('separate');
    setTrFeeAmount('');
    setTrFeeIncomeAccountId('');
    setTrRateFromPerUsd('');
    setTrRateToPerUsd('');
    setTrDate(todayYmd());
    setTrNote('');
    setAdjAccountId('');
    setAdjAmount('');
    setAdjReason('');
    setAdjDate(todayYmd());
    setAdjNote('');
  }

  const trFromAcc = useMemo(() => {
    const id = Number(trFromId);
    return activeAccounts.find((a) => a.id === id) || null;
  }, [trFromId, activeAccounts]);

  const trToAcc = useMemo(() => {
    const id = Number(trToId);
    return activeAccounts.find((a) => a.id === id) || null;
  }, [trToId, activeAccounts]);

  const trFromCur = (trFromAcc?.currency_code || '').toUpperCase();
  const trToCur = (trToAcc?.currency_code || '').toUpperCase();
  const isFxTransfer = !!trFromAcc && !!trToAcc && trFromCur !== trToCur;
  const needsFromRate = isFxTransfer && trFromCur !== 'USD';
  const needsToRate = isFxTransfer && trToCur !== 'USD';

  // Auto-fill FX fields (per operation) and keep USD at 1 automatically
  useEffect(() => {
    if (!trFromAcc || !trToAcc) return;
    if (!isFxTransfer) {
      if (trRateFromPerUsd) setTrRateFromPerUsd('');
      if (trRateToPerUsd) setTrRateToPerUsd('');
      return;
    }

    const desiredFrom = trFromCur === 'USD' ? '1' : String(perUsdMap[trFromCur] ?? '');
    const desiredTo = trToCur === 'USD' ? '1' : String(perUsdMap[trToCur] ?? '');

    // If user hasn't typed a value (or it's empty), fill it. If currency is USD enforce 1.
    if (trFromCur === 'USD') {
      if (trRateFromPerUsd !== '1') setTrRateFromPerUsd('1');
    } else if (!trRateFromPerUsd && desiredFrom) {
      setTrRateFromPerUsd(desiredFrom);
    }

    if (trToCur === 'USD') {
      if (trRateToPerUsd !== '1') setTrRateToPerUsd('1');
    } else if (!trRateToPerUsd && desiredTo) {
      setTrRateToPerUsd(desiredTo);
    }

    // Fee income account defaults to from account
    if (trFeeMode === 'income' && !trFeeIncomeAccountId) {
      setTrFeeIncomeAccountId(String(trFromAcc.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trFromCur, trToCur, isFxTransfer, trFromAcc?.id, trToAcc?.id, perUsdMap]);

  const transferPreview = useMemo(() => {
    const amt = Number(trAmount || 0);
    const feeAmtRaw = Number(trFeeAmount || 0);
    const feeOn = trFeeEnabled || feeAmtRaw > 0;
    const feeAmt = feeOn ? feeAmtRaw : 0;
    const feeDeduct = feeOn && trFeeMode === 'deduct';
    const netFrom = Math.max(0, amt - (feeDeduct ? feeAmt : 0));
    if (!trFromAcc || !trToAcc || netFrom <= 0) return null;

    const feeOut = feeOn && feeAmt > 0 && trFeeMode !== 'income' ? feeAmt : 0;
    const feeIn = feeOn && feeAmt > 0 && trFeeMode === 'income' ? feeAmt : 0;
    const totalFromOut = netFrom + feeOut;

    if (!isFxTransfer) {
      return {
        from: netFrom,
        to: netFrom,
        currencyFrom: trFromAcc.currency_code,
        currencyTo: trToAcc.currency_code,
        feeOut,
        feeIn,
        totalFromOut,
      };
    }

    const rf = Number((trFromCur === 'USD' ? '1' : trRateFromPerUsd) || 0);
    const rt = Number((trToCur === 'USD' ? '1' : trRateToPerUsd) || 0);
    if (rf <= 0 || rt <= 0) {
      return {
        from: netFrom,
        to: 0,
        currencyFrom: trFromAcc.currency_code,
        currencyTo: trToAcc.currency_code,
        feeOut,
        feeIn,
        totalFromOut,
      };
    }

    const usd = netFrom / rf;
    const toAmt = usd * rt;
    return {
      from: netFrom,
      to: toAmt,
      currencyFrom: trFromAcc.currency_code,
      currencyTo: trToAcc.currency_code,
      usd,
      feeOut,
      feeIn,
      totalFromOut,
    };
  }, [trAmount, trFeeEnabled, trFeeAmount, trFeeMode, trFromAcc, trToAcc, isFxTransfer, trRateFromPerUsd, trRateToPerUsd]);

  function openTransfer() {
    resetOps();
    setTransferOpen(true);
  }

  function openDeposit() {
    resetOps();
    setDepositOpen(true);
  }

  function openWithdraw() {
    resetOps();
    setWithdrawOpen(true);
  }

  async function submitTransfer() {
    // Client-side validation to avoid confusing results
    const fromId = Number(trFromId);
    const toId = Number(trToId);
    const amount = Number(trAmount);
    const feeAmtRaw = Number(trFeeAmount || 0);
    const feeOn = trFeeEnabled || feeAmtRaw > 0;
    const feeAmt = feeOn ? feeAmtRaw : 0;

    if (!fromId || !toId) {
      setOpError('اختر صندوق الإرسال وصندوق الاستلام.');
      return;
    }
    if (fromId === toId) {
      setOpError('لا يمكن التحويل إلى نفس الصندوق.');
      return;
    }
    if (!(amount > 0)) {
      setOpError('أدخل مبلغاً صحيحاً للتحويل.');
      return;
    }
    if (feeOn) {
      if (!(feeAmt > 0)) {
        setOpError('أدخل مبلغ عمولة صحيح.');
        return;
      }
      if (trFeeMode === 'deduct' && feeAmt >= amount) {
        setOpError('لا يمكن أن تكون العمولة أكبر أو مساوية لمبلغ التحويل عند اختيار (مخصومة من المبلغ).');
        return;
      }
    }

    let rf = 0;
    let rt = 0;
    if (isFxTransfer) {
      rf = trFromCur === 'USD' ? 1 : Number(trRateFromPerUsd);
      rt = trToCur === 'USD' ? 1 : Number(trRateToPerUsd);

      if (trFromCur !== 'USD' && !(rf > 0)) {
        setOpError(`أدخل سعر ${trFromCur} مقابل 1 USD بشكل صحيح.`);
        return;
      }
      if (trToCur !== 'USD' && !(rt > 0)) {
        setOpError(`أدخل سعر ${trToCur} مقابل 1 USD بشكل صحيح.`);
        return;
      }
    }

    setOpSaving(true);
    setOpError(null);
    try {
      const payload: any = {
        from_account_id: fromId,
        to_account_id: toId,
        amount,
        happened_at: trDate,
        note: trNote || null,
        fee_enabled: feeOn,
        fee_mode: trFeeMode,
        fee_amount: feeOn ? feeAmt : 0,
      };

      if (isFxTransfer) {
        payload.rate_from_per_usd = rf;
        payload.rate_to_per_usd = rt;
      }

      if (feeOn && trFeeMode === 'income') {
        payload.fee_income_account_id = Number(trFeeIncomeAccountId || String(fromId));
      }

      await api.post('/accounts/transfer', payload);
      setTransferOpen(false);
      // refresh report
      await loadReport();
    } catch (e: any) {
      setOpError(e?.response?.data?.error || 'تعذر تنفيذ التحويل');
    } finally {
      setOpSaving(false);
    }
  }

  async function submitDeposit() {
    setOpSaving(true);
    setOpError(null);
    try {
      await api.post(`/accounts/${Number(adjAccountId)}/deposit`, {
        amount: Number(adjAmount),
        reason: adjReason || 'إضافة رصيد',
        note: adjNote || null,
        happened_at: adjDate,
      });
      setDepositOpen(false);
      await loadReport();
    } catch (e: any) {
      setOpError(e?.response?.data?.error || 'تعذر إضافة الرصيد');
    } finally {
      setOpSaving(false);
    }
  }

  async function submitWithdraw() {
    setOpSaving(true);
    setOpError(null);
    try {
      await api.post(`/accounts/${Number(adjAccountId)}/withdraw`, {
        amount: Number(adjAmount),
        reason: adjReason || 'سحب رصيد',
        note: adjNote || null,
        happened_at: adjDate,
      });
      setWithdrawOpen(false);
      await loadReport();
    } catch (e: any) {
      setOpError(e?.response?.data?.error || 'تعذر سحب الرصيد');
    } finally {
      setOpSaving(false);
    }
  }

  useEffect(() => {
    loadMeta();
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode === 'manage') loadManage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const currencyCards = useMemo(() => {
    const order = (currenciesMeta.length ? currenciesMeta.map((c) => c.code) : ['USD', 'SYP', 'AED']);

    // Prefer server-provided summary. If missing (older backend), derive from movements.
    const serverRows = report?.currencySummary || (report as any)?.currencies || [];

    let rows: CashReportCurrencySummary[] = [];

    if (Array.isArray(serverRows) && serverRows.length) {
      // normalize possible legacy shape
      rows = serverRows.map((r: any) => ({
        currency_code: r.currency_code || r.code || r.currency,
        opening: Number(r.opening || 0),
        in: Number(r.in || r.in_sum || 0),
        out: Number(r.out || r.out_sum || 0),
        closing: Number(r.closing || 0),
      }));
    } else {
      const byCur: Record<string, CashReportCurrencySummary> = {};
      for (const m of report?.movements || []) {
        const c = m.currency_code;
        if (!byCur[c]) byCur[c] = { currency_code: c, opening: 0, in: 0, out: 0, closing: 0 };
        if (m.direction === 'in') byCur[c].in += Number(m.amount);
        if (m.direction === 'out') byCur[c].out += Number(m.amount);
      }
      rows = Object.values(byCur).map((r) => ({ ...r, closing: r.opening + r.in - r.out }));
    }

    return rows
      .slice()
      .sort((a, b) => {
        const ai = order.indexOf(a.currency_code);
        const bi = order.indexOf(b.currency_code);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
  }, [report, currenciesMeta]);

  const derivedAccountsSummary = useMemo<CashReportAccountSummary[]>(() => {
    const serverRows = report?.accountsSummary || (report as any)?.accountsSummary;
    if (Array.isArray(serverRows) && serverRows.length) return serverRows;

    // Legacy backend could return `accounts` as flat rows
    const legacyAccRows = (report as any)?.accounts;
    if (Array.isArray(legacyAccRows) && legacyAccRows.length) {
      return legacyAccRows.map((r: any) => ({
        account: {
          id: r.account_id,
          name: r.account_name,
          type: r.account_type,
          currency_code: r.currency_code,
          is_active: 1,
        },
        opening: Number(r.opening || 0),
        in: Number(r.in || 0),
        out: Number(r.out || 0),
        closing: Number(r.closing || 0),
      }));
    }

    // Derive from movements (opening=0 for period-only view)
    const byAcc: Record<number, CashReportAccountSummary> = {};
    for (const m of report?.movements || []) {
      const id = m.account_id;
      if (!byAcc[id]) {
        const meta = metaAccounts.find((a) => a.id === id);
        byAcc[id] = {
          account:
            meta ||
            ({
              id,
              name: m.account_name,
              type: (String(m.account_type || 'cash').toLowerCase() as any),
              currency_code: (m.currency_code as any),
              is_active: 1 as any,
            } as Account),
          opening: 0,
          in: 0,
          out: 0,
          closing: 0,
        };
      }
      if (m.direction === 'in') byAcc[id].in += Number(m.amount);
      if (m.direction === 'out') byAcc[id].out += Number(m.amount);
    }
    const rows = Object.values(byAcc).map((r) => ({ ...r, closing: r.opening + r.in - r.out }));

    // Keep stable order
    rows.sort((a, b) => a.account.id - b.account.id);
    return rows;
  }, [report, metaAccounts]);


  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-black">{mode === 'report' ? 'تقرير العملات والصناديق' : 'إدارة الحسابات والصناديق'}</div>
          <div className="text-xs text-slate-400">
            {mode === 'report'
              ? 'USD / SYP / AED — كشف يومي وشهري (حركات مالية حقيقية)'
              : 'إضافة / تعديل / تعطيل — صلاحيات محاسب فقط'}
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              variant={mode === 'report' ? 'primary' : 'secondary'}
              onClick={() => setMode('report')}
            >
              التقرير
            </Button>
            <Button
              variant={mode === 'manage' ? 'primary' : 'secondary'}
              onClick={() => setMode('manage')}
            >
              إدارة الصناديق
            </Button>
          </div>
        )}
      </div>


      {mode === 'manage' ? (
        <>
          <Card className="mt-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-black">إدارة الصناديق — حركات داخلية</div>
                <div className="text-xs text-slate-400">
                  تحويل بين صندوقين (نفس العملة أو عملتين مختلفتين) + إضافة رصيد + سحب رصيد.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={openTransfer}>تحويل بين صناديق</Button>
                <Button variant="secondary" onClick={openDeposit}>إضافة رصيد</Button>
                <Button variant="secondary" onClick={openWithdraw}>سحب رصيد</Button>
              </div>
            </div>

            {opError && (
              <div className="mt-4 rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200">{opError}</div>
            )}

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-3">
                <div className="text-xs text-slate-500">ملاحظة</div>
                <div className="mt-1 text-sm text-slate-200">
                  التحويل بعملتين مختلفتين يحتاج إدخال سعر العملية: <span className="font-black">كم تساوي العملة مقابل 1 USD</span>.
                </div>
              </div>
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-3">
                <div className="text-xs text-slate-500">العمولة</div>
                <div className="mt-1 text-sm text-slate-200">
                  يمكن تسجيل عمولة <span className="font-black">علينا</span> (منفصلة أو مخصومة) أو عمولة <span className="font-black">لنا</span> كربح.
                </div>
              </div>
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-3">
                <div className="text-xs text-slate-500">الأمان</div>
                <div className="mt-1 text-sm text-slate-200">هذه العمليات متاحة فقط للمحاسبة / المدير.</div>
              </div>
            </div>
          </Card>

          {/* Transfer Modal */}
          <Modal open={transferOpen} title="تحويل بين صناديق" onClose={() => setTransferOpen(false)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">من صندوق</div>
                <Select value={trFromId} onChange={(e) => setTrFromId(e.target.value)}>
                  <option value="">اختر…</option>
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.name} ({a.currency_code})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">إلى صندوق</div>
                <Select value={trToId} onChange={(e) => setTrToId(e.target.value)}>
                  <option value="">اختر…</option>
                  {activeAccounts
                    .filter((a) => String(a.id) !== trFromId)
                    .map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {a.name} ({a.currency_code})
                      </option>
                    ))}
                </Select>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">المبلغ (عملة صندوق الإرسال)</div>
                <Input type="number" value={trAmount} onChange={(e) => setTrAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">تاريخ العملية</div>
                <Input type="date" value={trDate} onChange={(e) => setTrDate(e.target.value)} />
              </div>

              {isFxTransfer && (
                <>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">سعر {trFromAcc?.currency_code} مقابل 1 USD</div>
                    {needsFromRate ? (
                      <Input
                        type="number"
                        value={trRateFromPerUsd}
                        onChange={(e) => setTrRateFromPerUsd(e.target.value)}
                        placeholder={perUsdHint(trFromAcc?.currency_code || '') ? `مثال: ${perUsdHint(trFromAcc?.currency_code || '')}` : '0'}
                      />
                    ) : (
                      <Input type="number" value="1" disabled />
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">سعر {trToAcc?.currency_code} مقابل 1 USD</div>
                    {needsToRate ? (
                      <Input
                        type="number"
                        value={trRateToPerUsd}
                        onChange={(e) => setTrRateToPerUsd(e.target.value)}
                        placeholder={perUsdHint(trToAcc?.currency_code || '') ? `مثال: ${perUsdHint(trToAcc?.currency_code || '')}` : '0'}
                      />
                    ) : (
                      <Input type="number" value="1" disabled />
                    )}
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={trFeeEnabled}
                    onChange={(e) => { const on = e.target.checked; setTrFeeEnabled(on); if (!on) { setTrFeeAmount(''); setTrFeeMode('separate'); setTrFeeIncomeAccountId(''); } }}
                  />
                  <div className="text-sm">تفعيل عمولة تحويل</div>
                </div>
              </div>

              {trFeeEnabled && (
                <>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">نوع العمولة</div>
                    <Select value={trFeeMode} onChange={(e) => setTrFeeMode(e.target.value as any)}>
                      <option value="separate">مدفوعة منفصلة (علينا)</option>
                      <option value="deduct">مخصومة من المبلغ</option>
                      <option value="income">عمولة لنا (ربح)</option>
                    </Select>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">مبلغ العمولة</div>
                    <Input type="number" value={trFeeAmount} onChange={(e) => { const v = e.target.value; setTrFeeAmount(v); if (Number(v || 0) > 0 && !trFeeEnabled) setTrFeeEnabled(true); }} placeholder="0" />
                  </div>

                  {trFeeMode === 'income' && (
                    <div className="md:col-span-2">
                      <div className="text-xs text-slate-400 mb-1">حساب استلام العمولة</div>
                      <Select
                        value={trFeeIncomeAccountId || trFromId}
                        onChange={(e) => setTrFeeIncomeAccountId(e.target.value)}
                      >
                        {(activeAccounts
                          .filter((a) => !trFromAcc || String(a.currency_code).toUpperCase() === trFromCur)
                          .map((a) => (
                            <option key={a.id} value={String(a.id)}>
                              {a.name} ({a.currency_code})
                            </option>
                          )))}
                      </Select>
                      <div className="mt-1 text-[11px] text-slate-500">
                        عند اختيار "عمولة لنا" سيتم تسجيل حركة <span className="font-black">داخل</span> كربح.
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="md:col-span-2">
                <div className="text-xs text-slate-400 mb-1">ملاحظة (اختياري)</div>
                <Input value={trNote} onChange={(e) => setTrNote(e.target.value)} placeholder="مثال: نقل رصيد لبنك" />
              </div>
            </div>

            {transferPreview && (
              <div className="mt-4 rounded-2xl border border-slate-700/60 bg-slate-900/30 p-3 text-sm">
                <div className="font-black">ملخص سريع</div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-2">
                    <div className="text-xs text-slate-500">إجمالي الخارج من صندوق الإرسال</div>
                    <div className="font-black">{fmtMoney((transferPreview as any).totalFromOut || transferPreview.from, transferPreview.currencyFrom)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-2">
                    <div className="text-xs text-slate-500">صافي المستلم</div>
                    <div className="font-black">{fmtMoney(transferPreview.to, transferPreview.currencyTo)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-2">
                    <div className="text-xs text-slate-500">القيمة بالدولار</div>
                    <div className="font-black">{fmtMoney(transferPreview.usd || 0, 'USD')}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-2">
                    <div className="text-xs text-slate-500">العمولة</div>
                    {(transferPreview as any).feeIn > 0 ? (
                      <div className="font-black">+ {fmtMoney((transferPreview as any).feeIn, transferPreview.currencyFrom)}</div>
                    ) : (transferPreview as any).feeOut > 0 ? (
                      <div className="font-black">- {fmtMoney((transferPreview as any).feeOut, transferPreview.currencyFrom)}</div>
                    ) : (
                      <div className="font-black">—</div>
                    )}
                  </div>
                </div>

                {(transferPreview as any).feeIn > 0 && (
                  <div className="mt-2 text-[11px] text-slate-500">
                    تم اختيار <span className="font-black">عمولة لنا</span> — سيتم تسجيلها كحركة <span className="font-black">داخل</span>.
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setTransferOpen(false)}>إلغاء</Button>
              <Button onClick={submitTransfer} loading={opSaving}>تنفيذ</Button>
            </div>
          </Modal>

          {/* Deposit Modal */}
          <Modal open={depositOpen} title="إضافة رصيد" onClose={() => setDepositOpen(false)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">الصندوق</div>
                <Select value={adjAccountId} onChange={(e) => setAdjAccountId(e.target.value)}>
                  <option value="">اختر…</option>
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.name} ({a.currency_code})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">المبلغ</div>
                <Input type="number" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">السبب</div>
                <Input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="مثال: تغذية صندوق" />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">التاريخ</div>
                <Input type="date" value={adjDate} onChange={(e) => setAdjDate(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-slate-400 mb-1">ملاحظة (اختياري)</div>
                <Input value={adjNote} onChange={(e) => setAdjNote(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setDepositOpen(false)}>إلغاء</Button>
              <Button onClick={submitDeposit} loading={opSaving}>حفظ</Button>
            </div>
          </Modal>

          {/* Withdraw Modal */}
          <Modal open={withdrawOpen} title="سحب رصيد" onClose={() => setWithdrawOpen(false)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">الصندوق</div>
                <Select value={adjAccountId} onChange={(e) => setAdjAccountId(e.target.value)}>
                  <option value="">اختر…</option>
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.name} ({a.currency_code})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">المبلغ</div>
                <Input type="number" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">السبب</div>
                <Input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="مثال: سحب مصروف" />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">التاريخ</div>
                <Input type="date" value={adjDate} onChange={(e) => setAdjDate(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-slate-400 mb-1">ملاحظة (اختياري)</div>
                <Input value={adjNote} onChange={(e) => setAdjNote(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setWithdrawOpen(false)}>إلغاء</Button>
              <Button onClick={submitWithdraw} loading={opSaving}>حفظ</Button>
            </div>
          </Modal>

          <Card className="mt-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-black">الحسابات / الصناديق</div>
                <div className="text-xs text-slate-400">إضافة/تعديل/تعطيل. تعطيل الحساب يمنع استخدامه في حركات جديدة، لكن يبقي السجل محفوظ.</div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={openAddModal}>إضافة حساب</Button>
                <Button variant="secondary" onClick={loadManage} loading={manageLoading}>تحديث</Button>
              </div>
            </div>

            {manageError && (
              <div className="mt-4 rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200">{manageError}</div>
            )}

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900/40 text-slate-300">
                  <tr>
                    <th className="text-right px-4 py-3">#</th>
                    <th className="text-right px-4 py-3">الاسم</th>
                    <th className="text-right px-4 py-3">النوع</th>
                    <th className="text-right px-4 py-3">العملة</th>
                    <th className="text-right px-4 py-3">الحالة</th>
                    <th className="text-right px-4 py-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {manageAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-5 text-slate-400">{manageLoading ? 'جاري التحميل…' : 'لا توجد حسابات'}</td>
                    </tr>
                  ) : (
                    manageAccounts.map((a) => (
                      <tr key={a.id} className="border-t border-slate-800/60">
                        <td className="px-4 py-3 text-slate-400">{a.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-black">{a.name}</div>
                          <div className="text-xs text-slate-500">{a.type.toUpperCase()}</div>
                        </td>
                        <td className="px-4 py-3">{a.type.toUpperCase()}</td>
                        <td className="px-4 py-3"><Badge tone="gray">{a.currency_code}</Badge></td>
                        <td className="px-4 py-3">
                          {a.is_active ? <Badge tone="green">نشط</Badge> : <Badge tone="gray">معطّل</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => openEditModal(a)}>تعديل</Button>
                            <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => openSetBalance(a)}>تعيين الرصيد</Button>
                            <Button
                              variant={a.is_active ? 'danger' : 'primary'}
                              className="px-3 py-1 text-xs"
                              onClick={() => toggleAccount(a.id)}
                              loading={saving}
                            >
                              {a.is_active ? 'تعطيل' : 'تفعيل'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Modal open={addOpen} title="إضافة حساب جديد" onClose={() => setAddOpen(false)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">اسم الحساب</div>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="مثال: Cash USD" />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">نوع الحساب</div>
                <Select value={formType} onChange={(e) => setFormType(e.target.value as any)}>
                  <option value="cash">كاش</option>
                  <option value="bank">بنك</option>
                  <option value="wallet">محفظة</option>
                </Select>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">العملة</div>
                <Select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value as any)}>
                  {(currenciesMeta.length ? currenciesMeta.map((c) => c.code) : ['USD', 'SYP', 'AED']).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">الرصيد الابتدائي (اختياري)</div>
                <Input
                  type="number"
                  value={formOpeningBalance}
                  onChange={(e) => setFormOpeningBalance(e.target.value)}
                  placeholder="0"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setAddOpen(false)}>إلغاء</Button>
              <Button onClick={createAccount} loading={saving}>حفظ</Button>
            </div>
          </Modal>

          {/* Set Balance Modal */}
          <Modal open={setBalOpen} title={`تعيين رصيد: ${setBalAccount?.name || ''}`} onClose={() => setSetBalOpen(false)} width="max-w-sm">
            <div className="space-y-4">
              {setBalError && (
                <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{setBalError}</div>
              )}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                <span className="text-sm text-slate-400">الرصيد الحالي</span>
                <span className="font-black text-white">
                  {setBalCurrent === null ? '…' : `${setBalCurrent.toLocaleString()} ${setBalAccount?.currency_code || ''}`}
                </span>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">الرصيد المطلوب</div>
                <Input
                  type="number"
                  value={setBalTarget}
                  onChange={(e) => setSetBalTarget(e.target.value)}
                  placeholder="0"
                  dir="ltr"
                />
                {setBalCurrent !== null && setBalTarget !== '' && Number(setBalTarget) !== setBalCurrent && (
                  <p className={`text-xs mt-1 ${Number(setBalTarget) > setBalCurrent ? 'text-green-400' : 'text-red-400'}`}>
                    {Number(setBalTarget) > setBalCurrent ? '▲ إضافة' : '▼ خصم'} {Math.abs(Number(setBalTarget) - setBalCurrent).toLocaleString()} {setBalAccount?.currency_code}
                  </p>
                )}
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">سبب التعديل (اختياري)</div>
                <Input value={setBalNote} onChange={(e) => setSetBalNote(e.target.value)} placeholder="مثال: تصحيح رصيد افتتاحي" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
                <Button variant="secondary" onClick={() => setSetBalOpen(false)}>إلغاء</Button>
                <Button onClick={submitSetBalance} loading={setBalSaving}>تطبيق</Button>
              </div>
            </div>
          </Modal>

          <Modal open={editOpen} title="تعديل الحساب" onClose={() => setEditOpen(false)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">اسم الحساب</div>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">نوع الحساب</div>
                <Select value={formType} onChange={(e) => setFormType(e.target.value as any)}>
                  <option value="cash">كاش</option>
                  <option value="bank">بنك</option>
                  <option value="wallet">محفظة</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-slate-400 mb-1">العملة</div>
                <Select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value as any)}>
                  {(currenciesMeta.length ? currenciesMeta.map((c) => c.code) : ['USD', 'SYP', 'AED']).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditOpen(false)}>إلغاء</Button>
              <Button onClick={updateAccount} loading={saving}>حفظ</Button>
            </div>
          </Modal>
        </>
      ) : (
        <>
          <Card className="mt-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="font-black">فلاتر التقرير</div>
            <div className="text-xs text-slate-400">اختر فترة + عملة + صندوق + نوع حركة</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => {
                setFrom(todayYmd());
                setTo(todayYmd());
                setTimeout(loadReport, 50);
              }}
            >
              اليوم
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setFrom(firstDayOfMonthYmd());
                setTo(todayYmd());
                setTimeout(loadReport, 50);
              }}
            >
              هذا الشهر
            </Button>
            <Button onClick={loadReport}>تحديث</Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div>
            <div className="text-xs text-slate-400 mb-1">من</div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">إلى</div>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">العملة</div>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="ALL">كل العملات</option>
              <option value="USD">USD</option>
              <option value="SYP">SYP</option>
              <option value="AED">AED</option>
            </Select>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">الصندوق/الحساب</div>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">كل الحسابات</option>
              {metaAccounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name} ({a.currency_code})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">نوع الحركة</div>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">كل الأنواع</option>
              <option value="collection">تحصيل</option>
              <option value="vendor_payment">سداد مصدر</option>
              <option value="office_settlement">تسوية مكتب</option>
              <option value="expense">مصروف</option>
              <option value="refund">مرتجع</option>
              <option value="transfer_fee">عمولة تحويل</option>
              <option value="transfer_fee_income">عمولة تحويل (لنا)</option>
              <option value="transfer">تحويل بين الصناديق</option>
              <option value="airline_deposit">إيداع شركة طيران</option>
              <option value="airline_deposit_fee">عمولة تحويل (شركة طيران)</option>
              <option value="cash_in">إضافة رصيد</option>
              <option value="cash_out">سحب رصيد</option>
            </Select>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200">
            {error}
          </div>
        )}
      </Card>

      {/* Currency summary cards */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {(currencyCards.length ? currencyCards : [{ currency_code: 'USD', opening: 0, in: 0, out: 0, closing: 0 }]).map((c) => (
          <Card key={c.currency_code}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-slate-400">العملة</div>
                <div className="mt-1 text-base font-black">{c.currency_code}</div>
                <div className="text-[11px] text-slate-500">رصيد كل الصناديق لهذه العملة ضمن الفترة</div>
              </div>
              <Badge tone="gray">{from} → {to}</Badge>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-2">
                <div className="text-[10px] text-slate-500">Opening</div>
                <div className="font-black">{fmtMoney(c.opening, c.currency_code)}</div>
              </div>
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-2">
                <div className="text-[10px] text-slate-500">Closing</div>
                <div className="font-black">{fmtMoney(c.closing, c.currency_code)}</div>
              </div>
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-2">
                <div className="text-[10px] text-slate-500">IN</div>
                <div className="font-black">{fmtMoney(c.in, c.currency_code)}</div>
              </div>
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-2">
                <div className="text-[10px] text-slate-500">OUT</div>
                <div className="font-black">{fmtMoney(c.out, c.currency_code)}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Accounts summary */}
      <Card className="mt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-black">كشف الصناديق (لكل حساب)</div>
            <div className="text-xs text-slate-400">Opening / In / Out / Closing لكل صندوق بعملته الأصلية</div>
          </div>
          <div className="text-xs text-slate-400">عدد الحركات: <span className="font-black text-slate-200">{report?.movements?.length || 0}</span></div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/40 text-slate-300">
              <tr>
                <th className="text-right px-4 py-3">الحساب</th>
                <th className="text-right px-4 py-3">Opening</th>
                <th className="text-right px-4 py-3">IN</th>
                <th className="text-right px-4 py-3">OUT</th>
                <th className="text-right px-4 py-3">Closing</th>
              </tr>
            </thead>
            <tbody>
              {derivedAccountsSummary.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-5 text-slate-400">
                    {loading ? 'جاري التحميل…' : 'لا يوجد بيانات ضمن الفترة.'}
                  </td>
                </tr>
              ) : (
                derivedAccountsSummary.map((r) => (
                  <tr key={r.account.id} className="border-t border-slate-800/60">
                    <td className="px-4 py-3">
                      <div className="font-black">{r.account.name}</div>
                      <div className="text-xs text-slate-500">{r.account.type.toUpperCase()} • {r.account.currency_code} • #{r.account.id}</div>
                    </td>
                    <td className="px-4 py-3 font-black">{fmtMoney(r.opening, r.account.currency_code)}</td>
                    <td className="px-4 py-3 font-black">{fmtMoney(r.in, r.account.currency_code)}</td>
                    <td className="px-4 py-3 font-black">{fmtMoney(r.out, r.account.currency_code)}</td>
                    <td className="px-4 py-3 font-black">{fmtMoney(r.closing, r.account.currency_code)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Movements ledger */}
      <Card className="mt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-black">كشف الحركات</div>
            <div className="text-xs text-slate-400">آخر 500 حركة ضمن الفترة</div>
          </div>
          <div className="text-xs text-slate-500">
            {report?.period ? `من ${fmtDate(report.period.from)} إلى ${fmtDate(report.period.to)}` : ''}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/40 text-slate-300">
              <tr>
                <th className="text-right px-4 py-3">التاريخ</th>
                <th className="text-right px-4 py-3">النوع</th>
                <th className="text-right px-4 py-3">الإيصال</th>
                <th className="text-right px-4 py-3">الحساب</th>
                <th className="text-right px-4 py-3">الطرف</th>
                <th className="text-right px-4 py-3">داخل</th>
                <th className="text-right px-4 py-3">خارج</th>
                <th className="text-right px-4 py-3">ملاحظة</th>
              </tr>
            </thead>
            <tbody>
              {(report?.movements || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-5 text-slate-400">
                    {loading ? 'جاري التحميل…' : 'لا توجد حركات ضمن الفترة.'}
                  </td>
                </tr>
              ) : (
                (report?.movements || []).map((m) => (
                  <tr key={m.id} className="border-t border-slate-800/60">
                    <td className="px-4 py-3 text-slate-300">{fmtDate(m.happened_at)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={categoryTone(m.category) as any}>{categoryLabel(m.category)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-200 font-bold">{m.receipt_no || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200 font-bold">{m.account_name}</div>
                      <div className="text-xs text-slate-500">{m.currency_code}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{m.party_name || '—'}</td>
                    <td className="px-4 py-3 font-black">{m.direction === 'in' ? fmtMoney(m.amount, m.currency_code) : '—'}</td>
                    <td className="px-4 py-3 font-black">{m.direction === 'out' ? fmtMoney(m.amount, m.currency_code) : '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{m.note || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
	      </Card>
	    </>
	  )}
	</div>
  );
}
