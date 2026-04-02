import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';

type PartyOpt = { id: number; name: string; phone?: string; type: string };
type CurrencyOpt = { code: string; name: string };

interface RegisterPassengerModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  tripId: number;
}

export function RegisterPassengerModal({ open, onClose, onSaved, tripId }: RegisterPassengerModalProps) {
  const [partyType, setPartyType] = useState<'customer' | 'office'>('customer');
  const [partyId, setPartyId] = useState<number | null>(null);
  const [partyName, setPartyName] = useState('');
  const [partyResults, setPartyResults] = useState<PartyOpt[]>([]);
  const [partySearchOpen, setPartySearchOpen] = useState(false);
  const partyTimerRef = useRef<number | null>(null);

  const [passengerName, setPassengerName] = useState('');
  const [phone, setPhone] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [sellAmount, setSellAmount] = useState<number>(0);
  const [sellCurrency, setSellCurrency] = useState('USD');
  const [currencies, setCurrencies] = useState<CurrencyOpt[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setPartyType('customer'); setPartyId(null); setPartyName('');
      setPassengerName(''); setPhone(''); setPassportNumber('');
      setSellAmount(0); setSellCurrency('USD'); setNotes(''); setError('');
      api.get('/meta/currencies').then(r => {
        setCurrencies(r.data?.data || r.data || []);
      }).catch(() => {});
    }
  }, [open]);

  const searchParties = (q: string) => {
    setPartyName(q);
    setPartyId(null);
    if (partyTimerRef.current) clearTimeout(partyTimerRef.current);
    if (q.trim().length < 1) { setPartyResults([]); setPartySearchOpen(false); return; }
    partyTimerRef.current = window.setTimeout(async () => {
      try {
        const endpoint = '/meta/parties?type=' + partyType + '&q=' + encodeURIComponent(q.trim()) + '&limit=10';
        const res = await api.get(endpoint);
        const items = (res.data?.data || res.data || []).filter((p: PartyOpt) => p.id);
        setPartyResults(items);
        setPartySearchOpen(items.length > 0);
      } catch { setPartyResults([]); }
    }, 250);
  };

  const selectParty = (p: PartyOpt) => {
    setPartyId(p.id);
    setPartyName(p.name);
    setPartySearchOpen(false);
    if (!passengerName && partyType === 'customer') setPassengerName(p.name);
    if (!phone && p.phone) setPhone(p.phone);
  };

  const handleSubmit = async () => {
    if (!passengerName.trim()) { setError('اسم الراكب مطلوب'); return; }
    if (sellAmount <= 0) { setError('سعر البيع يجب أن يكون أكبر من صفر'); return; }
    if (partyType === 'office' && !partyId) { setError('يجب اختيار المكتب'); return; }

    setSaving(true); setError('');
    try {
      await api.post(`/trips/${tripId}/passengers`, {
        party_type: partyType,
        party_id: partyId || undefined,
        party_name: partyName.trim(),
        passenger_name: passengerName.trim(),
        phone: phone.trim() || null,
        passport_number: passportNumber.trim() || null,
        sell_amount: sellAmount,
        sell_currency_code: sellCurrency,
        notes: notes.trim() || null,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'حدث خطأ');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="تسجيل راكب جديد">
      <div className="space-y-4 p-4">
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>}

        {/* Party type toggle */}
        <div>
          <div className="text-xs text-slate-400 mb-1">نوع الطرف</div>
          <div className="flex gap-2">
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${partyType === 'customer' ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white'}`}
              onClick={() => { setPartyType('customer'); setPartyId(null); setPartyName(''); setPartyResults([]); }}
            >
              عميل
            </button>
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${partyType === 'office' ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white'}`}
              onClick={() => { setPartyType('office'); setPartyId(null); setPartyName(''); setPartyResults([]); }}
            >
              مكتب
            </button>
          </div>
        </div>

        {/* Party autocomplete */}
        <div className="relative">
          <div className="text-xs text-slate-400 mb-1">{partyType === 'office' ? 'المكتب *' : 'العميل (اسم أو بحث)'}</div>
          <Input
            value={partyName}
            onChange={e => searchParties(e.target.value)}
            placeholder={partyType === 'office' ? 'ابحث عن مكتب...' : 'ابحث أو اكتب اسم العميل...'}
          />
          {partySearchOpen && partyResults.length > 0 && (
            <div className="absolute z-30 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-40 overflow-auto">
              {partyResults.map(p => (
                <button key={p.id} className="w-full text-right px-3 py-2 hover:bg-slate-700 text-sm text-white" onClick={() => selectParty(p)}>
                  {p.name} {p.phone ? <span className="text-slate-400 text-xs">({p.phone})</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">اسم الراكب *</div>
          <Input value={passengerName} onChange={e => setPassengerName(e.target.value)} placeholder="الاسم الكامل" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-400 mb-1">الهاتف</div>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="اختياري" />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">رقم الجواز</div>
            <Input value={passportNumber} onChange={e => setPassportNumber(e.target.value)} placeholder="اختياري" />
          </div>
        </div>

        {/* Sell amount + currency */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <div className="text-xs text-slate-400 mb-1">سعر البيع *</div>
            <Input type="number" value={sellAmount} onChange={e => setSellAmount(Number(e.target.value))} min={0} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">العملة</div>
            <select
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-sm"
              value={sellCurrency}
              onChange={e => setSellCurrency(e.target.value)}
            >
              {currencies.length === 0 && <option value="USD">USD</option>}
              {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-xs text-slate-400">
          <span className="text-amber-400">ملاحظة:</span> تعيين الباص والمقعد يتم لاحقاً من قبل مدير الحملة
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">ملاحظات</div>
          <textarea className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-sm resize-none h-20"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'جاري التسجيل...' : 'تسجيل الراكب'}</Button>
        </div>
      </div>
    </Modal>
  );
}
