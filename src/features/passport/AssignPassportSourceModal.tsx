import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';
import { useCurrencies } from '../../utils/useCurrencies';
import type { Party } from '../../utils/types';

export function AssignPassportSourceModal({
  open,
  onClose,
  passportRequestId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  passportRequestId: number;
  onSaved: () => void;
}) {
  const [offices, setOffices] = useState<Party[]>([]);
  const [sourceType, setSourceType] = useState<'external' | 'internal'>('external');
  const [vendorPartyId, setVendorPartyId] = useState<number | ''>('');
  const [costAmount, setCostAmount] = useState<string>('');
  const [costCurrency, setCostCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currencies } = useCurrencies();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(true);
    (async () => {
      try {
        const oRes = await api.get('/meta/offices');
        setOffices(oRes.data.data || []);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'تعذر تحميل قائمة المكاتب');
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  useEffect(() => {
    // Reset dependent selections when switching source
    setError(null);
    if (sourceType === 'internal') setVendorPartyId('');
  }, [sourceType]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const cNum = costAmount === '' ? (sourceType === 'internal' ? 0 : NaN) : Number(costAmount);
      const payload: any = {
        source_type: sourceType,
        cost_amount: sourceType === 'internal' ? (Number.isFinite(cNum) ? cNum : 0) : Number(costAmount),
        cost_currency_code: costCurrency,
        vendor_party_id: sourceType === 'external' ? Number(vendorPartyId) : null,
      };

      if (sourceType === 'external') {
        if (!payload.vendor_party_id) throw new Error('اختر المصدر (مكتب خارجي)');
        if (!Number.isFinite(payload.cost_amount) || payload.cost_amount <= 0) throw new Error('التكلفة يجب أن تكون > 0');
      } else {
        if (!Number.isFinite(payload.cost_amount) || payload.cost_amount < 0) throw new Error('التكلفة يجب أن تكون >= 0');
      }

      await api.patch(`/passport-requests/${passportRequestId}/assign-source`, payload);
      onSaved();
      onClose();
      setVendorPartyId('');
      setCostAmount('');
      setCostCurrency('USD');
      setSourceType('external');
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'تعذر حفظ المصدر');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="تحديد مصدر وتكلفة الجواز" width="max-w-xl">
      {error && (
        <div className="mb-3 rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-1">المصدر</div>
          <Select value={sourceType} onChange={(e) => setSourceType(e.target.value as any)}>
            <option value="external">مكتب خارجي</option>
            <option value="internal">مكتبنا (مصدر داخلي)</option>
          </Select>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">اختيار المكتب</div>
          <Select
            value={String(vendorPartyId)}
            onChange={(e) => setVendorPartyId(Number(e.target.value) || '')}
            disabled={sourceType !== 'external'}
          >
            <option value="">اختر مكتب…</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">التكلفة</div>
          <Input type="number" value={costAmount} onChange={(e) => setCostAmount(e.target.value)} placeholder={sourceType === 'internal' ? '0' : 'مثال: 50'} />
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">عملة التكلفة</div>
          <Select value={costCurrency} onChange={(e) => setCostCurrency(e.target.value)}>
            {(currencies && currencies.length ? currencies : [
              { code: 'USD', name: 'USD' },
              { code: 'SYP', name: 'SYP' },
              { code: 'AED', name: 'AED' },
            ]).map((c: any) => (
              <option key={c.code} value={c.code}>{c.code}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          إلغاء
        </Button>
        <Button loading={saving} disabled={loading || saving} onClick={save}>
          حفظ
        </Button>
      </div>
    </Modal>
  );
}
