import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';
import { useCurrencies } from '../../utils/useCurrencies';
import type { Party } from '../../utils/types';

export function AssignVendorModal({
  open,
  onClose,
  visaRequestId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  visaRequestId: number;
  onSaved: () => void;
}) {
  // المكتب المصدر — مكتب
  const [offices, setOffices] = useState<Party[]>([]);
  const [sourceType, setSourceType] = useState<'external' | 'internal'>('external');
  const [officeId, setOfficeId] = useState<number | ''>('');
  const [costAmount, setCostAmount] = useState<number>(70);
  const [costCurrency, setCostCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currencies } = useCurrencies();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSourceType('external');
    setOfficeId('');
    (async () => {
      try {
        const officesRes = await api.get('/meta/offices');
        setOffices(officesRes.data.data || []);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'تعذر تحميل البيانات');
      }
    })();
  }, [open]);

  async function save() {
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/visa-requests/${visaRequestId}/assign-vendor`, {
        source_type: sourceType,
        vendor_party_id: sourceType === 'external' ? Number(officeId) : null,
        cost_amount: Number(costAmount),
        cost_currency_code: costCurrency,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل حفظ المصدر');
    } finally {
      setLoading(false);
    }
  }

  const canSave =
    (sourceType === 'external' && !!officeId && costAmount > 0) ||
    (sourceType === 'internal' && costAmount >= 0);

  return (
    <Modal open={open} onClose={onClose} title="تحديد المكتب المصدر والتكلفة" width="max-w-xl">
      {error && (
        <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200 mb-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <div className="text-xs text-slate-400 mb-1">نوع المصدر</div>
          <Select
            value={sourceType}
            onChange={(e) => {
              const v = (e.target.value as any) || 'external';
              setSourceType(v);
              if (v === 'internal') setOfficeId('');
            }}
          >
            <option value="external">مكتب خارجي (مصدر علينا له)</option>
            <option value="internal">مكتبنا (مصدر داخلي)</option>
          </Select>
        </div>

        {sourceType === 'external' && (
          <div className="md:col-span-2">
            <div className="text-xs text-slate-400 mb-1">المكتب المصدر</div>
            <Select value={String(officeId)} onChange={(e) => setOfficeId(Number(e.target.value) || '')}>
              <option value="">اختر مكتب…</option>
              {offices.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <div className="text-xs text-slate-400 mb-1">التكلفة</div>
          <Input type="number" value={costAmount} onChange={(e) => setCostAmount(Number(e.target.value))} />
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">عملة التكلفة</div>
          <Select value={costCurrency} onChange={(e) => {
            setCostCurrency(e.target.value);
          }}>
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

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button
          loading={loading}
          disabled={!canSave}
          onClick={save}
        >
          حفظ
        </Button>
      </div>
    </Modal>
  );
}
