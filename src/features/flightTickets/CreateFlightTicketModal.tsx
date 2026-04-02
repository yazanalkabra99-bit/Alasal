import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, X, Plus } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';
import { useAuth, hasAnyRole } from '../../state/auth';
import type { AirlineCompany, Party } from '../../utils/types';

type CurrencyOpt = { code: string; name?: string };

export function CreateFlightTicketModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (ticketId: number) => void;
}) {
  const { user } = useAuth();
  const canAddAirline = hasAnyRole(user, 'airline_admin', 'accounting', 'admin');
  const [airlines, setAirlines] = useState<AirlineCompany[]>([]);
  const [offices, setOffices] = useState<Party[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOpt[]>([
    { code: 'USD', name: 'USD' },
    { code: 'SYP', name: 'SYP' },
    { code: 'AED', name: 'AED' },
  ]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [errMeta, setErrMeta] = useState<string | null>(null);

  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [pnr, setPnr] = useState('');
  const [passengerCount, setPassengerCount] = useState('1');
  const [flightAtLocal, setFlightAtLocal] = useState('');
  const [returnFlightAtLocal, setReturnFlightAtLocal] = useState('');

  const [forWhom, setForWhom] = useState<'customer' | 'office'>('customer');
  const [officeId, setOfficeId] = useState<number | ''>('');
  const [partyName, setPartyName] = useState('');

  // Financial customer (who owes us) — like "بيع خدمة" (when forWhom='customer')
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPhone2, setCustomerPhone2] = useState('');
  const [customerPartyId, setCustomerPartyId] = useState<number | null>(null);
  const [customerResults, setCustomerResults] = useState<Party[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearching, setCustomerSearching] = useState(false);
  const customerSearchTimerRef = useRef<number | null>(null);
  const customerInputRef = useRef<HTMLInputElement | null>(null);


  const [airlineId, setAirlineId] = useState<number | ''>('');
  const [buyAmount, setBuyAmount] = useState<number>(0);

  const [sellAmount, setSellAmount] = useState<number>(0);
  const [sellCurrency, setSellCurrency] = useState<string>('USD');

  const [fareBaseAmount, setFareBaseAmount] = useState<number>(0);
  const [fareFixedDiscount, setFareFixedDiscount] = useState<number>(0);
  // Type 4 (per_ticket_choice): user picks fixed or percent per ticket
  const [fareChoiceType, setFareChoiceType] = useState<'fixed' | 'percent' | 'none'>('fixed');
  const [fareChoiceBase, setFareChoiceBase] = useState<number>(0);
  const [fareChoicePercent, setFareChoicePercent] = useState<number>(0);

  const [files, setFiles] = useState<File[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setErrMeta(null);
    (async () => {
      setLoadingMeta(true);
      try {
        const [airlinesRes, officesRes] = await Promise.all([
          api.get('/airlines'),
          api.get('/meta/offices')
        ]);
        
        const airlinesData = airlinesRes.data.items || [];
        const officesData = officesRes.data.data || [];
        
        console.log('Airlines loaded:', airlinesData.length);
        console.log('Offices loaded:', officesData.length, officesData);
        
        setAirlines(airlinesData);
        setOffices(officesData);

        // Not all roles can read currencies; fallback to static list.
        try {
          const curRes = await api.get('/meta/currencies');
          const rows = (curRes.data.data || []).map((r: any) => ({ code: r.code, name: r.name }));
          if (rows.length) setCurrencies(rows);
        } catch {
          // ignore
        }
      } catch (e: any) {
        console.error('Error loading meta:', e);
        setErrMeta(e?.response?.data?.error || 'تعذر تحميل بيانات شركات الطيران');
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, [open]);

  // Customer search (autocomplete) — only when forWhom='customer'
  useEffect(() => {
    if (!open) return;
    if (forWhom !== 'customer') return;

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
  }, [open, forWhom, customerName]);

  // Smart default for customer billing: start with passenger values
  useEffect(() => {
    if (!open) return;
    if (forWhom !== 'customer') return;
    if (customerPartyId) return;
    if (!customerName.trim() && passengerName.trim()) setCustomerName(passengerName);
    if (!customerPhone.trim() && passengerPhone.trim()) setCustomerPhone(passengerPhone);
  }, [open, forWhom, passengerName, passengerPhone, customerPartyId]);



  const airline = useMemo(() => airlines.find((a) => a.id === airlineId) || null, [airlines, airlineId]);
  const buyCurrency = airline?.currency_code || 'USD';

  const percent = airline?.has_fare_discount ? (airline.fare_discount_type === 'percent' ? Number(airline.fare_discount_value || 0) : 0) : 0;
  const computedDiscountUsd = useMemo(() => {
    if (!airline || airline.has_fare_discount !== 1) return 0;
    if (airline.fare_discount_type === 'per_ticket_choice') {
      if (fareChoiceType === 'none') return 0;
      if (fareChoiceType === 'fixed') return Number(fareChoiceBase || 0);
      const base = Number(fareChoiceBase || 0);
      return base > 0 ? base * (Number(fareChoicePercent || 0) / 100) : 0;
    }
    if (airline.fare_discount_type === 'percent') {
      const base = Number(fareBaseAmount || 0);
      return base > 0 ? base * (percent / 100) : 0;
    }
    return Number(fareFixedDiscount || 0);
  }, [airline, fareBaseAmount, fareFixedDiscount, percent, fareChoiceType, fareChoiceBase, fareChoicePercent]);

  // Get party name from office if selected
  // Billing party name:
  // - customer: default to passenger name unless user overrides
  // - office: use selected office name (fallback to manual entry)
  const effectivePartyName = useMemo(() => {
    if (forWhom === 'office') {
      if (officeId) {
        const office = offices.find((o) => o.id === officeId);
        return office?.name || partyName;
      }
      return partyName;
    }
    return customerName || passengerName;
  }, [forWhom, officeId, offices, partyName, passengerName, customerName]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      e.target.value = '';
    }
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function create() {
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        passenger_name: passengerName,
        passenger_phone: passengerPhone,
        pnr,
        passenger_count: Number(passengerCount) || 1,
        flight_at: flightAtLocal ? new Date(flightAtLocal).toISOString() : null,
        return_flight_at: returnFlightAtLocal ? new Date(returnFlightAtLocal).toISOString() : null,
        billing_party_type: forWhom,
        billing_party_name: effectivePartyName,
        airline_company_id: Number(airlineId),
        buy_amount: Number(buyAmount),
        sell_amount: Number(sellAmount),
        sell_currency_code: String(sellCurrency).toUpperCase(),
      };

      if (forWhom === 'office' && officeId) payload.office_party_id = Number(officeId);
      if (forWhom === 'customer') {
        payload.customer_party_id = customerPartyId;
        payload.customer_name = customerName.trim() || passengerName.trim();
        payload.customer_phone = (customerPhone.trim() || passengerPhone.trim() || null);
        payload.customer_phone2 = customerPhone2.trim() || null;
      }

      if (airline?.has_fare_discount === 1) {
        if (airline.fare_discount_type === 'per_ticket_choice') {
          payload.fare_choice_type = fareChoiceType;
          if (fareChoiceType === 'none') {
            // No fare discount — no extra fields needed
          } else if (fareChoiceType === 'fixed') {
            payload.fare_discount_fixed_amount = Number(fareChoiceBase || 0);
          } else {
            payload.fare_base_amount = Number(fareChoiceBase || 0);
            payload.fare_choice_percent = Number(fareChoicePercent || 0);
          }
        } else if (airline.fare_discount_type === 'percent') {
          payload.fare_base_amount = Number(fareBaseAmount || 0);
        } else {
          payload.fare_discount_fixed_amount = Number(fareFixedDiscount || 0);
        }
      }

      const res = await api.post('/flight-tickets', payload);
      const id = Number(res.data.data?.id);

      // Upload files if any (similar to visa modal)
      if (files.length > 0) {
        for (const file of files) {
          try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('label', 'مرفق');
            await api.post(`/flight-tickets/${id}/attachments`, fd, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          } catch {
            // Ignore individual file upload failures
          }
        }
      }

      onCreated(id);
      onClose();

      // reset
      setPassengerName('');
      setPassengerPhone('');
      setPnr('');
      setFlightAtLocal('');
      setForWhom('customer');
      setOfficeId('');
      setPartyName('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerPartyId(null);
      setCustomerResults([]);
      setCustomerSearchOpen(false);
      setCustomerSearching(false);
      setAirlineId('');
      setBuyAmount(0);
      setSellAmount(0);
      setSellCurrency('USD');
      setFareBaseAmount(0);
      setFareFixedDiscount(0);
      setFareChoiceType('fixed');
      setFareChoiceBase(0);
      setFareChoicePercent(0);
      setFiles([]);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل حفظ التذكرة');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="إضافة تذكرة طيران" width="max-w-4xl">
      {errMeta && (
        <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200 mb-3">
          {errMeta}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* معلومات المسافر */}
        <div className="md:col-span-2 border-b border-slate-800/60 pb-3 mb-2">
          <div className="text-sm font-bold text-slate-300">معلومات المسافر</div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">اسم صاحب الطلب</div>
          <Input 
            value={passengerName} 
            onChange={(e) => setPassengerName(e.target.value)} 
            placeholder="مثال: أحمد محمد"
            className="w-full"
          />
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">موبايل صاحب الطلب</div>
          <Input 
            value={passengerPhone} 
            onChange={(e) => setPassengerPhone(e.target.value)} 
            placeholder="09xxxxxxxx"
            className="w-full"
          />
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">PNR</div>
          <Input
            value={pnr}
            onChange={(e) => setPnr(e.target.value)}
            placeholder="ABC123"
            className="w-full"
          />
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">عدد الركاب</div>
          <Input
            type="number"
            min="1"
            value={passengerCount}
            onChange={(e) => setPassengerCount(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">موعد الذهاب</div>
          <Input
            type="datetime-local"
            value={flightAtLocal}
            onChange={(e) => setFlightAtLocal(e.target.value)}
            className="w-full"
          />
          <div className="mt-1 text-[11px] text-slate-500">سيصلك تنبيه قبل موعد الذهاب بـ 24 ساعة.</div>
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">موعد العودة <span className="text-slate-600">(اختياري)</span></div>
          <Input
            type="datetime-local"
            value={returnFlightAtLocal}
            onChange={(e) => setReturnFlightAtLocal(e.target.value)}
            className="w-full"
          />
          {returnFlightAtLocal && <div className="mt-1 text-[11px] text-slate-500">سيصلك تنبيه قبل موعد العودة بـ 24 ساعة.</div>}
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">شركة الطيران</div>
          <Select 
            value={String(airlineId)} 
            onChange={(e) => setAirlineId(Number(e.target.value) || '')}
            className="w-full"
          >
            <option value="">اختر شركة…</option>
            {airlines.filter((a) => a.is_active === 1).map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.currency_code})</option>
            ))}
          </Select>
          {airlines.filter((a) => a.is_active === 1).length === 0 && !loadingMeta && canAddAirline && (
            <div className="mt-1.5 text-[11px] text-amber-400">
              لا توجد شركات طيران.{' '}
              <a href="/airlines" target="_blank" className="text-brand-400 underline hover:text-brand-300">
                أضف شركة من صفحة شركات الطيران
              </a>
            </div>
          )}
          {airlines.filter((a) => a.is_active === 1).length === 0 && !loadingMeta && !canAddAirline && (
            <div className="mt-1.5 text-[11px] text-amber-400">
              لا توجد شركات طيران. تواصل مع مدير التذاكر لإضافة شركة.
            </div>
          )}
        </div>

        {/* معلومات الفوترة */}
        <div className="md:col-span-2 border-b border-slate-800/60 pb-3 mb-2 mt-2">
          <div className="text-sm font-bold text-slate-300">معلومات الفوترة</div>
        </div>

                <div className={forWhom === 'office' ? '' : 'md:col-span-2'}>
                  <div className="text-xs text-slate-400 mb-1">لصالح</div>
                  <Select 
                    value={forWhom} 
                    onChange={(e) => {
                      const next = e.target.value as any;
                      setForWhom(next);
                      setOfficeId('');
                      setPartyName('');
                      setCustomerName('');
                      setCustomerPhone('');
                      setCustomerPartyId(null);
                      setCustomerResults([]);
                      setCustomerSearchOpen(false);
                      setCustomerSearching(false);
                    }}
                    className="w-full"
                  >
                    <option value="customer">عميل مكتبنا</option>
                    <option value="office">مكتب شريك</option>
                  </Select>
                </div>
                {/* اسم الجهة (للفوترة) */}
                {forWhom === 'office' && (
                  <div className="md:col-span-2">
                    <div className="text-xs text-slate-400 mb-1">اسم المكتب (يدوي)</div>
                    <Input
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      placeholder="اسم المكتب (يدوي)"
                      className="w-full"
                    />
                    <div className="mt-1 text-[11px] text-slate-500">اختياري — يُستخدم فقط إذا لم تختر مكتباً من القائمة.</div>
                  </div>
                )}

                {forWhom === 'customer' && (
                  <div className="md:col-span-2 p-3 rounded-2xl bg-slate-800/30 border border-slate-700/50 space-y-3">
                    <div className="text-xs font-bold text-amber-400">العميل (الذمة المالية)</div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="relative">
                        <div className="text-xs text-slate-400 mb-1">اسم العميل</div>
                        <Input
                          ref={customerInputRef as any}
                          value={customerName}
                          onChange={(e) => {
                            setCustomerName(e.target.value);
                            setCustomerPartyId(null);
                          }}
                          onFocus={() => setCustomerSearchOpen(true)}
                          onBlur={() => window.setTimeout(() => setCustomerSearchOpen(false), 150)}
                          placeholder="اكتب أول حرفين ليقترح أسماء العملاء"
                          className="w-full"
                        />

                        {customerSearchOpen && customerName.trim().length >= 2 && (
                          <div className="absolute z-20 mt-1 w-full rounded-2xl border border-slate-700/60 bg-slate-950 shadow-xl overflow-hidden">
                            {customerSearching ? (
                              <div className="p-3 text-xs text-slate-400">جاري البحث…</div>
                            ) : customerResults.length === 0 ? (
                              <div className="p-3 text-xs text-slate-500">لا توجد نتائج</div>
                            ) : (
                              <div className="max-h-56 overflow-auto">
                                {customerResults.map((c) => (
                                  <button
                                    type="button"
                                    key={c.id}
                                    className="w-full text-right px-3 py-2 hover:bg-slate-800/50 transition"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setCustomerPartyId(Number(c.id));
                                      setCustomerName(String(c.name || ''));
                                      setCustomerPhone(String((c as any).phone || ''));
                                      setCustomerSearchOpen(false);
                                    }}
                                  >
                                    <div className="text-sm font-bold text-slate-100 truncate">{c.name}</div>
                                    <div className="text-[11px] text-slate-500" dir="ltr">{(c as any).phone || '—'}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-1 text-[11px] text-slate-500">
                          {customerPartyId ? 'تم اختيار عميل مسجّل' : 'يمكنك إدخال اسم جديد (سيتم حفظه تلقائيًا)'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-slate-400 mb-1">رقم الموبايل 1</div>
                          <Input
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(String(e.target.value || '').replace(/[^0-9]/g,''))}
                            dir="ltr"
                            placeholder="09xxxxxxxx"
                            className="w-full"
                          />
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">رقم الموبايل 2</div>
                          <Input
                            value={customerPhone2}
                            onChange={(e) => setCustomerPhone2(String(e.target.value || '').replace(/[^0-9]/g,''))}
                            dir="ltr"
                            placeholder="09xxxxxxxx"
                            className="w-full"
                          />
                        </div>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">إذا اخترت عميلًا من الاقتراحات سيتم تعبئة الرقم تلقائيًا.</div>
                    </div>
                  </div>
                )}

{forWhom === 'office' && (
          <div>
            <div className="text-xs text-slate-400 mb-1">اسم المكتب</div>
            <Select 
              value={String(officeId)} 
              onChange={(e) => setOfficeId(Number(e.target.value) || '')}
              className="w-full"
            >
              <option value="">اختر مكتب…</option>
              {offices.length === 0 && !loadingMeta && (
                <option value="" disabled>لا توجد مكاتب متاحة</option>
              )}
              {offices.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </Select>
            {offices.length === 0 && !loadingMeta && (
              <div className="mt-1 text-[11px] text-amber-400">
                لا توجد مكاتب شريكة. يمكن إضافتها من قسم "المكاتب"
              </div>
            )}
            {loadingMeta && (
              <div className="mt-1 text-[11px] text-slate-400">جاري التحميل...</div>
            )}
          </div>
        )}

        {/* الأسعار */}
        <div className="md:col-span-2 border-b border-slate-800/60 pb-3 mb-2 mt-2">
          <div className="text-sm font-bold text-slate-300">الأسعار</div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">سعر الشراء ({buyCurrency})</div>
          <Input 
            type="number" 
            value={buyAmount} 
            onChange={(e) => setBuyAmount(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">سعر المبيع</div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input 
                type="number" 
                value={sellAmount} 
                onChange={(e) => setSellAmount(Number(e.target.value))}
                placeholder="100"
                className="w-full"
              />
            </div>
            <div className="w-24">
              <Select 
                value={sellCurrency} 
                onChange={(e) => setSellCurrency(e.target.value)}
                className="w-full"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">ملاحظة: التحويل إلى USD يتم حسب سعر الصرف المعرّف بالمحاسبة.</div>
        </div>

        {airline?.has_fare_discount === 1 && (
          <div className="md:col-span-2 rounded-2xl border border-slate-800/60 bg-slate-900/20 p-3">
            <div className="text-xs text-slate-300 font-bold mb-2">حسم الفير (حسب شركة الطيران)</div>

            {airline.fare_discount_type === 'per_ticket_choice' ? (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-400 mb-1">نوع الحسم</div>
                  <Select
                    value={fareChoiceType}
                    onChange={(e) => setFareChoiceType(e.target.value as 'fixed' | 'percent' | 'none')}
                    className="w-full"
                  >
                    <option value="fixed">مبلغ ثابت</option>
                    <option value="percent">نسبة %</option>
                    <option value="none">بلا فير</option>
                  </Select>
                </div>
                {fareChoiceType === 'none' ? (
                  <div className="text-xs text-slate-500">لا يوجد حسم فير لهذه التذكرة</div>
                ) : fareChoiceType === 'fixed' ? (
                  <div>
                    <div className="text-xs text-slate-400 mb-1">قيمة الحسم (USD)</div>
                    <Input
                      type="number"
                      value={fareChoiceBase}
                      onChange={(e) => setFareChoiceBase(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">فير التذكرة (USD)</div>
                      <Input
                        type="number"
                        value={fareChoiceBase}
                        onChange={(e) => setFareChoiceBase(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">النسبة %</div>
                      <Input
                        type="number"
                        value={fareChoicePercent}
                        onChange={(e) => setFareChoicePercent(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : airline.fare_discount_type === 'percent' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <div className="text-xs text-slate-400 mb-1">قيمة الفير التي ستُطبّق عليها النسبة (USD)</div>
                  <Input
                    type="number"
                    value={fareBaseAmount}
                    onChange={(e) => setFareBaseAmount(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">النسبة</div>
                  <Input value={`${percent}%`} disabled className="w-full" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-400 mb-1">مبلغ حسم الفير (USD)</div>
                  <Input
                    type="number"
                    value={fareFixedDiscount}
                    onChange={(e) => setFareFixedDiscount(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            <div className="mt-2 text-xs text-slate-500">
              الحسم المحسوب: <span className="text-slate-200 font-bold">{Number.isFinite(computedDiscountUsd) ? computedDiscountUsd.toFixed(2) : '0.00'} USD</span>
            </div>
          </div>
        )}

        {/* رفع الملفات */}
        <div className="md:col-span-2 border-t border-slate-800/60 pt-3 mt-2">
          <div className="text-sm font-bold text-slate-300 mb-2">المرفقات (اختياري)</div>
          
          <label className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-900/20 px-4 py-6 text-sm text-slate-400 hover:border-brand-600/50 hover:bg-slate-900/40 cursor-pointer transition">
            <Upload size={18} />
            <span>اختر الملفات أو اسحبها هنا</span>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-800/60 bg-slate-900/20 px-3 py-2 text-xs">
                  <span className="flex-1 text-slate-300 truncate">{file.name}</span>
                  <span className="text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-slate-400 hover:text-red-400 transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200">{error}</div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button disabled={saving || loadingMeta} onClick={create}>
          {saving ? 'حفظ…' : 'حفظ التذكرة'}
        </Button>
      </div>
    </Modal>
  );
}
