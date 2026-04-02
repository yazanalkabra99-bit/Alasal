import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';

type OfficeOpt = { id: number; name: string };
type CurrencyOpt = { code: string; name?: string };

export function OfficeTransferModal({
  open,
  onClose,
  fromOfficeId,
  fromOfficeName,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  fromOfficeId: number;
  fromOfficeName?: string;
  onSaved: () => void;
}) {
  const [offices, setOffices] = useState<OfficeOpt[]>([]);
  const [toOfficeId, setToOfficeId] = useState<number | ''>('');
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
    setToOfficeId('');
    setLedgerSide('sell');
    setAmount(0);
    setCurrencyCode('USD');
    setNote('');
    const now = new Date();
    setHappenedAt(now.toISOString().slice(0, 10));

    (async () => {
      try {
        const [officesRes, curRes] = await Promise.all([
          api.get('/meta/offices'),
          api.get('/currencies'),
        ]);
        const officeList = (officesRes.data.data || [])
          .filter((o: any) => o.id !== fromOfficeId)
          .map((o: any) => ({ id: o.id, name: o.name }));
        setOffices(officeList);

        const curList = (curRes.data.data || [])
          .filter((c: any) => c.is_active)
          .map((c: any) => ({ code: c.code, name: `${c.code} - ${c.name}` }));
        if (curList.length > 0) setCurrencies(curList);
      } catch {
        /* ignore */
      }
    })();
  }, [open, fromOfficeId]);

  const toOfficeName = offices.find((o) => o.id === toOfficeId)?.name || '';

  async function save() {
    if (!toOfficeId) return setError('اختر المكتب المستلم');
    if (amount <= 0) return setError('المبلغ مطلوب');
    if (!note.trim()) return setError('الملاحظة مطلوبة');

    setLoading(true);
    setError(null);
    try {
      await api.post('/accounting/office-transfer', {
        from_office_id: fromOfficeId,
        to_office_id: Number(toOfficeId),
        ledger_side: ledgerSide,
        amount: Number(amount),
        currency_code: currencyCode,
        note: note.trim(),
        happened_at: happenedAt
          ? new Date(happenedAt + 'T00:00:00').toISOString()
          : undefined,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        (e?.response?.status
          ? `خطأ ${e.response.status}: ${e?.response?.statusText}`
          : null) ||
        e?.message ||
        'فشل حفظ التحويل';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const sideLabel = ledgerSide === 'sell' ? 'كشف البيع (AR)' : 'كشف الشراء (AP)';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تحويل بين المكاتب"
      width="max-w-lg"
    >
      {error && (
        <div className="rounded-2xl border border-red-800/60 bg-red-950/30 p-3 text-xs text-red-200 mb-3">
          {error}
        </div>
      )}

      {/* From office info */}
      <div className="mb-4 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">من مكتب:</span>
          <span className="font-bold text-white">
            {fromOfficeName || `#${fromOfficeId}`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* To office */}
        <div>
          <div className="text-xs text-slate-400 mb-1">إلى مكتب *</div>
          <Select
            value={String(toOfficeId)}
            onChange={(e) => setToOfficeId(Number(e.target.value) || '')}
          >
            <option value="">اختر مكتب…</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Ledger side */}
        <div>
          <div className="text-xs text-slate-400 mb-1">جانب القيد *</div>
          <Select
            value={ledgerSide}
            onChange={(e) => setLedgerSide(e.target.value as 'sell' | 'buy')}
          >
            <option value="sell">كشف البيع (عليه — ما بعناه)</option>
            <option value="buy">كشف الشراء (له — ما اشتريناه)</option>
          </Select>
          <div className="mt-1 text-[11px] text-slate-500">
            {ledgerSide === 'sell'
              ? 'ينقص من AR المكتب المصدر ويزيد AR المكتب المستلم'
              : 'ينقص من AP المكتب المصدر ويزيد AP المكتب المستلم'}
          </div>
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
            <Select
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="w-28"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
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
          <div className="text-xs text-slate-400 mb-1">الملاحظة / السبب *</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none text-sm"
            placeholder="مثال: تحويل رصيد من مكتب X لمكتب Y..."
          />
        </div>
      </div>

      {/* Preview */}
      {amount > 0 && toOfficeId && note.trim() && (
        <div className="mt-4 p-3 rounded-xl border border-blue-800/50 bg-blue-950/20">
          <div className="text-xs text-slate-400 mb-2">معاينة التحويل:</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-bold">⬇</span>
              <span className="text-slate-300">
                ينقص من {sideLabel}{' '}
                <span className="text-white font-medium">
                  {fromOfficeName || `#${fromOfficeId}`}
                </span>{' '}
                مبلغ{' '}
                <span className="text-white font-bold">
                  {amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
                  {currencyCode}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400 font-bold">⬆</span>
              <span className="text-slate-300">
                يزيد على {sideLabel}{' '}
                <span className="text-white font-medium">{toOfficeName}</span>{' '}
                مبلغ{' '}
                <span className="text-white font-bold">
                  {amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
                  {currencyCode}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          إلغاء
        </Button>
        <Button
          loading={loading}
          disabled={!toOfficeId || amount <= 0 || !note.trim()}
          onClick={save}
        >
          تنفيذ التحويل
        </Button>
      </div>
    </Modal>
  );
}
