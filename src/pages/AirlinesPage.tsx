import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Power, RefreshCcw, Wallet, FileText, ArrowDownCircle, Printer, FileBarChart } from 'lucide-react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import type { AirlineCompany } from '../utils/types';
import { useAuth, hasAnyRole } from '../state/auth';

type CurrencyRow = { code: string; name: string; symbol?: string | null; is_active: 0 | 1 };

type FareMode = 'none' | 'next_deposit' | 'manual' | 'per_ticket_choice';

function normalizeFareMode(row: any): FareMode {
  const hasFare = Number(row?.has_fare_discount || 0) === 1;
  if (!hasFare) return 'none';
  const v = String(row?.fare_discount_settlement || '').toLowerCase();
  if (v === 'manual') return 'manual';
  if (v === 'next_deposit') return 'next_deposit';
  if (v === 'per_ticket_choice') return 'per_ticket_choice';
  // backward compatibility
  return 'next_deposit';
}

export function AirlinesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canSeeFinancial = hasAnyRole(user, 'admin', 'accounting', 'airline_admin');
  const canDoAccounting = hasAnyRole(user, 'admin', 'accounting');
  const canRequestTopup = hasAnyRole(user, 'airline_admin') && !canDoAccounting;

  const [items, setItems] = useState<AirlineCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);

  // Daily airlines report (print)
  const [dailyOpen, setDailyOpen] = useState(false);
  const [dailyExporting, setDailyExporting] = useState(false);
  const [dailyDate, setDailyDate] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [dailyMonth, setDailyMonth] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  });

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AirlineCompany | null>(null);

  // Deposit (airline cashbox)
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositSaving, setDepositSaving] = useState(false);
  const [depositFor, setDepositFor] = useState<AirlineCompany | null>(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositAccountId, setDepositAccountId] = useState<number | ''>('');
  const [depositNote, setDepositNote] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [depositFeeEnabled, setDepositFeeEnabled] = useState(false);
  const [depositFeeAmount, setDepositFeeAmount] = useState(0);

  // Withdraw from airline
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawSaving, setWithdrawSaving] = useState(false);
  const [withdrawFor, setWithdrawFor] = useState<AirlineCompany | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [withdrawAccountId, setWithdrawAccountId] = useState<number | ''>('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [withdrawFeeEnabled, setWithdrawFeeEnabled] = useState(false);
  const [withdrawFeeAmount, setWithdrawFeeAmount] = useState(0);

  // Top-up request (Ticket Manager)
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupSaving, setTopupSaving] = useState(false);
  const [topupFor, setTopupFor] = useState<AirlineCompany | null>(null);
  const [topupAmount, setTopupAmount] = useState(0);
  const [topupNote, setTopupNote] = useState('');

  const [form, setForm] = useState({
    name: '',
    currency_code: 'USD',
    usd_to_currency: 1,
    fare_mode: 'none' as FareMode,
    fare_discount_type: 'percent' as 'percent' | 'fixed',
    fare_discount_value: 0,
  });

  async function load() {
    setLoading(true);
    try {
      const [aRes, cRes] = await Promise.allSettled([api.get('/airlines'), api.get('/meta/currencies')]);

      // Airlines list
      if (aRes.status === 'fulfilled') {
        setItems(aRes.value.data.items || []);
      } else {
        console.warn('[AirlinesPage] Failed to load airlines:', aRes.reason);
        setItems([]);
      }

      // Currencies dropdown (must never be empty in the UI)
      if (cRes.status === 'fulfilled') {
        const curItems = cRes.value.data?.data || cRes.value.data?.items || [];
        const cleaned = (curItems || []).filter((x: any) => (x?.is_active ?? 1) != 0);
        setCurrencies(
          cleaned.length
            ? cleaned
            : [
                { code: 'USD', name: 'US Dollar', symbol: '$', is_active: 1 },
                { code: 'SYP', name: 'Syrian Pound', symbol: '£S', is_active: 1 },
                { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', is_active: 1 },
              ]
        );
      } else {
        console.warn('[AirlinesPage] Failed to load currencies:', cRes.reason);
        setCurrencies([
          { code: 'USD', name: 'US Dollar', symbol: '$', is_active: 1 },
          { code: 'SYP', name: 'Syrian Pound', symbol: '£S', is_active: 1 },
          { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', is_active: 1 },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function exportDailyReport() {
    if (!dailyDate) return;
    setDailyExporting(true);
    try {
      const qs = new URLSearchParams();
      qs.set('date', dailyDate);
      if (dailyMonth) qs.set('month', dailyMonth);
      const res = await api.get(`/reports/airlines-daily/export?${qs.toString()}`, { responseType: 'blob' } as any);
      const blob = res.data as Blob;
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      // clean up later
      setTimeout(() => {
        try {
          window.URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }, 60_000);
      setDailyOpen(false);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل إنشاء التقرير');
    } finally {
      setDailyExporting(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Auto-enable deposit fee if a fee amount is entered
  useEffect(() => {
    if (depositFeeAmount > 0 && !depositFeeEnabled) setDepositFeeEnabled(true);
  }, [depositFeeAmount, depositFeeEnabled]);

  // Auto-enable withdraw fee if a fee amount is entered
  useEffect(() => {
    if (withdrawFeeAmount > 0 && !withdrawFeeEnabled) setWithdrawFeeEnabled(true);
  }, [withdrawFeeAmount, withdrawFeeEnabled]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => x.name.toLowerCase().includes(s) || x.currency_code.toLowerCase().includes(s));
  }, [items, q]);

  function openCreate() {
    setEditing(null);
    setForm({
      name: '',
      currency_code: 'USD',
      usd_to_currency: 1,
      fare_mode: 'none',
      fare_discount_type: 'percent',
      fare_discount_value: 0,
    });
    setOpen(true);
  }

  function openEdit(row: AirlineCompany) {
    const fareMode = normalizeFareMode(row);
    setEditing(row);
    setForm({
      name: row.name,
      currency_code: row.currency_code,
      usd_to_currency: row.currency_code === 'USD' ? 1 : Number((row as any).buy_fx_rate_to_usd || 1),
      fare_mode: fareMode,
      fare_discount_type: fareMode === 'per_ticket_choice' ? 'percent' : row.fare_discount_type,
      fare_discount_value: Number(row.fare_discount_value || 0),
    });
    setOpen(true);
  }

  function openDeposit(row: AirlineCompany) {
    setDepositFor(row);
    setDepositAmount(0);
    setDepositAccountId('');
    setDepositNote('');
    setDepositFeeEnabled(false);
    setDepositFeeAmount(0);
    setDepositOpen(true);

    // Load accounts (cashboxes)
    (async () => {
      try {
        const res = await api.get('/meta/accounts');
        setAccounts(res.data.data || []);
      } catch (e) {
        console.error('Failed to load accounts:', e);
        setAccounts([]);
      }
    })();
  }

  function openWithdraw(row: AirlineCompany) {
    setWithdrawFor(row);
    setWithdrawAmount(0);
    setWithdrawAccountId('');
    setWithdrawNote('');
    setWithdrawFeeEnabled(false);
    setWithdrawFeeAmount(0);
    setWithdrawOpen(true);

    (async () => {
      try {
        const res = await api.get('/meta/accounts');
        setAccounts(res.data.data || []);
      } catch (e) {
        console.error('Failed to load accounts:', e);
        setAccounts([]);
      }
    })();
  }

  function openTopupRequest(row: AirlineCompany) {
    setTopupFor(row);
    setTopupAmount(0);
    setTopupNote('');
    setTopupOpen(true);
  }

  async function submitTopupRequest() {
    if (!topupFor) return;
    if (!(topupAmount > 0)) return;
    setTopupSaving(true);
    try {
      await api.post(`/airlines/${topupFor.id}/deposit-request`, {
        amount: Number(topupAmount),
        note: topupNote,
      });
      setTopupOpen(false);
      alert('تم إرسال الطلب للمحاسبة + المدير');
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل إرسال الطلب');
    } finally {
      setTopupSaving(false);
    }
  }

  async function submitDeposit() {
    if (!depositFor) return;
    if (!(depositAmount > 0)) return;
    if (!depositAccountId) {
      alert('الرجاء اختيار الصندوق');
      return;
    }
    if (depositFeeEnabled && !(Number(depositFeeAmount || 0) > 0)) {
      alert('الرجاء إدخال قيمة العمولة أو إلغاء تفعيلها');
      return;
    }
    setDepositSaving(true);
    try {
      await api.post(`/airlines/${depositFor.id}/deposit`, {
        amount: Number(depositAmount),
        account_id: Number(depositAccountId),
        note: depositNote,
        fee_enabled: depositFeeEnabled,
        fee_amount: Number(depositFeeAmount || 0),
      });
      setDepositOpen(false);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل الإيداع');
    } finally {
      setDepositSaving(false);
    }
  }

  async function submitWithdraw() {
    if (!withdrawFor) return;
    if (!(withdrawAmount > 0)) return;
    if (!withdrawAccountId) {
      alert('الرجاء اختيار الصندوق');
      return;
    }
    if (withdrawFeeEnabled && !(Number(withdrawFeeAmount || 0) > 0)) {
      alert('الرجاء إدخال قيمة العمولة أو إلغاء تفعيلها');
      return;
    }
    setWithdrawSaving(true);
    try {
      await api.post(`/airlines/${withdrawFor.id}/withdraw`, {
        amount: Number(withdrawAmount),
        account_id: Number(withdrawAccountId),
        note: withdrawNote,
        fee_enabled: withdrawFeeEnabled,
        fee_amount: Number(withdrawFeeAmount || 0),
      });
      setWithdrawOpen(false);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل السحب');
    } finally {
      setWithdrawSaving(false);
    }
  }

  async function save() {
    if (!form.name.trim()) return;
    if (form.currency_code !== 'USD' && !(Number(form.usd_to_currency) > 0)) {
      alert('الرجاء إدخال سعر صرف الشركة');
      return;
    }
    if (form.fare_mode !== 'none' && form.fare_mode !== 'per_ticket_choice' && form.fare_discount_type === 'percent' && !(Number(form.fare_discount_value) > 0)) {
      alert('الرجاء إدخال نسبة حسم الفير');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        currency_code: form.currency_code,
        usd_to_currency: form.currency_code === 'USD' ? 1 : Number(form.usd_to_currency || 1),

        has_fare_discount: form.fare_mode !== 'none',
        fare_discount_settlement: form.fare_mode, // none | next_deposit | manual | per_ticket_choice
        fare_discount_type: form.fare_mode === 'per_ticket_choice' ? 'per_ticket_choice' : form.fare_discount_type,
        fare_discount_value: (form.fare_mode === 'per_ticket_choice' || form.fare_discount_type === 'fixed') ? 0 : Number(form.fare_discount_value || 0),
      };

      if (editing) {
        const res = await api.put(`/airlines/${editing.id}`, payload);
        setItems((prev) => prev.map((x) => (x.id === editing.id ? res.data.item : x)));
      } else {
        const res = await api.post('/airlines', payload);
        setItems((prev) => [res.data.item, ...prev]);
      }
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: AirlineCompany) {
    await api.patch(`/airlines/${row.id}/toggle`);
    await load();
  }

  const fareModeLabel = (row: any) => {
    const m = normalizeFareMode(row);
    if (m === 'none') return 'بدون فير';
    if (m === 'next_deposit') return 'فير مع الإيداع القادم';
    if (m === 'per_ticket_choice') return 'فير حر (مبلغ/نسبة لكل تذكرة)';
    return 'فير يدوي';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">شركات الطيران</div>
          <div className="text-sm opacity-70">إدارة شركات الطيران (العملة + خصومات الفير + سعر صرف خاص بالشركة)</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw size={16} /> تحديث
          </Button>
          {canSeeFinancial ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDailyOpen(true)}
              title="طباعة تقرير شركات الطيران اليومي"
            >
              <Printer size={16} /> طباعة التقرير اليومي
            </Button>
          ) : null}
          {canSeeFinancial ? (
            <Button size="sm" onClick={openCreate}>
              <Plus size={16} /> إضافة شركة
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-2 p-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو العملة..." />
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left opacity-70">
              <tr className="border-b border-white/10">
                <th className="p-3">الاسم</th>
                <th className="p-3">العملة</th>
                <th className="p-3">سعر صرف الشركة (1$)</th>
                <th className="p-3">نوع الفير</th>
                <th className="p-3">الرصيد</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 w-[190px]">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canSeeFinancial) navigate(`/airlines/${row.id}`);
                  }}
                >
                  <td className="p-3 font-medium">{row.name}</td>
                  <td className="p-3">{row.currency_code}</td>
                  <td className="p-3">{row.currency_code === 'USD' ? '1' : Number((row as any).buy_fx_rate_to_usd || 1).toLocaleString('en-US')}</td>
                  <td className="p-3">
                    <div className="font-semibold">{fareModeLabel(row)}</div>
                    {Number(row.has_fare_discount) === 1 ? (
                      <div className="text-xs text-slate-400">
                        {row.fare_discount_type === 'percent' ? `${row.fare_discount_value}%` : 'ثابت (من التذكرة)'}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3">
                    {canSeeFinancial ? (
                      <div>
                        <div className="font-semibold">
                          {Number((row as any).balance_amount || 0).toLocaleString('en-US')} {row.currency_code}
                        </div>
                        {Number((row as any).open_fare_accrual_total || 0) > 0 ? (
                          <div className="text-xs text-slate-400">
                            خصومات معلقة: {Number((row as any).open_fare_accrual_total || 0).toLocaleString('en-US')} {row.currency_code}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-3">
                    {row.is_active ? <span className="badge badge-success">نشطة</span> : <span className="badge badge-muted">متوقفة</span>}
                  </td>
                  <td className="p-3">
                    {canSeeFinancial ? (
                      <div className="flex gap-2">
                        <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canSeeFinancial) navigate(`/airlines/${row.id}`);
                        }}
                        title="كشف حساب"
                      >
                        <FileText size={14} />
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/reports/airline/${row.id}`);
                        }}
                        title="تقرير كشف حساب"
                      >
                        <FileBarChart size={14} />
                      </Button>

                      {canDoAccounting && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeposit(row);
                        }}
                        title="إيداع (تغذية رصيد)"
                      >
                        <Wallet size={14} />
                      </Button>
                      )}

                      {canRequestTopup && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTopupRequest(row);
                          }}
                          title="طلب تغذية رصيد (إرسال للمحاسبة + المدير)"
                        >
                          <Wallet size={14} />
                        </Button>
                      )}

                      {canDoAccounting && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openWithdraw(row);
                        }}
                        title="سحب رصيد من الشركة"
                      >
                        <ArrowDownCircle size={14} />
                      </Button>
                      )}

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(row);
                        }}
                      >
                        <Pencil size={14} />
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(row);
                        }}
                        title="تفعيل/تعطيل"
                      >
                        <Power size={14} />
                      </Button>
                      </div>
                    ) : (
                      <span className="opacity-60">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="p-4 opacity-70" colSpan={7}>
                    لا يوجد شركات.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Daily Airlines Report (Print) */}
      <Modal open={dailyOpen} onClose={() => setDailyOpen(false)} title="طباعة تقرير شركات الطيران اليومي">
        <div className="space-y-3">
          <div>
            <div className="text-sm opacity-80 mb-1">التاريخ</div>
            <Input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
          </div>
          <div>
            <div className="text-sm opacity-80 mb-1">الشهر (للطباعة)</div>
            <Input type="month" value={dailyMonth} onChange={(e) => setDailyMonth(e.target.value)} />
            <div className="text-xs opacity-60 mt-1">يُستخدم فقط لعرض الشهر في رأس التقرير مثل النموذج المرفق.</div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDailyOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={exportDailyReport} disabled={dailyExporting || !dailyDate}>
              {dailyExporting ? '...' : (
                <>
                  <Printer size={16} /> طباعة
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create / Edit */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'تعديل شركة' : 'إضافة شركة'}>
        <div className="space-y-3">
          <div>
            <div className="text-sm opacity-80 mb-1">اسم الشركة</div>
            <Input value={form.name} onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-sm opacity-80 mb-1">عملة الشركة</div>
              <Select
                value={form.currency_code}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((x) => ({ ...x, currency_code: v, usd_to_currency: v === 'USD' ? 1 : x.usd_to_currency }));
                }}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <div className="text-sm opacity-80 mb-1">سعر صرف الشركة (1 دولار = كم {form.currency_code})</div>
              <Input
                type="number"
                step="0.000001"
                disabled={form.currency_code === 'USD'}
                value={form.currency_code === 'USD' ? 1 : form.usd_to_currency}
                onChange={(e) => setForm((x) => ({ ...x, usd_to_currency: Number(e.target.value) }))}
              />
              <div className="text-xs opacity-60 mt-1">عند تعديل السعر، لا يؤثر على التذاكر السابقة (يُحفظ سعر الصرف داخل كل تذكرة).</div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-3">
            <div className="text-sm font-semibold mb-2">نوع خصومات الفير</div>

            <div>
              <div className="text-sm opacity-80 mb-1">تصنيف الشركة</div>
              <Select
                value={form.fare_mode}
                onChange={(e) => {
                  const v = e.target.value as FareMode;
                  setForm((x) => ({
                    ...x,
                    fare_mode: v,
                    fare_discount_value: v === 'none' ? 0 : x.fare_discount_value,
                  }));
                }}
              >
                <option value="none">1) لا يوجد فير</option>
                <option value="next_deposit">2) لها فير ويُضاف مع الإيداع القادم</option>
                <option value="manual">3) لها فير (زر تنزيل الخصومات كرصيد)</option>
                <option value="per_ticket_choice">4) فير حر (المستخدم يختار مبلغ ثابت أو نسبة لكل تذكرة)</option>
              </Select>
              <div className="text-xs opacity-60 mt-1">
                ملاحظة: كل الشركات تُخصم منها قيمة <b>سعر الشراء</b> عند الموافقة على التذكرة. الفير هو ربح إضافي (خصم) قد يتجمع ويُضاف لاحقاً.
              </div>
            </div>

            {form.fare_mode !== 'none' && form.fare_mode !== 'per_ticket_choice' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <div className="text-sm opacity-80 mb-1">نوع الحسم</div>
                  <Select value={form.fare_discount_type} onChange={(e) => setForm((x) => ({ ...x, fare_discount_type: e.target.value as any }))}>
                    <option value="percent">نسبة من قيمة الفير</option>
                    <option value="fixed">مبلغ ثابت</option>
                  </Select>
                </div>

                <div>
                  {form.fare_discount_type === 'percent' ? (
                    <>
                      <div className="text-sm opacity-80 mb-1">النسبة %</div>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.fare_discount_value}
                        onChange={(e) => setForm((x) => ({ ...x, fare_discount_value: Number(e.target.value) }))}
                      />
                      <div className="text-xs opacity-60 mt-1">سيظهر في فورم بيع التذكرة حقل "قيمة الفير" لتطبيق النسبة عليه.</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm opacity-80 mb-1">مبلغ ثابت</div>
                      <div className="text-sm opacity-70">المبلغ الثابت يتم إدخاله داخل فورم بيع التذكرة (لكل تذكرة)، وليس هنا.</div>
                    </>
                  )}
                </div>
              </div>
            )}
            {form.fare_mode === 'per_ticket_choice' && (
              <div className="mt-3 text-xs text-slate-400">
                في هذا النوع، يختار المستخدم لكل تذكرة: إما مبلغ ثابت أو نسبة% (مع إدخال قيمة الفير الأساسية). لا توجد قيمة ثابتة على مستوى الشركة.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? '...' : 'حفظ'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deposit */}
      <Modal open={depositOpen} title={depositFor ? `إيداع: ${depositFor.name}` : 'إيداع'} onClose={() => setDepositOpen(false)}>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <div className="text-sm opacity-80 mb-1">الصندوق (سيُخصم منه)</div>
            <Select value={String(depositAccountId)} onChange={(e) => setDepositAccountId(Number(e.target.value) || '')}>
              <option value="">اختر الصندوق...</option>
              {accounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency_code})
                </option>
              ))}
            </Select>
            {accounts.length === 0 && <div className="mt-1 text-xs text-amber-400">لا توجد صناديق متاحة</div>}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={depositFeeEnabled}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setDepositFeeEnabled(on);
                    if (!on) setDepositFeeAmount(0);
                  }}
                />
                <span className="text-sm">يوجد عمولة تحويل؟</span>
              </div>
              <div className="text-xs text-slate-500">إذا كتبت قيمة عمولة سيتم تفعيلها تلقائياً</div>
            </div>

            <div className="mt-3">
              <div className="text-sm opacity-80 mb-1">
                قيمة العمولة ({(accounts.find((a: any) => a.id === Number(depositAccountId))?.currency_code) || 'عملة الصندوق'})
              </div>
              <Input type="number" step="0.01" value={depositFeeAmount} onChange={(e) => setDepositFeeAmount(Number(e.target.value))} placeholder="مثال: 5" />
              <div className="text-xs text-slate-500 mt-1">سيتم خصم العمولة من نفس الصندوق بشكل حركة منفصلة.</div>
            </div>
          </div>

          <div>
            <div className="text-sm opacity-80 mb-1">المبلغ ({depositFor?.currency_code || ''})</div>
            <Input type="number" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(Number(e.target.value))} placeholder="مثال: 10000" />
            <div className="text-xs text-slate-500 mt-1">سيتم التحويل التلقائي بين العملات إذا كانت عملة الصندوق مختلفة عن عملة الشركة</div>
          </div>

          <div>
            <div className="text-sm opacity-80 mb-1">ملاحظة (اختياري)</div>
            <Input value={depositNote} onChange={(e) => setDepositNote(e.target.value)} placeholder="مثال: إيداع رصيد شهر فبراير" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDepositOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={submitDeposit} disabled={depositSaving || !(depositAmount > 0) || !depositAccountId}>
              {depositSaving ? 'جارٍ الحفظ...' : 'إيداع'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Withdraw */}
      <Modal open={withdrawOpen} title={withdrawFor ? `سحب رصيد: ${withdrawFor.name}` : 'سحب رصيد'} onClose={() => setWithdrawOpen(false)}>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <div className="text-sm opacity-80 mb-1">الصندوق (سيُضاف له)</div>
            <Select value={String(withdrawAccountId)} onChange={(e) => setWithdrawAccountId(Number(e.target.value) || '')}>
              <option value="">اختر الصندوق...</option>
              {accounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency_code})
                </option>
              ))}
            </Select>
            {accounts.length === 0 && <div className="mt-1 text-xs text-amber-400">لا توجد صناديق متاحة</div>}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={withdrawFeeEnabled}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setWithdrawFeeEnabled(on);
                    if (!on) setWithdrawFeeAmount(0);
                  }}
                />
                <span className="text-sm">يوجد عمولة تحويل؟</span>
              </div>
              <div className="text-xs text-slate-500">إذا كتبت قيمة عمولة سيتم تفعيلها تلقائياً</div>
            </div>

            <div className="mt-3">
              <div className="text-sm opacity-80 mb-1">
                قيمة العمولة ({(accounts.find((a: any) => a.id === Number(withdrawAccountId))?.currency_code) || 'عملة الصندوق'})
              </div>
              <Input type="number" step="0.01" value={withdrawFeeAmount} onChange={(e) => setWithdrawFeeAmount(Number(e.target.value))} placeholder="مثال: 5" />
              <div className="text-xs text-slate-500 mt-1">سيتم خصم العمولة من نفس الصندوق بشكل حركة منفصلة.</div>
            </div>
          </div>

          <div>
            <div className="text-sm opacity-80 mb-1">المبلغ ({withdrawFor?.currency_code || ''})</div>
            <Input type="number" step="0.01" value={withdrawAmount} onChange={(e) => setWithdrawAmount(Number(e.target.value))} placeholder="مثال: 10000" />
            <div className="text-xs text-slate-500 mt-1">سيتم التحويل التلقائي بين العملات إذا كانت عملة الصندوق مختلفة عن عملة الشركة</div>
          </div>

          <div>
            <div className="text-sm opacity-80 mb-1">ملاحظة (اختياري)</div>
            <Input value={withdrawNote} onChange={(e) => setWithdrawNote(e.target.value)} placeholder="مثال: سحب رصيد" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setWithdrawOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={submitWithdraw} disabled={withdrawSaving || !(withdrawAmount > 0) || !withdrawAccountId}>
              {withdrawSaving ? 'جارٍ الحفظ...' : 'سحب'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Top-up Request */}
      <Modal open={topupOpen} title={topupFor ? `طلب تغذية: ${topupFor.name}` : 'طلب تغذية'} onClose={() => setTopupOpen(false)}>
        <div className="space-y-3">
          <div>
            <div className="text-sm opacity-80 mb-1">المبلغ (بعملة الشركة)</div>
            <Input
              type="number"
              value={topupAmount}
              onChange={(e) => setTopupAmount(Number(e.target.value))}
              placeholder="0"
            />
          </div>
          <div>
            <div className="text-sm opacity-80 mb-1">ملاحظة (اختياري)</div>
            <Input value={topupNote} onChange={(e) => setTopupNote(e.target.value)} placeholder="مثال: تغذية رصيد عاجلة" />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setTopupOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={submitTopupRequest} disabled={topupSaving || !(topupAmount > 0)}>
              {topupSaving ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
