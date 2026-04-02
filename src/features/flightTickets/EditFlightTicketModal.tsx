import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import type { FlightTicketDetails } from '../../utils/types';

type AirlineOpt = {
  id: number;
  name: string;
  currency_code: string;
  has_fare_discount: 0 | 1;
  fare_discount_type: 'percent' | 'fixed' | 'per_ticket_choice' | null;
  fare_discount_value: number | null;
};

type OfficeOpt = { id: number; name: string; type: 'office' };

type CurrencyOpt = { code: string; name: string };

export function EditFlightTicketModal({
  open,
  ticket,
  passengerOnly = false,
  onClose,
  onSaved,
}: {
  open: boolean;
  ticket: FlightTicketDetails | null;
  passengerOnly?: boolean;
  onClose: () => void;
  onSaved: (next: any) => void;
}) {
  const [airlines, setAirlines] = useState<AirlineOpt[]>([]);
  const [offices, setOffices] = useState<OfficeOpt[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOpt[]>([{ code: 'USD', name: 'USD' }, { code: 'SYP', name: 'SYP' }]);

  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [pnr, setPnr] = useState('');
  const [passengerCount, setPassengerCount] = useState('1');
  const [flightAtLocal, setFlightAtLocal] = useState('');
  const [returnFlightAtLocal, setReturnFlightAtLocal] = useState('');

  const [billingPartyType, setBillingPartyType] = useState<'customer' | 'office'>('customer');
  const [billingPartyName, setBillingPartyName] = useState('');
  const [officePartyId, setOfficePartyId] = useState<number | ''>('');

  const [airlineCompanyId, setAirlineCompanyId] = useState<number | ''>('');
  const [buyAmount, setBuyAmount] = useState<string>('');
  const [sellAmount, setSellAmount] = useState<string>('');
  const [sellCurrency, setSellCurrency] = useState('USD');

  const [fareBaseAmount, setFareBaseAmount] = useState<string>('');
  const [fareDiscountFixedAmount, setFareDiscountFixedAmount] = useState<string>('');
  // Type 4 (per_ticket_choice)
  const [fareChoiceType, setFareChoiceType] = useState<'fixed' | 'percent'>('fixed');
  const [fareChoiceBase, setFareChoiceBase] = useState<string>('');
  const [fareChoicePercent, setFareChoicePercent] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const airline = useMemo(() => airlines.find((a) => a.id === Number(airlineCompanyId)), [airlines, airlineCompanyId]);


  function isoToLocalInput(iso?: string | null) {
    if (!iso) return '';
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        // Keep response parsing consistent with CreateFlightTicketModal.
        // Backend returns { items } for airlines and { data } for offices.
        const [aRes, oRes] = await Promise.all([api.get('/airlines'), api.get('/meta/offices')]);

        const airlinesData = aRes.data?.items || [];
        const officesData = oRes.data?.data || [];

        setAirlines(airlinesData);
        setOffices(officesData);
        try {
          const curRes = await api.get('/meta/currencies');
          setCurrencies(curRes.data.data || currencies);
        } catch {
          // fallback already set
        }
      } catch {
        // ignore
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open || !ticket) return;
    setError(null);

    setPassengerName(ticket.passenger_name || '');
    setPassengerPhone(ticket.passenger_phone || '');
    setPnr(ticket.pnr || '');
    setPassengerCount(String(ticket.passenger_count || 1));
    setFlightAtLocal(isoToLocalInput((ticket as any).flight_at || null));
    setReturnFlightAtLocal(isoToLocalInput((ticket as any).return_flight_at || null));

    setBillingPartyType(ticket.billing_party_type || 'customer');
    setBillingPartyName(ticket.billing_party_name || ticket.passenger_name || '');

    // best effort: when billing is office, use billing_party_id as office selector
    setOfficePartyId(ticket.billing_party_type === 'office' ? (ticket.billing_party_id || '') : '');

    setAirlineCompanyId(ticket.airline_company_id || '');
    setBuyAmount(String(ticket.buy_amount ?? ''));
    setSellAmount(String(ticket.sell_amount ?? ''));
    setSellCurrency(String(ticket.sell_currency_code || 'USD').toUpperCase());

    setFareBaseAmount(ticket.fare_base_amount ? String(ticket.fare_base_amount) : '');
    // for fixed airlines, use the USD value (fare inputs are now in USD)
    setFareDiscountFixedAmount(ticket.fare_discount_usd ? String(ticket.fare_discount_usd) : '');
    // Type 4: reset per-ticket choice fields
    setFareChoiceType('fixed');
    setFareChoiceBase('');
    setFareChoicePercent('');
  }, [open, ticket]);

  function buildPayload() {
    if (!ticket) return {};
    const payload: any = {};

    if (passengerName !== (ticket.passenger_name || '')) payload.passenger_name = passengerName;
    if ((passengerPhone || '') !== (ticket.passenger_phone || '')) payload.passenger_phone = passengerPhone;
    if ((pnr || '') !== (ticket.pnr || '')) payload.pnr = pnr;
    if (Number(passengerCount) !== Number(ticket.passenger_count || 1)) payload.passenger_count = Number(passengerCount);


    {
      const nextIso = flightAtLocal ? new Date(flightAtLocal).toISOString() : null;
      const prevIso = (ticket as any).flight_at ? new Date((ticket as any).flight_at as any).toISOString() : null;
      if (nextIso !== prevIso) payload.flight_at = nextIso;
    }
    {
      const nextIso = returnFlightAtLocal ? new Date(returnFlightAtLocal).toISOString() : null;
      const prevIso = (ticket as any).return_flight_at ? new Date((ticket as any).return_flight_at as any).toISOString() : null;
      if (nextIso !== prevIso) payload.return_flight_at = nextIso;
    }

    if (passengerOnly) return payload;

    if (billingPartyType !== ticket.billing_party_type) payload.billing_party_type = billingPartyType;
    if ((billingPartyName || '') !== (ticket.billing_party_name || '')) payload.billing_party_name = billingPartyName;

    if (billingPartyType === 'office') {
      const nextOffice = officePartyId === '' ? null : Number(officePartyId);
      const prevOffice = ticket.billing_party_type === 'office' ? (ticket.billing_party_id || null) : null;
      if (nextOffice !== prevOffice) payload.office_party_id = nextOffice;
    }

    if (Number(airlineCompanyId) !== Number(ticket.airline_company_id)) payload.airline_company_id = Number(airlineCompanyId);

    const nextBuy = Number(buyAmount || 0);
    if (Number.isFinite(nextBuy) && nextBuy >= 0 && nextBuy !== Number(ticket.buy_amount)) payload.buy_amount = nextBuy;

    const nextSell = Number(sellAmount || 0);
    if (Number.isFinite(nextSell) && nextSell >= 0 && nextSell !== Number(ticket.sell_amount)) payload.sell_amount = nextSell;

    if (String(sellCurrency).toUpperCase() !== String(ticket.sell_currency_code || 'USD').toUpperCase()) {
      payload.sell_currency_code = String(sellCurrency).toUpperCase();
    }

    // Fare inputs
    if (airline?.has_fare_discount === 1) {
      if (airline.fare_discount_type === 'per_ticket_choice') {
        payload.fare_choice_type = fareChoiceType;
        if (fareChoiceType === 'fixed') {
          const nextFixed = Number(fareChoiceBase || 0);
          if (Number.isFinite(nextFixed) && nextFixed >= 0) payload.fare_discount_fixed_amount = nextFixed;
        } else {
          const nextBase = Number(fareChoiceBase || 0);
          const nextPct = Number(fareChoicePercent || 0);
          if (Number.isFinite(nextBase) && nextBase >= 0) payload.fare_base_amount = nextBase;
          if (Number.isFinite(nextPct) && nextPct >= 0) payload.fare_choice_percent = nextPct;
        }
      } else if (airline.fare_discount_type === 'percent') {
        const nextBase = Number(fareBaseAmount || 0);
        const prevBase = Number(ticket.fare_base_amount || 0);
        if (Number.isFinite(nextBase) && nextBase >= 0 && nextBase !== prevBase) payload.fare_base_amount = nextBase;
      } else {
        const nextFixed = Number(fareDiscountFixedAmount || 0);
        const prevFixed = Number(ticket.fare_discount_amount || 0);
        if (Number.isFinite(nextFixed) && nextFixed >= 0 && nextFixed !== prevFixed) payload.fare_discount_fixed_amount = nextFixed;
      }
    }

    return payload;
  }

  async function submit() {
    if (!ticket) return;
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      const res = await api.put(`/flight-tickets/${ticket.id}`, payload);
      onSaved(res.data.data);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر حفظ التعديل');
    } finally {
      setSaving(false);
    }
  }

  const fareMode = airline?.has_fare_discount === 1 ? airline.fare_discount_type : null;

  return (
    <Modal open={open} title="تعديل التذكرة" onClose={onClose} width="max-w-2xl">
      {!ticket ? (
        <div className="text-sm text-slate-300">لا توجد تذكرة</div>
      ) : (
        <div className="space-y-4">
          {error && <div className="rounded-2xl border border-red-800/60 bg-red-950/40 p-3 text-xs text-red-200">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">اسم المسافر</div>
              <Input value={passengerName} onChange={(e) => setPassengerName(e.target.value)} placeholder="اسم المسافر" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">هاتف</div>
              <Input value={passengerPhone} onChange={(e) => setPassengerPhone(e.target.value)} placeholder="" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">PNR</div>
              <Input value={pnr} onChange={(e) => setPnr(e.target.value)} placeholder="" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">عدد الركاب</div>
              <Input type="number" min="1" value={passengerCount} onChange={(e) => setPassengerCount(e.target.value)} />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">موعد الذهاب</div>
              <Input type="datetime-local" value={flightAtLocal} onChange={(e) => setFlightAtLocal(e.target.value)} />
              <div className="mt-1 text-[11px] text-slate-500">تنبيه قبل 24 ساعة.</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">موعد العودة <span className="text-slate-600">(اختياري)</span></div>
              <Input type="datetime-local" value={returnFlightAtLocal} onChange={(e) => setReturnFlightAtLocal(e.target.value)} />
              {returnFlightAtLocal && <div className="mt-1 text-[11px] text-slate-500">تنبيه قبل 24 ساعة.</div>}
            </div>
          </div>

          

          {passengerOnly && (
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/20 p-3 text-xs text-slate-300">
              يمكنك تعديل بيانات المسافر و PNR فقط.
            </div>
          )}
          {!passengerOnly && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">الجهة الدافعة</div>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm"
                value={billingPartyType}
                onChange={(e) => setBillingPartyType(e.target.value as any)}
              >
                <option value="customer">عميل</option>
                <option value="office">مكتب</option>
              </select>
            </div>

            {billingPartyType === 'office' ? (
              <div>
                <div className="text-xs text-slate-400 mb-1">المكتب</div>
                <select
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm"
                  value={officePartyId}
                  onChange={(e) => setOfficePartyId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">— اختر —</option>
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.type})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <div className="text-xs text-slate-400 mb-1">اسم العميل</div>
                <Input value={billingPartyName} onChange={(e) => setBillingPartyName(e.target.value)} placeholder="" />
              </div>
            )}

            <div>
              <div className="text-xs text-slate-400 mb-1">شركة الطيران</div>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm"
                value={airlineCompanyId}
                onChange={(e) => setAirlineCompanyId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">— اختر —</option>
                {airlines.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">شراء (عملة شركة الطيران)</div>
              <Input value={buyAmount} onChange={(e) => setBuyAmount(e.target.value)} placeholder="" type="number" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">بيع</div>
              <Input value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} placeholder="" type="number" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">عملة البيع</div>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm"
                value={sellCurrency}
                onChange={(e) => setSellCurrency(e.target.value)}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {fareMode === 'percent' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">أساس عمولة الحسم (USD)</div>
                <Input value={fareBaseAmount} onChange={(e) => setFareBaseAmount(e.target.value)} placeholder="" type="number" />
              </div>
              <div className="md:col-span-2 text-xs text-slate-400 flex items-end">
                سيتم حساب الحسم كنسبة حسب إعداد شركة الطيران
              </div>
            </div>
          )}

          {fareMode === 'fixed' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">حسم ثابت (USD)</div>
                <Input value={fareDiscountFixedAmount} onChange={(e) => setFareDiscountFixedAmount(e.target.value)} placeholder="" type="number" />
              </div>
              <div className="md:col-span-2 text-xs text-slate-400 flex items-end">
                قيمة الحسم تُدخل لكل تذكرة بالدولار
              </div>
            </div>
          )}

          {fareMode === 'per_ticket_choice' && (
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/20 p-3 space-y-3">
              <div className="text-xs text-slate-300 font-bold">حسم الفير (نوع 4 — حر)</div>
              <div>
                <div className="text-xs text-slate-400 mb-1">نوع الحسم</div>
                <Select value={fareChoiceType} onChange={(e) => setFareChoiceType(e.target.value as 'fixed' | 'percent')} className="w-full">
                  <option value="fixed">مبلغ ثابت</option>
                  <option value="percent">نسبة %</option>
                </Select>
              </div>
              {fareChoiceType === 'fixed' ? (
                <div>
                  <div className="text-xs text-slate-400 mb-1">قيمة الحسم (USD)</div>
                  <Input value={fareChoiceBase} onChange={(e) => setFareChoiceBase(e.target.value)} placeholder="" type="number" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">فير التذكرة (USD)</div>
                    <Input value={fareChoiceBase} onChange={(e) => setFareChoiceBase(e.target.value)} placeholder="" type="number" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">النسبة %</div>
                    <Input value={fareChoicePercent} onChange={(e) => setFareChoicePercent(e.target.value)} placeholder="" type="number" />
                  </div>
                </div>
              )}
            </div>
          )}
            </>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button tone="ghost" onClick={onClose} disabled={saving}>إلغاء</Button>
            <Button onClick={submit} loading={saving}>حفظ</Button>
          </div>

          <div className="text-[11px] text-slate-500">
            ملاحظة: إذا كان هناك تحصيل مسبق على التذكرة، قد لا يُسمح بتعديل الأسعار من حساب الموظف.
          </div>
        </div>
      )}
    </Modal>
  );
}
