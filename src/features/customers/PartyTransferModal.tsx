import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';

type PartyOpt = { id: number; name: string; type: string; phone?: string };
type CurrencyOpt = { code: string; name?: string };

export function PartyTransferModal({
  open,
  onClose,
  fromPartyId,
  fromPartyName,
  fromPartyType,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  fromPartyId: number;
  fromPartyName?: string;
  fromPartyType?: string; // 'customer' | 'office'
  onSaved: () => void;
}) {
  const [toPartyId, setToPartyId] = useState<number | ''>('');
  const [toSearchQ, setToSearchQ] = useState('');
  const [toResults, setToResults] = useState<PartyOpt[]>([]);
  const [toSearchOpen, setToSearchOpen] = useState(false);
  const [toSelectedName, setToSelectedName] = useState('');
  const searchTimerRef = useRef<number | null>(null);

  const [amount, setAmount] = useState<number>(0);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [currencies, setCurrencies] = useState<CurrencyOpt[]>([
    { code: 'USD' }, { code: 'SYP' }, { code: 'AED' },
  ]);
  const [note, setNote] = useState('');
  const [happenedAt, setHappenedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setToPartyId('');
    setToSearchQ('');
    setToResults([]);
    setToSelectedName('');
    setAmount(0);
    setCurrencyCode('USD');
    setNote('');
    setHappenedAt(new Date().toISOString().slice(0, 10));

    (async () => {
      try {
        const curRes = await api.get('/currencies');
        const curList = (curRes.data.data || [])
          .filter((c: any) => c.is_active)
          .map((c: any) => ({ code: c.code, name: `${c.code} - ${c.name}` }));
        if (curList.length > 0) setCurrencies(curList);
      } catch { /* ignore */ }
    })();
  }, [open, fromPartyId]);

  function searchParties(q: string) {
    setToSearchQ(q);
    setToSearchOpen(true);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (q.length < 2) { setToResults([]); return; }
    searchTimerRef.current = window.setTimeout(async () => {
      try {
        // Search both customers and offices via /meta/parties
        const [custRes, offRes] = await Promise.all([
          api.get('/meta/parties', { params: { type: 'customer', q, limit: 15 } }),
          api.get('/meta/offices', { params: { q, limit: 15 } }),
        ]);
        const customers: PartyOpt[] = (custRes.data.data || [])
          .filter((c: any) => c.id !== fromPartyId)
          .map((c: any) => ({ id: c.id, name: c.name, type: 'customer', phone: c.phone }));
        const offices: PartyOpt[] = (offRes.data.data || [])
          .filter((o: any) => o.id !== fromPartyId)
          .map((o: any) => ({ id: o.id, name: o.name, type: 'office' }));
        setToResults([...customers, ...offices]);
      } catch { /* ignore */ }
    }, 300);
  }

  function selectParty(p: PartyOpt) {
    setToPartyId(p.id);
    setToSelectedName(`${p.name} (${p.type === 'customer' ? 'عميل' : 'مكتب'})`);
    setToSearchQ(`${p.name} (${p.type === 'customer' ? 'عميل' : 'مكتب'})`);
    setToSearchOpen(false);
  }

  async function save() {
    if (!toPartyId) return setError('اختر الجهة المستلمة');
    if (amount <= 0) return setError('المبلغ مطلوب');
    if (!note.trim()) return setError('الملاحظة مطلوبة');

    setLoading(true);
    setError(null);
    try {
      await api.post('/accounting/party-transfer', {
        from_party_id: fromPartyId,
        to_party_id: Number(toPartyId),
        amount: Number(amount),
        currency_code: currencyCode,
        note: note.trim(),
        happened_at: happenedAt ? new Date(happenedAt + 'T00:00:00').toISOString() : undefined,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'فشل حفظ التحويل');
    } finally {
      setLoading(false);
    }
  }

  const fromLabel = fromPartyType === 'office' ? 'مكتب' : 'عميل';

  return (
    <Modal open={open} onClose={onClose} title="تحويل رصيد بين الجهات" width="max-w-lg">
      {error && (
        <div className="rounded-2xl border border-red-800/60 bg-red-950/30 p-3 text-xs text-red-200 mb-3">
          {error}
        </div>
      )}

      {/* From party */}
      <div className="mb-4 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">من ({fromLabel}):</span>
          <span className="font-bold text-white">{fromPartyName || `#${fromPartyId}`}</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          سيتم نقل الرصيد (الذمة المالية) من هذا {fromLabel === 'مكتب' ? 'المكتب' : 'العميل'} إلى الجهة المستلمة
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* To party search */}
        <div className="md:col-span-2 relative">
          <div className="text-xs text-slate-400 mb-1">إلى (عميل أو مكتب) *</div>
          <Input
            value={toSearchQ}
            onChange={(e) => searchParties(e.target.value)}
            onFocus={() => toResults.length > 0 && setToSearchOpen(true)}
            placeholder="ابحث عن عميل أو مكتب..."
          />
          {toSearchOpen && toResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-lg max-h-48 overflow-auto">
              {toResults.map((p) => (
                <button
                  key={`${p.type}-${p.id}`}
                  onClick={() => selectParty(p)}
                  className="w-full text-right px-3 py-2 hover:bg-slate-700 text-sm flex items-center justify-between"
                >
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.type === 'customer' ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {p.type === 'customer' ? 'عميل' : 'مكتب'}
                  </span>
                  <span className="text-white">
                    {p.name}
                    {p.phone && <span className="text-slate-400 text-xs mr-2">{p.phone}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Amount + Currency */}
        <div>
          <div className="text-xs text-slate-400 mb-1">المبلغ *</div>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              step={0.01}
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="flex-1"
              placeholder="0.00"
            />
            <Select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} className="w-28">
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Date */}
        <div>
          <div className="text-xs text-slate-400 mb-1">التاريخ</div>
          <Input type="date" value={happenedAt} onChange={(e) => setHappenedAt(e.target.value)} />
        </div>

        {/* Note */}
        <div className="md:col-span-2">
          <div className="text-xs text-slate-400 mb-1">الملاحظة / السبب *</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none text-sm"
            placeholder="مثال: تحويل رصيد العميل X إلى مكتب Y..."
          />
        </div>
      </div>

      {/* Preview */}
      {amount > 0 && toPartyId && note.trim() && (
        <div className="mt-4 p-3 rounded-xl border border-blue-800/50 bg-blue-950/20">
          <div className="text-xs text-slate-400 mb-2">معاينة التحويل:</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-400 font-bold">-</span>
              <span className="text-slate-300">
                ينقص من ذمة <span className="text-white font-medium">{fromPartyName}</span> مبلغ{' '}
                <span className="text-white font-bold">{amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} {currencyCode}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-bold">+</span>
              <span className="text-slate-300">
                يزيد على ذمة <span className="text-white font-medium">{toSelectedName}</span> مبلغ{' '}
                <span className="text-white font-bold">{amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} {currencyCode}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button loading={loading} disabled={!toPartyId || amount <= 0 || !note.trim()} onClick={save}>
          تنفيذ التحويل
        </Button>
      </div>
    </Modal>
  );
}
