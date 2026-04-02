import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';

type CurrencyOpt = { code: string; name?: string };
type OfficeOpt = { id: number; name: string; type: string };

export function CreateExternalTicketModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
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

  // Customer selection UX:
  // 1) choose customer type first: office OR our customer
  // 2) for "our customer" use a lightweight autocomplete + phone, and allow new customers
  const [customerType, setCustomerType] = useState<'office' | 'customer'>('office');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPhone2, setCustomerPhone2] = useState('');
  const [customerPartyId, setCustomerPartyId] = useState<number | null>(null);

  const [customerResults, setCustomerResults] = useState<OfficeOpt[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearching, setCustomerSearching] = useState(false);
  const customerSearchTimerRef = useRef<number | null>(null);
  const customerInputRef = useRef<HTMLInputElement | null>(null);

  const [buyAmount, setBuyAmount] = useState<number>(0);
  const [buyCurrency, setBuyCurrency] = useState('USD');
  const [sellAmount, setSellAmount] = useState<number>(0);
  const [sellCurrency, setSellCurrency] = useState('USD');

  const [passengerCount, setPassengerCount] = useState<number>(1);

  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Smart default: start billing customer with passenger values
  useEffect(() => {
    if (!open) return;
    if (customerType !== 'customer') return;
    if (customerPartyId) return;
    if (!customerName.trim() && passengerName.trim()) setCustomerName(passengerName);
    if (!customerPhone.trim() && passengerPhone.trim()) setCustomerPhone(passengerPhone);
  }, [open, customerType, passengerName, passengerPhone, customerPartyId]);



  function reset() {
    setPassengerName('');
    setPassengerPhone('');
    setPnr('');
    setFlightAtLocal('');
    setAirlineCompanyName('');
    setSourceOfficeId('');
    setCustomerOfficeId('');
    setCustomerType('office');
    setCustomerName('');
    setCustomerResults([]);
    setCustomerSearchOpen(false);
    setCustomerSearching(false);
    setPassengerCount(1);
    setBuyAmount(0);
    setBuyCurrency('USD');
    setSellAmount(0);
    setSellCurrency('USD');
    setNotes('');
    setFiles([]);
    setError(null);
  }

  async function handleSubmit() {
    if (!passengerName.trim()) return setError('اسم صاحب الطلب مطلوب');
    if (!airlineCompanyName.trim()) return setError('شركة الطيران مطلوبة');
    if (!sourceOfficeId) return setError('اختر مكتب المصدر');
    if (customerType === 'office' && !customerOfficeId) return setError('اختر العميل');
    if (customerType === 'customer' && !customerName.trim()) return setError('اسم العميل مطلوب');
    if (customerType === 'customer' && customerPartyId && sourceOfficeId === customerPartyId) return setError('لا يمكن أن يكون المصدر نفس العميل');

    if (buyAmount <= 0) return setError('مبلغ الشراء مطلوب');
    if (sellAmount <= 0) return setError('مبلغ البيع مطلوب');

    setSaving(true);
    setError(null);
    try {
      const res = await api.post('/external-tickets', {
        passenger_name: passengerName.trim(),
        passenger_phone: passengerPhone.trim() || null,
        passenger_count: passengerCount,
        pnr: pnr.trim() || null,
        airline_company_name: airlineCompanyName.trim(),
        customer_type: customerType,
        customer_name: customerType === 'customer' ? customerName.trim() : null,
        customer_phone: customerType === 'customer' ? (customerPhone.trim() || passengerPhone.trim() || null) : null,
                customer_phone2: customerType === 'customer' ? (customerPhone2.trim() || null) : null,
        customer_party_id: customerType === 'customer' ? customerPartyId : null,
        flight_at: flightAtLocal ? new Date(flightAtLocal).toISOString() : null,
        return_flight_at: returnFlightAtLocal ? new Date(returnFlightAtLocal).toISOString() : null,
        source_office_id: Number(sourceOfficeId),
        customer_office_id: customerType === 'office' ? Number(customerOfficeId) : (customerPartyId ? Number(customerPartyId) : null),
        buy_amount: buyAmount,
        buy_currency_code: buyCurrency,
        sell_amount: sellAmount,
        sell_currency_code: sellCurrency,
        notes: notes.trim() || null,
      });

      const id = Number(res.data.data?.id);

      // Upload attachments if any
      if (files.length > 0 && Number.isFinite(id)) {
        for (const file of files) {
          try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('label', 'مرفق');
            await api.post(`/external-tickets/${id}/attachments`, fd, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          } catch {
            // ignore individual upload errors
          }
        }
      }

      reset();
      onCreated(id);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل إنشاء التذكرة');
    } finally {
      setSaving(false);
    }
  }

  const profitPreview = sellAmount - buyAmount;

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="تذكرة خارجية جديدة" width="max-w-2xl">
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>
        )}

        {/* Flight Details First */}
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
              <div className="mt-1 text-[11px] text-slate-500">سيصلك تنبيه قبل موعد الذهاب بـ 24 ساعة.</div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">موعد العودة <span className="text-slate-600">(اختياري)</span></label>
              <Input type="datetime-local" value={returnFlightAtLocal} onChange={(e) => setReturnFlightAtLocal(e.target.value)} />
              {returnFlightAtLocal && <div className="mt-1 text-[11px] text-slate-500">سيصلك تنبيه قبل موعد العودة بـ 24 ساعة.</div>}
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
                      // reset selection when switching type
                      setCustomerOfficeId('');
                      setCustomerName('');
                      setCustomerPhone('');
                      setCustomerPhone2('');
                      setCustomerPartyId(null);
                      setCustomerResults([]);
                      setCustomerSearchOpen(false);
                      setCustomerSearching(false);
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
                            ref={(r) => { customerInputRef.current = r; }}
                            value={customerName}
                            onChange={(e) => {
                              setCustomerName(e.target.value);
                              // once the user edits, require re-pick unless it still matches a selected id
                              setCustomerPartyId(null);
                              setCustomerPhone('');
                              setCustomerPhone2('');
                              setCustomerSearchOpen(true);
                            }}
                            onFocus={() => setCustomerSearchOpen(true)}
                            onBlur={() => {
                              // delay closing to allow click
                              window.setTimeout(() => setCustomerSearchOpen(false), 150);
                            }}
                            placeholder="اكتب اسم العميل..."
                          />

                          {/* Suggestions */}
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
                              <div className="px-3 py-2 text-[11px] text-slate-500 border-t border-slate-800/70">
                                اكتب حرفين أو أكثر لعرض الاقتراحات
                              </div>
                            </div>
                          )}

                          {/* Selected hint */}
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
                            onChange={(e) => setCustomerPhone(String(e.target.value || '').replace(/[^0-9]/g,''))}
                            dir="ltr"
                            placeholder="09xxxxxxxx"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 mb-1 block">رقم الموبايل 2</label>
                          <Input
                            value={customerPhone2}
                            onChange={(e) => setCustomerPhone2(String(e.target.value || '').replace(/[^0-9]/g,''))}
                            dir="ltr"
                            placeholder="09xxxxxxxx"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-[11px] text-slate-500">
                      لن تظهر قائمة ضخمة—ابدأ بكتابة اسم العميل وسيتم اقتراح النتائج.
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

          {/* Profit Preview */}
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

        {/* Attachments */}
        <div className="border-t border-slate-800/60 pt-3">
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

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
          <Button variant="secondary" onClick={() => { reset(); onClose(); }}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={saving}>إنشاء التذكرة</Button>
        </div>
      </div>
    </Modal>
  );
}
