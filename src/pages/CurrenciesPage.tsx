import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, RefreshCcw } from 'lucide-react';
import { api } from '../utils/api';
import type { CurrencyWithRate } from '../utils/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { fmtDate } from '../utils/format';

type FxInputMode = 'usd_to_currency' | 'currency_to_usd';

function fmtFx(n: number, maxFractionDigits = 8) {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 6 : maxFractionDigits;
  return n.toLocaleString('en-US', { maximumFractionDigits: digits });
}

function FxLine({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  // In RTL UIs, mixed latin + numbers can appear visually reordered (bidi).
  // Force LTR rendering for FX formulas to keep them readable.
  return (
    <div
      dir="ltr"
      className={`tabular-nums [unicode-bidi:isolate] ${className}`}
    >
      {children}
    </div>
  );
}

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function CurrenciesPage() {
  const [rows, setRows] = useState<CurrencyWithRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openRate, setOpenRate] = useState(false);

  const [saving, setSaving] = useState(false);

  const [editCode, setEditCode] = useState<string>('');

  // Add/Edit form
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [active, setActive] = useState(true);
  const [usdToCurrency, setUsdToCurrency] = useState<string>('');
  const [addFxMode, setAddFxMode] = useState<FxInputMode>('usd_to_currency');

  // Rate form
  const [rateCode, setRateCode] = useState<string>('');
  const [rateInputMode, setRateInputMode] = useState<FxInputMode>('usd_to_currency');
  const [rateInputValue, setRateInputValue] = useState<string>('');
  const [rateUseCustomDate, setRateUseCustomDate] = useState<boolean>(false);
  const [rateEffectiveAt, setRateEffectiveAt] = useState<string>(isoToday());
  const [rateHistory, setRateHistory] = useState<any[]>([]);
  const [rateHistoryLoading, setRateHistoryLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/currencies');
      setRows(res.data.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل العملات');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    const copy = [...rows];
    // Prefer USD first, then active, then code
    copy.sort((a, b) => {
      if (a.code === 'USD') return -1;
      if (b.code === 'USD') return 1;
      if (a.is_active !== b.is_active) return b.is_active - a.is_active;
      return a.code.localeCompare(b.code);
    });
    return copy;
  }, [rows]);

  function openAddModal() {
    setCode('');
    setName('');
    setSymbol('');
    setActive(true);
    setUsdToCurrency('');
    setAddFxMode('usd_to_currency');
    setOpenAdd(true);
  }

  function openEditModal(row: CurrencyWithRate) {
    setEditCode(row.code);
    setName(row.name || '');
    setSymbol(String(row.symbol || ''));
    setActive(row.is_active === 1);
    setOpenEdit(true);
  }

  async function openRateModal(row: CurrencyWithRate) {
    setRateCode(row.code);
    setRateInputMode('usd_to_currency');
    setRateInputValue(row.code === 'USD' ? '1' : String(row.usd_to_currency || ''));
    setRateUseCustomDate(false);
    setRateEffectiveAt(isoToday());
    setRateHistory([]);
    setOpenRate(true);

    // load history
    try {
      setRateHistoryLoading(true);
      const hist = await api.get(`/currencies/${row.code}/rates`);
      setRateHistory(hist.data.data || []);
    } catch {
      setRateHistory([]);
    } finally {
      setRateHistoryLoading(false);
    }
  }

  async function addCurrency() {
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        code: String(code || '').toUpperCase(),
        name: String(name || '').trim(),
        symbol: symbol ? String(symbol).trim() : null,
        is_active: !!active,
      };
      if (payload.code !== 'USD') {
        const raw = Number(usdToCurrency);
        if (!(raw > 0)) throw new Error('سعر الصرف مطلوب');
        payload.usd_to_currency = addFxMode === 'usd_to_currency' ? raw : 1 / raw;
      }
      await api.post('/currencies', payload);
      setOpenAdd(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل إضافة العملة');
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/currencies/${editCode}`, {
        name: String(name || '').trim(),
        symbol: symbol ? String(symbol).trim() : null,
        is_active: !!active,
      });
      setOpenEdit(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تعديل العملة');
    } finally {
      setSaving(false);
    }
  }

  async function saveRate() {
    setSaving(true);
    setError(null);
    try {
      if (rateCode === 'USD') throw new Error('USD = 1');
      const raw = Number(rateInputValue);
      if (!(raw > 0)) throw new Error('أدخل قيمة صحيحة لسعر الصرف');
      const usdToCurrencyNum = rateInputMode === 'usd_to_currency' ? raw : 1 / raw;
      const payload: any = {
        usd_to_currency: usdToCurrencyNum,
      };
      if (rateUseCustomDate && rateEffectiveAt) payload.effective_at = rateEffectiveAt;

      const resp = await api.post(`/currencies/${rateCode}/rates`, payload);

      // Optimistic update so the user sees the new rate immediately
      const d = resp?.data?.data;
      if (d?.currency_code) {
        setRows((prev) =>
          prev.map((r) =>
            r.code === d.currency_code
              ? {
                  ...r,
                  usd_to_currency: Number(d.usd_to_currency),
                  rate_to_usd: Number(d.rate_to_usd),
                  rate_effective_at: d.effective_at,
                }
              : r
          )
        );
        // Keep the modal input in sync after save
        if (rateInputMode === 'usd_to_currency') {
          setRateInputValue(String(d.usd_to_currency));
        } else {
          setRateInputValue(String(1 / Number(d.usd_to_currency)));
        }
      }

      // refresh history
      const hist = await api.get(`/currencies/${rateCode}/rates`);
      setRateHistory(hist.data.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'فشل حفظ سعر الصرف');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-lg font-black">العملات وأسعار الصرف</div>
          <div className="text-xs text-slate-400">أدخل السعر بشكل واضح: <span className="text-slate-200 font-semibold">1 دولار (USD) = كم من العملة؟</span> والنظام يعرض لك العكس تلقائياً.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw size={16} />
            تحديث
          </Button>
          <Button size="sm" onClick={openAddModal}>
            <Plus size={16} />
            إضافة عملة
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200">{error}</div>
      )}

      <Card>
        <div className="text-sm font-bold text-slate-200 mb-3">قائمة العملات</div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs">
                <th className="text-right pb-2">الكود</th>
                <th className="text-right pb-2">الاسم</th>
                <th className="text-right pb-2">الحالة</th>
                <th className="text-right pb-2">سعر الصرف</th>
                <th className="text-right pb-2">آخر تحديث</th>
                <th className="text-right pb-2">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.code} className="border-t border-slate-800/60">
                  <td className="py-3 font-black text-white">{r.code}</td>
                  <td className="py-3">
                    <div className="text-slate-200 font-semibold">{r.name}</div>
                    {r.symbol ? <div className="text-[11px] text-slate-500">{r.symbol}</div> : null}
                  </td>
                  <td className="py-3">
                    <Badge tone={r.is_active ? 'green' : 'gray'}>{r.is_active ? 'مفعّلة' : 'موقوفة'}</Badge>
                  </td>
                  <td className="py-3 text-slate-200">
                    {r.code === 'USD' ? (
                      <div className="space-y-0.5">
                        <FxLine className="font-semibold">1 USD = 1 USD</FxLine>
                        <div className="text-[11px] text-slate-500">عملة الأساس</div>
                      </div>
                    ) : r.usd_to_currency ? (
                      <div className="space-y-0.5">
                        <FxLine className="font-semibold">1 USD = {fmtFx(Number(r.usd_to_currency))} {r.code}</FxLine>
                        <FxLine className="text-[11px] text-slate-500">
                          1 {r.code} = {fmtFx(Number(r.rate_to_usd ?? (1 / Number(r.usd_to_currency))))} USD
                        </FxLine>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="text-amber-300 font-semibold">غير محدد</div>
                        <div className="text-[11px] text-slate-500">أضف سعر الصرف لتفعيل التحويلات.</div>
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-slate-400 text-xs">{r.rate_effective_at ? fmtDate(r.rate_effective_at) : '—'}</td>
                  <td className="py-3">
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="ghost" onClick={() => openRateModal(r)}>
                        <RefreshCcw size={16} />
                        تعديل السعر
                      </Button>
                      <Button variant="ghost" onClick={() => openEditModal(r)}>
                        <Pencil size={16} />
                        تعديل
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {!sorted.length && !loading && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">لا توجد بيانات</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add modal */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="إضافة عملة" width="max-w-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-400 mb-1">كود العملة</div>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="مثال: EUR" />
            <div className="text-[11px] text-slate-500 mt-1">3-6 أحرف كبيرة.</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">اسم العملة</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Euro" />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">الرمز (اختياري)</div>
            <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="€" />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">الحالة</div>
            <div className="flex gap-2">
              <Button variant={active ? 'primary' : 'ghost'} onClick={() => setActive(true)} type="button">مفعّلة</Button>
              <Button variant={!active ? 'primary' : 'ghost'} onClick={() => setActive(false)} type="button">موقوفة</Button>
            </div>
          </div>

          {String(code || '').toUpperCase() !== 'USD' && (
            <div className="md:col-span-2">
              <div className="text-xs text-slate-400 mb-2">طريقة إدخال سعر الصرف</div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant={addFxMode === 'usd_to_currency' ? 'primary' : 'ghost'}
                  onClick={() => {
                    const raw = Number(usdToCurrency);
                    const usdToCur = raw > 0 ? (addFxMode === 'usd_to_currency' ? raw : 1 / raw) : null;
                    setAddFxMode('usd_to_currency');
                    setUsdToCurrency(usdToCur ? String(usdToCur) : '');
                  }}
                >
                  <FxLine className="font-semibold">1 USD = X {String(code || '').toUpperCase()}</FxLine>
                </Button>
                <Button
                  type="button"
                  variant={addFxMode === 'currency_to_usd' ? 'primary' : 'ghost'}
                  onClick={() => {
                    const raw = Number(usdToCurrency);
                    const usdToCur = raw > 0 ? (addFxMode === 'usd_to_currency' ? raw : 1 / raw) : null;
                    setAddFxMode('currency_to_usd');
                    setUsdToCurrency(usdToCur ? String(1 / usdToCur) : '');
                  }}
                >
                  <FxLine className="font-semibold">1 {String(code || '').toUpperCase()} = X USD</FxLine>
                </Button>
              </div>

              <div className="mt-2 rounded-2xl border border-slate-800/60 bg-slate-900/20 p-3">
                {addFxMode === 'usd_to_currency' ? (
                  <FxLine className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="text-sm font-bold text-slate-200">1 USD =</div>
                    <div className="min-w-[180px]">
                      <Input type="number" value={usdToCurrency} onChange={(e) => setUsdToCurrency(e.target.value)} placeholder="مثال: 0.93 أو 15000" />
                    </div>
                    <div className="text-sm font-bold text-slate-200">{String(code || '').toUpperCase()}</div>
                  </FxLine>
                ) : (
                  <FxLine className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="text-sm font-bold text-slate-200">1 {String(code || '').toUpperCase()} =</div>
                    <div className="min-w-[180px]">
                      <Input type="number" value={usdToCurrency} onChange={(e) => setUsdToCurrency(e.target.value)} placeholder="مثال: 0.00066" />
                    </div>
                    <div className="text-sm font-bold text-slate-200">USD</div>
                  </FxLine>
                )}

                {Number(usdToCurrency || 0) > 0 && (
                  <FxLine className="text-[11px] text-slate-500 mt-2">
                    {addFxMode === 'usd_to_currency' ? (
                      <>العكس: 1 {String(code || '').toUpperCase()} = {fmtFx(1 / Number(usdToCurrency))} USD</>
                    ) : (
                      <>العكس: 1 USD = {fmtFx(1 / Number(usdToCurrency))} {String(code || '').toUpperCase()}</>
                    )}
                  </FxLine>
                )}
              </div>

              <div className="text-[11px] text-slate-500 mt-2">ملاحظة: تغيير السعر لا يغيّر العمليات القديمة لأن كل عملية تحفظ Snapshot بسعرها وقتها.</div>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpenAdd(false)} disabled={saving}>إلغاء</Button>
          <Button onClick={addCurrency} disabled={saving}>حفظ</Button>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title={`تعديل العملة: ${editCode}`} width="max-w-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-400 mb-1">الاسم</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">الرمز</div>
            <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-slate-400 mb-1">الحالة</div>
            <div className="flex gap-2">
              <Button variant={active ? 'primary' : 'ghost'} onClick={() => setActive(true)} type="button">مفعّلة</Button>
              <Button variant={!active ? 'primary' : 'ghost'} onClick={() => setActive(false)} type="button">موقوفة</Button>
            </div>
            {editCode === 'USD' && (
              <div className="text-[11px] text-slate-500 mt-1">USD لا يمكن إيقافها.</div>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpenEdit(false)} disabled={saving}>إلغاء</Button>
          <Button onClick={saveEdit} disabled={saving}>حفظ</Button>
        </div>
      </Modal>

      {/* Rate modal */}
      <Modal open={openRate} onClose={() => setOpenRate(false)} title={`سعر الصرف: ${rateCode}`} width="max-w-2xl">
        {rateCode === 'USD' ? (
          <FxLine className="text-sm text-slate-200">USD ثابتة: 1 USD = 1 USD</FxLine>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/20 p-4">
              <div className="text-xs text-slate-400 mb-2">طريقة إدخال سعر الصرف</div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant={rateInputMode === 'usd_to_currency' ? 'primary' : 'ghost'}
                  onClick={() => {
                    const raw = Number(rateInputValue);
                    const usdToCur = raw > 0 ? (rateInputMode === 'usd_to_currency' ? raw : 1 / raw) : null;
                    setRateInputMode('usd_to_currency');
                    setRateInputValue(usdToCur ? String(usdToCur) : '');
                  }}
                >
                  <FxLine className="font-semibold">1 USD = X {rateCode}</FxLine>
                </Button>
                <Button
                  type="button"
                  variant={rateInputMode === 'currency_to_usd' ? 'primary' : 'ghost'}
                  onClick={() => {
                    const raw = Number(rateInputValue);
                    const usdToCur = raw > 0 ? (rateInputMode === 'usd_to_currency' ? raw : 1 / raw) : null;
                    setRateInputMode('currency_to_usd');
                    setRateInputValue(usdToCur ? String(1 / usdToCur) : '');
                  }}
                >
                  <FxLine className="font-semibold">1 {rateCode} = X USD</FxLine>
                </Button>
              </div>

              <div className="mt-2">
                {rateInputMode === 'usd_to_currency' ? (
                  <FxLine className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="text-sm font-bold text-slate-200">1 USD =</div>
                    <div className="min-w-[180px]">
                      <Input type="number" value={rateInputValue} onChange={(e) => setRateInputValue(e.target.value)} placeholder="مثال: 0.93 أو 15000" />
                    </div>
                    <div className="text-sm font-bold text-slate-200">{rateCode}</div>
                  </FxLine>
                ) : (
                  <FxLine className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="text-sm font-bold text-slate-200">1 {rateCode} =</div>
                    <div className="min-w-[180px]">
                      <Input type="number" value={rateInputValue} onChange={(e) => setRateInputValue(e.target.value)} placeholder="مثال: 0.00066" />
                    </div>
                    <div className="text-sm font-bold text-slate-200">USD</div>
                  </FxLine>
                )}

                {Number(rateInputValue || 0) > 0 && (
                  <FxLine className="text-[11px] text-slate-500 mt-2">
                    {rateInputMode === 'usd_to_currency' ? (
                      <>العكس: 1 {rateCode} = {fmtFx(1 / Number(rateInputValue))} USD</>
                    ) : (
                      <>العكس: 1 USD = {fmtFx(1 / Number(rateInputValue))} {rateCode}</>
                    )}
                  </FxLine>
                )}
              </div>

              <div className="mt-3 flex gap-2 items-center flex-wrap">
                <div className="text-xs text-slate-400">تطبيق السعر:</div>
                <Button
                  type="button"
                  variant={!rateUseCustomDate ? 'primary' : 'ghost'}
                  onClick={() => setRateUseCustomDate(false)}
                >
                  الآن
                </Button>
                <Button
                  type="button"
                  variant={rateUseCustomDate ? 'primary' : 'ghost'}
                  onClick={() => setRateUseCustomDate(true)}
                >
                  بتاريخ
                </Button>

                {rateUseCustomDate && (
                  <div className="min-w-[200px]">
                    <Input type="date" value={rateEffectiveAt} onChange={(e) => setRateEffectiveAt(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-2">تعديل السعر لا يغيّر أي عمليات قديمة لأن كل عملية تحفظ Snapshot بسعرها وقتها.</div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpenRate(false)} disabled={saving}>إغلاق</Button>
              <Button onClick={saveRate} disabled={saving}>حفظ السعر</Button>
            </div>
          </>
        )}

        <div className="mt-6 rounded-2xl border border-slate-800/60 bg-slate-900/20 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-200">السجل</div>
            <Button
              variant="ghost"
              onClick={async () => {
                if (!rateCode) return;
                try {
                  setRateHistoryLoading(true);
                  const hist = await api.get(`/currencies/${rateCode}/rates`);
                  setRateHistory(hist.data.data || []);
                } catch {
                  setRateHistory([]);
                } finally {
                  setRateHistoryLoading(false);
                }
              }}
            >
              <RefreshCcw size={16} />
              تحديث
            </Button>
          </div>

          {rateHistoryLoading ? (
            <div className="text-xs text-slate-400 mt-3">جار التحميل...</div>
          ) : rateHistory.length ? (
            <div className="mt-3 space-y-2">
              {rateHistory.slice(0, 10).map((h: any) => (
                <div key={h.id || h.effective_at} className="flex items-center justify-between text-xs">
                  <div className="text-slate-400">{h.effective_at ? fmtDate(h.effective_at) : '—'}</div>
                  <div className="text-right">
                    <FxLine className="text-slate-200 font-semibold">1 USD = {fmtFx(Number(h.usd_to_currency || 0))} {rateCode}</FxLine>
                    <FxLine className="text-[11px] text-slate-500">1 {rateCode} = {fmtFx(1 / Number(h.usd_to_currency || 1))} USD</FxLine>
                  </div>
                </div>
              ))}
              {rateHistory.length > 10 && (
                <div className="text-[11px] text-slate-500">عرضنا آخر 10 قيود.</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 mt-3">لا يوجد سجل.</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
