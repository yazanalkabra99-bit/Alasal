import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';

type CurrencyOpt = { code: string; name?: string };
type PartyOpt = { id: number; name: string; phone?: string | null; status?: string };

type Booking = {
  id: number;
  party_id?: number | null;
  party_type?: string;
  party_name?: string;
  party_phone?: string | null;
  hotel_office_id?: number | null;
  hotel_name?: string | null;
  guest_name?: string;
  check_in_date?: string | null;
  check_out_date?: string | null;
  nights?: number | null;
  room_details?: string | null;
  confirmation_number?: string | null;
  cost_amount?: number;
  cost_currency_code?: string;
  sell_amount?: number;
  sell_currency_code?: string;
  notes?: string | null;
};

export function EditHotelBookingModal({
  open,
  onClose,
  onSaved,
  booking,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  booking: Booking | null;
}) {
  const [currencies, setCurrencies] = useState<CurrencyOpt[]>([
    { code: 'USD', name: 'USD' },
    { code: 'SYP', name: 'SYP' },
    { code: 'AED', name: 'AED' },
  ]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [partyType, setPartyType] = useState<'customer' | 'office'>('customer');
  const [partyName, setPartyName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [partyId, setPartyId] = useState<number | null>(null);
  const [partyResults, setPartyResults] = useState<PartyOpt[]>([]);
  const [partySearchOpen, setPartySearchOpen] = useState(false);
  const [partySearching, setPartySearching] = useState(false);
  const partySearchTimerRef = useRef<number | null>(null);

  const [hotelOfficeId, setHotelOfficeId] = useState<number | null>(null);
  const [hotelName, setHotelName] = useState('');
  const [hotelResults, setHotelResults] = useState<PartyOpt[]>([]);
  const [hotelSearchOpen, setHotelSearchOpen] = useState(false);
  const [hotelSearching, setHotelSearching] = useState(false);
  const hotelSearchTimerRef = useRef<number | null>(null);

  const [guestName, setGuestName] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [nights, setNights] = useState<number>(1);
  const [roomDetails, setRoomDetails] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');

  const [costAmount, setCostAmount] = useState<number>(0);
  const [costCurrency, setCostCurrency] = useState('USD');
  const [sellAmount, setSellAmount] = useState<number>(0);
  const [sellCurrency, setSellCurrency] = useState('USD');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-populate
  useEffect(() => {
    if (!open || !booking) return;
    setError(null);
    setPartyType((booking.party_type as 'customer' | 'office') || 'customer');
    setPartyName(booking.party_name || '');
    setPartyPhone(booking.party_phone || '');
    setPartyId(booking.party_id ?? null);
    setHotelOfficeId(booking.hotel_office_id ?? null);
    setHotelName(booking.hotel_name || '');
    setGuestName(booking.guest_name || '');
    setCheckInDate(booking.check_in_date || '');
    setCheckOutDate(booking.check_out_date || '');
    setNights(Number(booking.nights || 1));
    setRoomDetails(booking.room_details || '');
    setConfirmationNumber(booking.confirmation_number || '');
    setCostAmount(Number(booking.cost_amount || 0));
    setCostCurrency(booking.cost_currency_code || 'USD');
    setSellAmount(Number(booking.sell_amount || 0));
    setSellCurrency(booking.sell_currency_code || 'USD');
    setNotes(booking.notes || '');
    setPartyResults([]);
    setPartySearchOpen(false);
    setHotelResults([]);
    setHotelSearchOpen(false);
  }, [open, booking]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingMeta(true);
      try {
        const curRes = await api.get('/currencies').catch(() => ({ data: { data: [] } }));
        const curList = (curRes.data.data || [])
          .filter((c: any) => c.is_active)
          .map((c: any) => ({ code: c.code, name: `${c.code} - ${c.name}` }));
        if (curList.length > 0) setCurrencies(curList);
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, [open]);

  // Auto-calc nights
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const inD = new Date(checkInDate);
      const outD = new Date(checkOutDate);
      const diff = Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 0) setNights(diff);
    }
  }, [checkInDate, checkOutDate]);

  // Party search
  useEffect(() => {
    if (!open) return;
    const q = partyName.trim();
    if (q.length < 2) { setPartyResults([]); setPartySearching(false); return; }
    if (partySearchTimerRef.current) window.clearTimeout(partySearchTimerRef.current);
    partySearchTimerRef.current = window.setTimeout(async () => {
      setPartySearching(true);
      try {
        const res = await api.get('/meta/parties', { params: { type: partyType, q, limit: 10 } });
        setPartyResults((res.data.data || []).filter((c: any) => c?.status !== 'inactive'));
      } catch { setPartyResults([]); }
      finally { setPartySearching(false); }
    }, 250);
    return () => { if (partySearchTimerRef.current) window.clearTimeout(partySearchTimerRef.current); };
  }, [open, partyName, partyType]);

  // Hotel search
  useEffect(() => {
    if (!open) return;
    const q = hotelName.trim();
    if (q.length < 2) { setHotelResults([]); setHotelSearching(false); return; }
    if (hotelSearchTimerRef.current) window.clearTimeout(hotelSearchTimerRef.current);
    hotelSearchTimerRef.current = window.setTimeout(async () => {
      setHotelSearching(true);
      try {
        const res = await api.get('/meta/parties', { params: { type: 'office', q, limit: 10 } });
        setHotelResults((res.data.data || []).filter((c: any) => c?.status !== 'inactive'));
      } catch { setHotelResults([]); }
      finally { setHotelSearching(false); }
    }, 250);
    return () => { if (hotelSearchTimerRef.current) window.clearTimeout(hotelSearchTimerRef.current); };
  }, [open, hotelName]);

  async function handleSubmit() {
    if (!booking) return;
    if (!guestName.trim()) return setError('اسم النزيل مطلوب');
    if (!partyName.trim()) return setError('اسم الطرف مطلوب');
    if (costAmount <= 0) return setError('سعر الشراء مطلوب');
    if (sellAmount <= 0) return setError('سعر البيع مطلوب');

    setSaving(true);
    setError(null);
    try {
      await api.patch(`/hotel-bookings/${booking.id}`, {
        party_type: partyType,
        party_id: partyId,
        party_name: partyName.trim(),
        party_phone: partyPhone.trim() || null,
        hotel_office_id: hotelOfficeId,
        guest_name: guestName.trim(),
        check_in_date: checkInDate || null,
        check_out_date: checkOutDate || null,
        nights: nights || 1,
        room_details: roomDetails.trim() || null,
        confirmation_number: confirmationNumber.trim() || null,
        cost_amount: costAmount,
        cost_currency_code: costCurrency,
        sell_amount: sellAmount,
        sell_currency_code: sellCurrency,
        notes: notes.trim() || null,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تعديل الحجز الفندقي');
    } finally {
      setSaving(false);
    }
  }

  const profitPreview = useMemo(() => {
    if (!(sellAmount > 0) || !(costAmount > 0)) return null;
    return sellAmount - costAmount;
  }, [sellAmount, costAmount]);

  return (
    <Modal open={open} onClose={onClose} title={`تعديل حجز فندقي #${booking?.id ?? ''}`} width="max-w-2xl">
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>
        )}

        {/* Booking Details */}
        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-3">
          <h4 className="text-xs font-bold text-rose-400">بيانات الحجز</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">اسم النزيل *</label>
              <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="اسم النزيل" />
            </div>

            <div className="relative md:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">الفندق</label>
              <Input
                value={hotelName}
                onChange={(e) => { setHotelName(e.target.value); setHotelOfficeId(null); }}
                onFocus={() => setHotelSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setHotelSearchOpen(false), 150)}
                placeholder="ابحث عن الفندق"
              />
              {hotelSearchOpen && hotelName.trim().length >= 2 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-950 shadow-xl overflow-hidden">
                  {hotelSearching ? (
                    <div className="p-3 text-xs text-slate-400">جاري البحث...</div>
                  ) : hotelResults.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500">لا توجد نتائج</div>
                  ) : (
                    <div className="max-h-56 overflow-auto">
                      {hotelResults.map((h) => (
                        <button type="button" key={h.id}
                          className="w-full text-right px-3 py-2 hover:bg-slate-800/50 transition"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setHotelOfficeId(Number(h.id)); setHotelName(String(h.name || '')); setHotelSearchOpen(false); }}
                        >
                          <div className="text-sm font-bold text-slate-100 truncate">{h.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">تاريخ الدخول</label>
              <Input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">تاريخ الخروج</label>
              <Input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">عدد الليالي</label>
              <Input type="number" value={nights} onChange={(e) => setNights(Number(e.target.value))} min={1} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">رقم التأكيد</label>
              <Input value={confirmationNumber} onChange={(e) => setConfirmationNumber(e.target.value)} dir="ltr" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">تفاصيل الغرفة</label>
              <Input value={roomDetails} onChange={(e) => setRoomDetails(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Financial */}
        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-3">
          <h4 className="text-xs font-bold text-amber-400">المالي</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">سعر الشراء *</label>
              <div className="flex gap-2">
                <Input type="number" value={costAmount} onChange={(e) => setCostAmount(Number(e.target.value))} className="flex-1" />
                <Select value={costCurrency} onChange={(e) => setCostCurrency(e.target.value)} className="w-24">
                  {currencies.map((c) => <option key={c.code} value={c.code}>{c.name || c.code}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">سعر البيع *</label>
              <div className="flex gap-2">
                <Input type="number" value={sellAmount} onChange={(e) => setSellAmount(Number(e.target.value))} className="flex-1" />
                <Select value={sellCurrency} onChange={(e) => setSellCurrency(e.target.value)} className="w-24">
                  {currencies.map((c) => <option key={c.code} value={c.code}>{c.name || c.code}</option>)}
                </Select>
              </div>
            </div>
            {profitPreview !== null && costCurrency === sellCurrency && (
              <div className="md:col-span-2 text-center p-2 rounded-lg bg-slate-700/30">
                <span className="text-[11px] text-slate-400">الربح المتوقع: </span>
                <span className={`font-bold ${profitPreview >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {profitPreview.toLocaleString('en-US', { maximumFractionDigits: 2 })} {costCurrency}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Party */}
        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-3">
          <h4 className="text-xs font-bold text-amber-400">الطرف</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">نوع الطرف</label>
              <Select value={partyType} onChange={(e) => {
                setPartyType(e.target.value as 'customer' | 'office');
                setPartyId(null); setPartyName(''); setPartyPhone(''); setPartyResults([]);
              }}>
                <option value="customer">عميل</option>
                <option value="office">مكتب</option>
              </Select>
            </div>
            <div className="relative">
              <label className="text-xs text-slate-400 mb-1 block">اسم {partyType === 'customer' ? 'العميل' : 'المكتب'} *</label>
              <Input
                value={partyName}
                onChange={(e) => { setPartyName(e.target.value); setPartyId(null); }}
                onFocus={() => setPartySearchOpen(true)}
                onBlur={() => window.setTimeout(() => setPartySearchOpen(false), 150)}
                placeholder="اكتب للبحث"
              />
              {partySearchOpen && partyName.trim().length >= 2 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-950 shadow-xl overflow-hidden">
                  {partySearching ? (
                    <div className="p-3 text-xs text-slate-400">جاري البحث...</div>
                  ) : partyResults.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500">لا توجد نتائج</div>
                  ) : (
                    <div className="max-h-56 overflow-auto">
                      {partyResults.map((p) => (
                        <button type="button" key={p.id}
                          className="w-full text-right px-3 py-2 hover:bg-slate-800/50 transition"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setPartyId(Number(p.id)); setPartyName(String(p.name || ''));
                            setPartyPhone(String(p.phone || '')); setPartySearchOpen(false);
                          }}
                        >
                          <div className="text-sm font-bold text-slate-100 truncate">{p.name}</div>
                          <div className="text-[11px] text-slate-500" dir="ltr">{p.phone || ''}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {partyType === 'customer' && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">رقم الهاتف</label>
                <Input value={partyPhone} onChange={(e) => setPartyPhone(e.target.value)} dir="ltr" />
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-3">
          <h4 className="text-xs font-bold text-amber-400">ملاحظات</h4>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-slate-900/50 border border-slate-700/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            placeholder="ملاحظات داخلية..."
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500">{loadingMeta ? 'تحميل العملات...' : ''}</div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>إغلاق</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
