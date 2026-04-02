import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, RefreshCcw, FileText, Download, Wallet, FileBarChart, SlidersHorizontal } from 'lucide-react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { fmtMoney, fmtDate } from '../utils/format';
import { useAuth, hasAnyRole } from '../state/auth';

type AirlineStatementRow = {
  id: number;
  happened_at: string;
  kind: string;
  amount: number;
  currency_code: string;
  usd_to_currency_snapshot: number;
  amount_usd: number;
  running_balance: number;
  running_balance_usd: number;
  note: string | null;
  related_ticket_id: number | null;
  matched: number;
  matched_at: string | null;
};

function kindLabel(kind: string) {
  switch (kind) {
    case 'deposit':
      return 'إيداع';
    case 'withdraw':
      return 'سحب / شراء تذكرة';
    case 'adjustment':
      return 'تعديل';
    case 'fare_settlement':
      return 'تسوية حسم فير';
    default:
      return kind;
  }
}

function toneForKind(kind: string) {
  if (kind === 'deposit') return 'green';
  if (kind === 'withdraw') return 'red';
  if (kind === 'fare_settlement') return 'green';
  return 'gray';
}

function fareModeLabel(airline: any) {
  const hasFare = Number(airline?.has_fare_discount || 0) === 1;
  if (!hasFare) return 'بدون فير';
  const s = String(airline?.fare_discount_settlement || '').toLowerCase();
  if (s === 'manual') return 'فير يدوي';
  if (s === 'next_deposit') return 'فير مع الإيداع القادم';
  if (s === 'per_ticket_choice') return 'فير حر (مبلغ/نسبة لكل تذكرة)';
  // backward compatibility
  return 'فير مع الإيداع القادم';
}

