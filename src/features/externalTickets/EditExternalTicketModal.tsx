import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';

type CurrencyOpt = { code: string; name?: string };
type OfficeOpt = { id: number; name: string; type: string };

export function EditExternalTicketModal({
  open,
  onClose,
  ticket,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  ticket: any;
  onSaved: () => void;
}) {
  const [offices, setOffices] = useState<OfficeOpt[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOpt[]>([
    { code: 'USD', name: 'USD' },
    { code: 'SYP', name: 'SYP' },
    { code: 'AED', name: 'AED' },
  ]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [pnr, setPnr] = useState('');
  const [flightAtLocal, setFlightAtLocal] = useState('');
  const [returnFlightAtLocal, setReturnFlightAtLocal] = useState('');
  const [airlineCompanyName, setAirlineCompanyName] = useState('');

  const [sourceOfficeId, setSourceOfficeId] = useState<number | ''>('');
  const [customerOfficeId, setCustomerOfficeId] = useState<number | ''>('');

  const [customerType, setCustomerType] = useState<'office' | 'customer'>('office');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPhone2, setCustomerPhone2] = useState('');
  const [customerPartyId, setCustomerPartyId] = useState<number | null>(null);

  const [customerResults, setCustomerResults] = useState<OfficeOpt[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearching, setCustomerSearching] = useState(false);
  const customerSearchTimerRef = useRef<number | null>(null);

  const [passengerCount, setPassengerCount] = useState<number>(1);

  const [buyAmount, setBuyAmount] = useState<number>(0);
  const [buyCurrency, setBuyCurrency] = useState('USD');
  const [sellAmount, setSellAmount] = useState<number>(0);
  const [sellCurrency, setSellCurrency] = useState('USD');

  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load metadata
  useEffect(() => {
    if (!open) return;
    setError(null);
    (async () => {
      setLoadingMeta(true);
      try {
        const [officesRes, curRes] = await Promise.all([
          api.get('/meta/offices'),
          api.get('/currencies').catch(() => ({ data: { data: [] } })),
        ]);
        setOffices((officesRes.data.data || []).filter((o: any) => o?.status !== 'inactive'));
        const curList = (curRes.data.data || [])
          .filter((c: any) => c.is_active)
          .map((c: any) => ({ code: c.code, name: `${c.code} - ${c.name}` }));
        if (curList.length > 0) setCurrencies(curList);
      } catch { /* ignore */ }
      finally { setLoadingMeta(false); }
    })();
  }, [open]);

  // Populate form with ticket data when opening
  useEffect(() => {
    if (!open || !ticket) return;
    setPassengerName(ticket.passenger_name || '');
    setPassengerPhone(ticket.passenger_phone || '');
    setPassengerCount(Number(ticket.passenger_count) || 1);
    setPnr(ticket.pnr || '');
    setAirlineCompanyName(ticket.airline_company_name || '');
    setNotes(ticket.notes || '');

    // Convert ISO dates to local datetime-local format
    if (ticket.flight_at) {
      try {
        const d = new Date(ticket.flight_at);
        setFlightAtLocal(d.toISOString().slice(0, 16));
      } catch { setFlightAtLocal(''); }
    } else {
      setFlightAtLocal('');
    }
    if (ticket.return_flight_at) {
      try {
        const d = new Date(ticket.return_flight_at);
        setReturnFlightAtLocal(d.toISOString().slice(0, 16));
      } catch { setReturnFlightAtLocal(''); }
    } else {
      setReturnFlightAtLocal('');
    }

    setSourceOfficeId(ticket.source_office_id || '');
    setBuyAmount(Number(ticket.buy_amount || 0));
    setBuyCurrency(ticket.buy_currency_code || 'USD');
    setSellAmount(Number(ticket.sell_amount || 0));
    setSellCurrency(ticket.sell_currency_code || 'USD');

    // Determine customer type
    if (ticket.customer_party_type === 'customer') {
      setCustomerType('customer');
      setCustomerName(ticket.customer_office_name || '');
      setCustomerPartyId(ticket.customer_office_id || null);
      setCustomerOfficeId('');
      setCustomerPhone('');
      setCustomerPhone2('');
    } else {
      setCustomerType('office');
      setCustomerOfficeId(ticket.customer_office_id || '');
      setCustomerName('');
      setCustomerPartyId(null);
      setCustomerPhone('');
      setCustomerPhone2('');
    }
  }, [open, ticket]);

  // Autocomplete search for "our customers"
  useEffect(() => {
    if (!open) return;
    if (customerType !== 'customer') return;

    const q = customerName.trim();
    if (q.length < 2) {
      setCustomerResults([]);
      setCustomerSearching(false);
      return;
    }

    if (customerSearchTimerRef.current) {
      window.clearTimeout(customerSearchTimerRef.current);
      customerSearchTimerRef.current = null;
    }

    customerSearchTimerRef.current = window.setTimeout(async () => {
      setCustomerSearching(true);
      try {
        const res = await api.get('/meta/parties', { params: { type: 'customer', q, limit: 10 } });
        setCustomerResults((res.data.data || []).filter((c: any) => c?.status !== 'inactive'));
      } catch {
        setCustomerResults([]);
      } finally {
        setCustomerSearching(false);
      }
    }, 250);

    return () => {
      if (customerSearchTimerRef.current) {
        window.clearTimeout(customerSearchTimerRef.current);
        customerSearchTimerRef.current = null;
      }
    };
  }, [open, customerType, customerName]);

  async function handleSubmit() {
    if (!passengerName.trim()) return setError('اسم صاحب الطلب مطلوب');
    if (!airlineCompanyName.trim()) return setError('شركة الطيران مطلوبة');
    if (!sourceOfficeId) return setError('اختر مكتب المصدر');
    if (customerType === 'office' && !customerOfficeId) return setError('اختر العميل');
    if (customerType === 'customer' && !customerName.trim()) return setError('اسم العميل مطلوب');
    if (buyAmount <= 0) return setError('مبلغ الشراء مطلوب');
    if (sellAmount <= 0) return setError('مبلغ البيع مطلوب');

    setSaving(true);
    setError(null);
    try {
      const body: any = {
        passenger_name: passengerName.trim(),
        passenger_phone: passengerPhone.trim() || null,
        passenger_count: passengerCount,
        pnr: pnr.trim() || null,
        airline_company_name: airlineCompanyName.trim(),
        flight_at: flightAtLocal ? new Date(flightAtLocal).toISOString() : null,
        return_flight_at: returnFlightAtLocal ? new Date(returnFlightAtLocal).toISOString() : null,
        source_office_id: Number(sourceOfficeId),
        buy_amount: buyAmount,
        buy_currency_code: buyCurrency,
        sell_amount: sellAmount,
        sell_currency_code: sellCurrency,
        notes: notes.trim() || null,
      };

      if (customerType === 'office') {
        body.customer_office_id = Number(customerOfficeId);
      } else {
        body.customer_type = 'customer';
        body.customer_name = customerName.trim();
        body.customer_phone = customerPhone.trim() || null;
        body.customer_phone2 = customerPhone2.trim() || null;
        body.customer_party_id = customerPartyId;
        body.customer_office_id = customerPartyId ? Number(customerPartyId) : null;
      }

      await api.patch(`/external-tickets/${ticket.id}`, body);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تعديل التذكرة');
    } finally {
      setSaving(false);
    }
  }

  const profitPreview = sellAmount - buyAmount;

  return (
    <Modal open={open} onClose={onClose} title={`تعديل تذكرة خارجية #${ticket?.id || ''}`} width="max-w-2xl">
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>
        )}

        {/* Flight Details */}
        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-3">
          <h4 className="text-xs font-bold text-amber-400">تفاصيل الرحلة</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">شركة الطيران *</label>
              <Input value={airlineCompanyName} onChange={(e) => setAirlineCompanyName(e.target.value)} placeholder="مثال: Turkish Airlines" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">PNR</label>
              <Input value={pnr} onChange={(e) => setPnr(e.target.value)} dir="ltr" placeholder="رقم الحجز" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">موعد الذهاب</label>
              <Input type="datetime-local" value={flightAtLocal} onChange={(e) => setFlightAtLocal(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">موعد العودة</label>
              <Input type="datetime-local" value={returnFlightAtLocal} onChange={(e) => setReturnFlightAtLocal(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Passenger Info */}
        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-3">
          <h4 className="text-xs font-bold text-amber-400">بيانات المسافر</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">اسم صاحب الطلب *</label>
              <Input value={passengerName} onChange={(e) => setPassengerName(e.target.value)} placeholder="الاسم الكامل" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">رقم الهاتف</label>
              <Input value={passengerPhone} onChange={(e) => setPassengerPhone(e.target.value)} dir="ltr" placeholder="05..." />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">عدد الركاب</label>
              <Input type="number" min={1} value={passengerCount} onChange={(e) => setPassengerCount(Math.max(1, Number(e.target.value)))} />
            </div>
          </div>
        </div>

        {/* Parties - Source and Customer */}
        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-3">
          <h4 className="text-xs font-bold text-amber-400">الجهات</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-red-400 mb-1 block">مكتب المصدر (نشتري منه) *</label>
              <Select
                value={sourceOfficeId}
                onChange={(e) => setSourceOfficeId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">اختر مكتب المصدر</option>
                {offices.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-xs text-green-400 mb-1 block">العميل *</label>
              <div className="space-y-3">
                <div className="w-48">
                  <label className="text-[11px] text-slate-400 mb-1 block">نوع العميل</label>
                  <Select
                    value={customerType}
                    onChange={(e) => {
                      const v = (e.target.value as any) === 'customer' ? 'customer' : 'office';
                      setCustomerType(v);
                      setCustomerOfficeId('');
                      setCustomerName('');
                      setCustomerPhone('');
                      setCustomerPhone2('');
                      setCustomerPartyId(null);
                      setCustomerResults([]);
                      setCustomerSearchOpen(false);
                    }}
                  >
                    <option value="office">مكتب</option>
                    <option value="customer">عميل مكتبنا</option>
                  </Select>
                </div>

                {customerType === 'office' ? (
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">اختر المكتب</label>
                    <Select
                      value={customerOfficeId}
                      onChange={(e) => setCustomerOfficeId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">اختر العميل</option>
                      {offices.map(o => (
                        <option key={`${o.type}-${o.id}`} value={o.id}>
                          {`مكتب: ${o.name}`}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 mb-1 block">اسم العميل</label>
                        <div className="relative">
                          <Input
                            value={customerName}
                            onChange={(e) => {
                              setCustomerName(e.target.value);
                              setCustomerPartyId(null);
                              setCustomerPhone('');
                              setCustomerPhone2('');
                              setCustomerSearchOpen(true);
                            }}
                            onFocus={() => setCustomerSearchOpen(true)}
                            onBlur={() => {
                              window.setTimeout(() => setCustomerSearchOpen(false), 150);
                            }}
                            placeholder="اكتب اسم العميل..."
                          />
                          {customerSearchOpen && customerName.trim().length >= 2 && (
                            <div className="absolute z-50 mt-2 w-full rounded-xl border border-slate-700/70 bg-slate-950/95 shadow-xl overflow-hidden">
                              <div className="px-3 py-2 text-[11px] text-slate-400 border-b border-slate-800/70 flex items-center justify-between">
                                <span>اقتراحات العملاء</span>
                                {customerSearching && <span className="text-slate-500">جارٍ البحث...</span>}
                              </div>
                              <div className="max-h-48 overflow-auto">
                                {customerResults.length === 0 && !customerSearching ? (
                                  <div className="px-3 py-3 text-xs text-slate-500">لا يوجد نتائج</div>
                                ) : (
                                  customerResults.map((c) => (
                                    <button
                                      type="button"
                                      key={c.id}
                                      className="w-full text-right px-3 py-2 text-sm hover:bg-slate-800/60 transition-colors"
                                      onMouseDown={(ev) => {
                                        ev.preventDefault();
                                        setCustomerPartyId(Number(c.id));
                                        setCustomerName(c.name);
                                        setCustomerPhone(String((c as any).phone || ''));
                                        setCustomerPhone2(String((c as any).phone2 || ''));
                                        setCustomerSearchOpen(false);
                                      }}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-slate-100">{c.name}</span>
                                        {(c as any).phone ? <span className="text-xs text-slate-500" dir="ltr">{(c as any).phone}</span> : null}
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                          {customerPartyId ? (
                            <div className="mt-2 text-[11px] text-green-400">تم اختيار عميل مسجّل</div>
                          ) : null}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-slate-400 mb-1 block">رقم الموبايل 1</label>
                          <Input
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(String(e.target.value || '').replace(/[^0-9]/g, ''))}
                            dir="ltr"
                            placeholder="09xxxxxxxx"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 mb-1 block">رقم الموبايل 2</label>
                          <Input
                            value={customerPhone2}
                            onChange={(e) => setCustomerPhone2(String(e.target.value || '').replace(/[^0-9]/g, ''))}
                            dir="ltr"
                            placeholder="09xxxxxxxx"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-3">
          <h4 className="text-xs font-bold text-amber-400">التسعير</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-red-400 mb-1 block">سعر الشراء *</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={buyAmount || ''}
                  onChange={(e) => setBuyAmount(Number(e.target.value))}
                  className="flex-1"
                  placeholder="0.00"
                />
                <Select value={buyCurrency} onChange={(e) => setBuyCurrency(e.target.value)} className="w-24">
                  {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-green-400 mb-1 block">سعر البيع *</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={sellAmount || ''}
                  onChange={(e) => setSellAmount(Number(e.target.value))}
                  className="flex-1"
                  placeholder="0.00"
                />
                <Select value={sellCurrency} onChange={(e) => setSellCurrency(e.target.value)} className="w-24">
                  {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </Select>
              </div>
            </div>
          </div>

          {(buyAmount > 0 || sellAmount > 0) && buyCurrency === sellCurrency && (
            <div className={`text-center p-2 rounded-lg ${profitPreview >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              <span className="text-xs">الربح المتوقع: </span>
              <span className="font-bold">{profitPreview.toLocaleString('en-US', { maximumFractionDigits: 2 })} {buyCurrency}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">ملاحظات</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none text-sm"
            placeholder="ملاحظات إضافية..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={saving}>حفظ التعديلات</Button>
        </div>
      </div>
    </Modal>
  );
}
