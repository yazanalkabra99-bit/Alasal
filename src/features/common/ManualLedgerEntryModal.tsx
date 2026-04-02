import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';

type CurrencyOpt = { code: string; name?: string };

export function ManualLedgerEntryModal({
  open,
  onClose,
  partyId,
  partyType,
  partyName,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  partyId: number;
  partyType: 'customer' | 'office';
  partyName?: string;
  onSaved: () => void;
}) {
  const [direction, setDirection] = useState<'debit' | 'credit'>('debit');
  const [ledgerSide, setLedgerSide] = useState<'sell' | 'buy'>('sell');
  const [amount, setAmount] = useState<number>(0);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [currencies, setCurrencies] = useState<CurrencyOpt[]>([
    { code: 'USD', name: 'USD' },
    { code: 'SYP', name: 'SYP' },
    { code: 'AED', name: 'AED' },
  ]);
  const [note, setNote] = useState('');
  const [happenedAt, setHappenedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDirection('debit');
    setLedgerSide('sell');
    setAmount(0);
    setCurrencyCode('USD');
    setNote('');
    // Default happened_at to today
    const now = new Date();
    setHappenedAt(now.toISOString().slice(0, 10));

    (async () => {
      try {
        const res = await api.get('/currencies');
        const curList = (res.data.data || [])
          .filter((c: any) => c.is_active)
          .map((c: any) => ({ code: c.code, name: `${c.code} - ${c.name}` }));
        if (curList.length > 0) setCurrencies(curList);
      } catch { /* ignore */ }
    })();
  }, [open]);

  async function save() {
    if (amount <= 0) return setError('المبلغ مطلوب');
    if (!note.trim()) return setError('الوصف / السبب مطلوب');

    setLoading(true);
    setError(null);
    try {
      await api.post('/accounting/manual-ledger-entry', {
        party_id: partyId,
        party_type: partyType,
        direction,
        amount: Number(amount),
        currency_code: currencyCode,
        ledger_side: partyType === 'office' ? ledgerSide : 'sell',
        note: note.trim(),
        happened_at: happenedAt ? new Date(happenedAt + 'T00:00:00').toISOString() : undefined,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.error
        || e?.response?.data?.message
        || (e?.response?.status ? `خطأ ${e.response.status}: ${e?.response?.statusText}` : null)
        || e?.message
        || 'فشل حفظ البند';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const directionLabel = direction === 'debit' ? 'مدين (عليه)' : 'دائن (له)';
  const directionColor = direction === 'debit' ? 'text-red-400' : 'text-green-400';

  return (
    <Modal open={open} onClose={onClose} title="إضافة بند يدوي لكشف الحساب" width="max-w-lg">
      {error && (
        <div className="rounded-2xl border border-red-800/60 bg-red-950/30 p-3 text-xs text-red-200 mb-3">
          {error}
        </div>
      )}

      {/* Party info */}
      <div className="mb-4 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">الطرف:</span>
          <span className="font-bold text-white">{partyName || `#${partyId}`}</span>
          <span className="text-[11px] text-slate-500">
            ({partyType === 'customer' ? 'عميل' : 'مكتب'})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Direction */}
        <div>
          <div className="text-xs text-slate-400 mb-1">نوع البند *</div>
          <Select value={direction} onChange={(e) => setDirection(e.target.value as 'debit' | 'credit')}>
            <option value="debit">مدين (عليه) — يزيد الرصيد</option>
            <option value="credit">دائن (له) — ينقص الرصيد</option>
          </Select>
          <div className={`mt-1 text-[11px] font-bold ${directionColor}`}>
            {direction === 'debit'
              ? '⬆ سيزيد ما على الطرف'
              : '⬇ سينقص ما على الطرف'}
          </div>
        </div>

        {/* Ledger side (offices only) */}
        {partyType === 'office' && (
          <div>
            <div className="text-xs text-slate-400 mb-1">جانب القيد *</div>
            <Select value={ledgerSide} onChange={(e) => setLedgerSide(e.target.value as 'sell' | 'buy')}>
              <option value="sell">كشف البيع (عليه - ما بعناه للمكتب)</option>
              <option value="buy">كشف الشراء (له - ما اشتريناه من المكتب)</option>
            </Select>
            <div className="mt-1 text-[11px] text-slate-500">
              {ledgerSide === 'sell'
                ? 'يؤثر على حساب المبيعات (المدينون)'
                : 'يؤثر على حساب المشتريات (الدائنون)'}
            </div>
          </div>
        )}

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
              {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </Select>
          </div>
        </div>

        {/* Date */}
        <div>
          <div className="text-xs text-slate-400 mb-1">التاريخ</div>
          <Input
            type="date"
            value={happenedAt}
            onChange={(e) => setHappenedAt(e.target.value)}
          />
        </div>

        {/* Note */}
        <div className="md:col-span-2">
          <div className="text-xs text-slate-400 mb-1">الوصف / السبب *</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none text-sm"
            placeholder="مثال: تعديل رصيد افتتاحي، خصم إضافي، ..."
          />
        </div>
      </div>

      {/* Preview */}
      {amount > 0 && note.trim() && (
        <div className={`mt-4 p-3 rounded-xl border ${
          direction === 'debit'
            ? 'border-red-800/50 bg-red-950/20'
            : 'border-green-800/50 bg-green-950/20'
        }`}>
          <div className="text-xs text-slate-400 mb-1">معاينة البند:</div>
          <div className="text-sm">
            <span className={directionColor + ' font-bold'}>{directionLabel}</span>
            <span className="text-white mx-2">—</span>
            <span className="text-white font-medium">{amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} {currencyCode}</span>
            <span className="text-white mx-2">—</span>
            <span className="text-slate-300">{note}</span>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button
          loading={loading}
          disabled={amount <= 0 || !note.trim()}
          onClick={save}
        >
          حفظ البند
        </Button>
      </div>
    </Modal>
  );
}