export function AirlineDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const airlineId = Number(id);
  const canSeeFinancial = hasAnyRole(user, 'admin', 'accounting', 'airline_admin');
  const canDoAccounting = hasAnyRole(user, 'admin', 'accounting');
  const canRequestTopup = hasAnyRole(user, 'airline_admin') && !canDoAccounting;
  const canSetBalance = hasAnyRole(user, 'admin', 'accounting', 'airline_admin');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [airline, setAirline] = useState<any>(null);
  const [rows, setRows] = useState<AirlineStatementRow[]>([]);
  const [tab, setTab] = useState<'statement' | 'tickets'>('statement');

  const [settling, setSettling] = useState(false);

  // Topup request (ticket manager)
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupSaving, setTopupSaving] = useState(false);
  const [topupAmount, setTopupAmount] = useState(0);
  const [topupNote, setTopupNote] = useState('');

  // Set Balance
  const [setBalOpen, setSetBalOpen] = useState(false);
  const [setBalTarget, setSetBalTarget] = useState('');
  const [setBalNote, setSetBalNote] = useState('');
  const [setBalSaving, setSetBalSaving] = useState(false);
  const [setBalError, setSetBalError] = useState<string | null>(null);

  const balance = useMemo(() => {
    const last = rows[rows.length - 1];
    return last ? last.running_balance : 0;
  }, [rows]);

  const currency = useMemo(() => {
    return airline?.currency_code || rows[0]?.currency_code || 'USD';
  }, [airline, rows]);

  const openFare = useMemo(() => Number(airline?.open_fare_accrual_total || 0), [airline]);

  const isManualFare = useMemo(() => {
    const hasFare = Number(airline?.has_fare_discount || 0) === 1;
    if (!hasFare) return false;
    const s = String(airline?.fare_discount_settlement || '').toLowerCase();
    return s === 'manual' || s === 'per_ticket_choice';
  }, [airline]);

  async function load() {
    if (!airlineId || Number.isNaN(airlineId)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/airlines/${airlineId}/statement`);
      const data = res.data?.data;
      setAirline(data?.airline || null);
      setRows(data?.rows || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل ملف شركة الطيران');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [airlineId]);

  async function toggleMatched(txId: number, current: number) {
    try {
      await api.post(`/airlines/${airlineId}/ledger/${txId}/match`, { matched: current ? false : true });
      setRows((prev) =>
        prev.map((r) => (r.id === txId ? { ...r, matched: current ? 0 : 1, matched_at: current ? null : new Date().toISOString() } : r))
      );
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحديث المطابقة');
    }
  }

  async function settleFare() {
    if (!canSeeFinancial) return;
    if (!isManualFare) return;
    if (!(openFare > 0)) return;

    setSettling(true);
    try {
      await api.post(`/airlines/${airlineId}/settle-fare`, { note: '' });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تنزيل الخصومات');
    } finally {
      setSettling(false);
    }
  }

  async function submitTopupRequest() {
    if (!canRequestTopup) return;
    if (!(topupAmount > 0)) return;
    setTopupSaving(true);
    try {
      await api.post(`/airlines/${airlineId}/deposit-request`, {
        amount: Number(topupAmount),
        note: topupNote,
      });
      setTopupOpen(false);
      setTopupAmount(0);
      setTopupNote('');
      setError(null);
      // Hint user where to follow
      alert('تم إرسال الطلب للمحاسبة + المدير');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر إرسال الطلب');
    } finally {
      setTopupSaving(false);
    }
  }

  async function submitSetBalance() {
    const target = Number(setBalTarget);
    if (!Number.isFinite(target)) { setSetBalError('أدخل رقماً صحيحاً'); return; }
    setSetBalSaving(true);
    setSetBalError(null);
    try {
      await api.post(`/airlines/${airlineId}/set-balance`, {
        target_balance: target,
        note: setBalNote || 'تصحيح رصيد',
      });
      setSetBalOpen(false);
      setSetBalTarget('');
      setSetBalNote('');
      await load();
    } catch (e: any) {
      setSetBalError(e?.response?.data?.error || 'فشل تصحيح الرصيد');
    } finally {
      setSetBalSaving(false);
    }
  }

  if (!airlineId || Number.isNaN(airlineId)) {
    return <div className="text-slate-300">رقم شركة غير صالح</div>;
  }

  const tabBtn = (active: boolean) =>
    [
      'rounded-full px-3 py-1 text-xs font-bold border',
      active ? 'bg-brand-600/20 border-brand-600/30 text-white' : 'bg-slate-900/30 border-slate-700 text-slate-300 hover:bg-slate-800/40',
    ].join(' ');

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-black">ملف شركة الطيران</div>
          <div className="text-xs text-slate-400">كشف حساب (إيداع / سحب) + مطابقة بسيطة</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            رجوع
          </Button>
          <Button variant="secondary" onClick={load}>
            <RefreshCcw size={16} />
            تحديث
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/flight-tickets?airline_company_id=${airlineId}`)}>
            <FileText size={16} />
            التذاكر
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/reports/airline/${airlineId}`)}>
            <FileBarChart size={16} />
            تقرير كشف حساب
          </Button>

          {canSetBalance && (
            <Button
              variant="secondary"
              onClick={() => {
                setSetBalTarget(String(balance));
                setSetBalNote('');
                setSetBalError(null);
                setSetBalOpen(true);
              }}
              title="تصحيح رصيد الشركة مباشرة"
            >
              <SlidersHorizontal size={16} />
              تصحيح الرصيد
            </Button>
          )}

          {canRequestTopup ? (
            <Button variant="secondary" onClick={() => setTopupOpen(true)} title="طلب تغذية رصيد (إرسال للمحاسبة + المدير)">
              <Wallet size={16} />
              طلب تغذية
            </Button>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200">{error}</div>
      )}

      {loading ? (
        <div className="mt-4 text-slate-400">جاري التحميل…</div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card>
              <div className="text-xs text-slate-400">الشركة</div>
              <div className="mt-1 text-base font-black">{airline?.name || `#${airlineId}`}</div>
              <div className="text-xs text-slate-500">العملة: {currency}</div>
              <div className="mt-3 text-[11px] text-slate-500">
                هذا الملف يعتمد على <b className="text-slate-200">حركات</b> (إيداع / سحب) مثل المكاتب.
              </div>
            </Card>

            <Card>
              <div className="text-xs text-slate-400">الرصيد الحالي</div>
              <div className="mt-2 text-2xl font-black">{canSeeFinancial ? fmtMoney(balance, currency) : '—'}</div>
              <div className="text-[11px] text-slate-500">{canSeeFinancial ? 'حسب مجموع الحركات' : 'المحاسبة فقط'}</div>
            </Card>

            <Card>
              <div className="text-xs text-slate-400">سعر الصرف (الشركة)</div>
              <div className="mt-2 text-xl font-black">
                {currency === 'USD'
                  ? '1'
                  : Number(airline?.buy_fx_rate_to_usd || 0)
                    ? `1$ = ${airline?.buy_fx_rate_to_usd} ${currency}`
                    : '—'}
              </div>
              <div className="text-[11px] text-slate-500">لا يؤثر على الحركات السابقة (Snapshot)</div>
            </Card>

            <Card>
              <div className="text-xs text-slate-400">حسم الفير</div>
              <div className="mt-2 text-sm text-slate-200">
                {Number(airline?.has_fare_discount) === 1 ? (
                  <div className="space-y-1">
                    <div className="font-bold">{fareModeLabel(airline)}</div>
                    <div className="text-[11px] text-slate-400">
                      {airline?.fare_discount_type === 'percent'
                        ? `نسبة (${airline?.fare_discount_value || 0}%)`
                        : airline?.fare_discount_type === 'per_ticket_choice'
                          ? 'مبلغ ثابت أو نسبة% (يختار المستخدم لكل تذكرة)'
                          : 'ثابت (من التذكرة)'}
                    </div>
                    {canSeeFinancial ? (
                      <div className="text-[11px] text-slate-400">
                        خصومات معلّقة: <b className="text-slate-200">{fmtMoney(openFare, currency)}</b>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  'لا يوجد'
                )}
              </div>

              {canSeeFinancial && isManualFare && openFare > 0 ? (
                <div className="mt-3">
                  <Button onClick={settleFare} disabled={settling} title="إضافة الخصومات المعلّقة إلى رصيد الشركة">
                    <Download size={16} />
                    {settling ? '...' : 'تنزيل الخصومات كرصيد'}
                  </Button>
                </div>
              ) : null}

              {canSeeFinancial && !isManualFare && openFare > 0 ? (
                <div className="mt-2 text-[11px] text-slate-500">سيتم تنزيل الخصومات تلقائياً مع الإيداع القادم.</div>
              ) : null}
            </Card>
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <button className={tabBtn(tab === 'statement')} onClick={() => setTab('statement')}>
              كشف الحساب
            </button>
            <button className={tabBtn(tab === 'tickets')} onClick={() => setTab('tickets')}>
              التذاكر
            </button>
          </div>

          {tab === 'tickets' ? (
            <Card className="mt-4">
              <div className="font-black">التذاكر</div>
              <div className="mt-2 text-sm text-slate-400">تم فتح قائمة التذاكر مع فلتر شركة الطيران.</div>
              <div className="mt-3">
                <Button onClick={() => navigate(`/flight-tickets?airline_company_id=${airlineId}`)}>فتح قائمة التذاكر</Button>
              </div>
            </Card>
          ) : (
            <Card className="mt-4 p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900/40 text-slate-300">
                    <tr>
                      <th className="text-right px-4 py-3">التاريخ</th>
                      <th className="text-right px-4 py-3">النوع</th>
                      <th className="text-right px-4 py-3">القيمة</th>
                      <th className="text-right px-4 py-3">الرصيد بعد الحركة</th>
                      <th className="text-right px-4 py-3">ملاحظة</th>
                      <th className="text-right px-4 py-3">مطابقة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-400" colSpan={6}>
                          لا توجد حركات
                        </td>
                      </tr>
                    ) : (
                      rows
                        .slice()
                        .reverse()
                        .map((r) => (
                          <tr key={r.id} className="border-t border-slate-800/60 hover:bg-slate-900/20">
                            <td className="px-4 py-3 text-slate-300">{fmtDate(r.happened_at)}</td>
                            <td className="px-4 py-3">
                              <Badge tone={toneForKind(r.kind) as any}>{kindLabel(r.kind)}</Badge>
                              {r.related_ticket_id ? (
                                <button className="mr-2 text-xs text-brand-300 hover:underline" onClick={() => navigate(`/flight-tickets/${r.related_ticket_id}`)}>
                                  #{r.related_ticket_id}
                                </button>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-black">{fmtMoney(r.amount, currency)}</div>
                              <div className="text-xs text-slate-500">≈ {fmtMoney(r.amount_usd, 'USD')}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-black">{fmtMoney(r.running_balance, currency)}</div>
                              <div className="text-xs text-slate-500">≈ {fmtMoney(r.running_balance_usd, 'USD')}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-300">{r.note || '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {r.matched ? <CheckCircle2 size={18} className="text-green-400" /> : <Circle size={18} className="text-slate-500" />}
                                <button className="text-xs text-slate-300 hover:underline" onClick={() => toggleMatched(r.id, r.matched)}>
                                  {r.matched ? 'مطابق' : 'غير مطابق'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Set Balance Modal */}
      <Modal open={setBalOpen} title={`تصحيح الرصيد — ${airline?.name || ''}`} onClose={() => setSetBalOpen(false)} width="max-w-sm">
        <div className="space-y-4">
          {setBalError && (
            <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{setBalError}</div>
          )}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700">
            <span className="text-sm text-slate-400">الرصيد الحالي</span>
            <span className="font-black text-white">{fmtMoney(balance, currency)}</span>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">الرصيد الصحيح</div>
            <Input
              type="number"
              value={setBalTarget}
              onChange={(e) => setSetBalTarget(e.target.value)}
              placeholder="0"
              dir="ltr"
            />
            {setBalTarget !== '' && Number.isFinite(Number(setBalTarget)) && Number(setBalTarget) !== balance && (
              <p className={`text-xs mt-1 ${Number(setBalTarget) > balance ? 'text-green-400' : 'text-red-400'}`}>
                {Number(setBalTarget) > balance ? '▲ زيادة' : '▼ نقص'}{' '}
                {fmtMoney(Math.abs(Number(setBalTarget) - balance), currency)}
              </p>
            )}
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">سبب التصحيح (اختياري)</div>
            <Input value={setBalNote} onChange={(e) => setSetBalNote(e.target.value)} placeholder="مثال: تصحيح رصيد افتتاحي" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
            <Button variant="secondary" onClick={() => setSetBalOpen(false)}>إلغاء</Button>
            <Button onClick={submitSetBalance} loading={setBalSaving}>تطبيق</Button>
          </div>
        </div>
      </Modal>

      {/* Topup Request Modal */}
      <Modal open={topupOpen} title={airline ? `طلب تغذية: ${airline.name}` : 'طلب تغذية'} onClose={() => setTopupOpen(false)}>
        <div className="space-y-3">
          <div>
            <div className="text-sm opacity-80 mb-1">المبلغ (بعملة الشركة)</div>
            <Input type="number" value={topupAmount} onChange={(e) => setTopupAmount(Number(e.target.value))} />
          </div>
          <div>
            <div className="text-sm opacity-80 mb-1">ملاحظة (اختياري)</div>
            <Input value={topupNote} onChange={(e) => setTopupNote(e.target.value)} placeholder="مثال: تغذية رصيد عاجلة" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setTopupOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={submitTopupRequest} disabled={topupSaving || !(topupAmount > 0)}>
              {topupSaving ? 'جارٍ الإرسال…' : 'إرسال الطلب'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
