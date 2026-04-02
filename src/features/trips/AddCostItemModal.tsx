import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';
import { TripCostItem, COST_CATEGORIES, COST_CATEGORY_LABELS } from './types';

type PartyOpt = { id: number; name: string };
type CurrencyOpt = { code: string; name: string };

interface AddCostItemModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  tripId: number;
  costItem?: TripCostItem | null;
}

export function AddCostItemModal({ open, onClose, onSaved, tripId, costItem }: AddCostItemModalProps) {
  const [category, setCategory] = useState('other');
  const [label, setLabel] = useState('');
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [vendorResults, setVendorResults] = useState<PartyOpt[]>([]);
  const [vendorSearchOpen, setVendorSearchOpen] = useState(false);
  const vendorTimerRef = useRef<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitAmount, setUnitAmount] = useState<number>(0);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [currencies, setCurrencies] = useState<CurrencyOpt[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!costItem;

  useEffect(() => {
    if (open) {
      api.get('/meta/currencies').then(r => {
        setCurrencies(r.data?.data || r.data || []);
      }).catch(() => {});

      if (costItem) {
        setCategory(costItem.category || 'other');
        setLabel(costItem.label || '');
        setVendorId(costItem.vendor_party_id || null);
        setVendorName(costItem.vendor_name || '');
        setQuantity(costItem.quantity || 1);
        setUnitAmount(costItem.unit_amount || 0);
        setCurrencyCode(costItem.currency_code || 'USD');
        setNotes(costItem.notes || '');
      } else {
        setCategory('other'); setLabel(''); setVendorId(null); setVendorName('');
        setQuantity(1); setUnitAmount(0); setCurrencyCode('USD'); setNotes('');
      }
      setError('');
    }
  }, [open, costItem]);

  const searchVendors = (q: string) => {
    setVendorName(q);
    setVendorId(null);
    if (vendorTimerRef.current) clearTimeout(vendorTimerRef.current);
    if (q.trim().length < 1) { setVendorResults([]); setVendorSearchOpen(false); return; }
    vendorTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await api.get('/meta/parties?type=office&q=' + encodeURIComponent(q.trim()) + '&limit=10');
        const items = (res.data?.data || res.data || []).filter((p: PartyOpt) => p.id);
        setVendorResults(items);
        setVendorSearchOpen(items.length > 0);
      } catch { setVendorResults([]); }
    }, 250);
  };

  const selectVendor = (p: PartyOpt) => {
    setVendorId(p.id);
    setVendorName(p.name);
    setVendorSearchOpen(false);
  };

  const totalAmount = quantity * unitAmount;

  const handleSubmit = async () => {
    if (!category.trim()) { setError('الفئة مطلوبة'); return; }
    if (!label.trim()) { setError('الوصف مطلوب'); return; }
    if (unitAmount <= 0) { setError('سعر الوحدة يجب أن يكون أكبر من صفر'); return; }

    setSaving(true); setError('');
    try {
      const payload = {
        category: category.trim(),
        label: label.trim(),
        vendor_party_id: vendorId || null,
        quantity,
        unit_amount: unitAmount,
        currency_code: currencyCode,
        notes: notes.trim() || null,
      };
      if (isEdit) {
        await api.patch(`/trips/${tripId}/costs/${costItem!.id}`, payload);
      } else {
        await api.post(`/trips/${tripId}/costs`, payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'حدث خطأ');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'تعديل بند تكلفة' : 'إضافة بند تكلفة'}>
      <div className="space-y-4 p-4">
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">{error}</div>}

        {/* Category */}
        <div>
          <div className="text-xs text-slate-400 mb-1">الفئة *</div>
          <select
            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-sm"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {COST_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">الوصف *</div>
          <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="مثال: فيزا عمرة - مجموعة أولى" />
        </div>

        {/* Vendor autocomplete (office) */}
        <div className="relative">
          <div className="text-xs text-slate-400 mb-1">المورّد (اختياري — مكتب)</div>
          <Input value={vendorName} onChange={e => searchVendors(e.target.value)} placeholder="ابحث عن مكتب..." />
          {vendorId && (
            <button className="absolute left-2 top-8 text-xs text-red-400 hover:text-red-300" onClick={() => { setVendorId(null); setVendorName(''); }}>
              ✕ إزالة
            </button>
          )}
          {vendorSearchOpen && vendorResults.length > 0 && (
            <div className="absolute z-30 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-40 overflow-auto">
              {vendorResults.map(p => (
                <button key={p.id} className="w-full text-right px-3 py-2 hover:bg-slate-700 text-sm text-white" onClick={() => selectVendor(p)}>
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quantity + Unit Amount + Currency */}
        <div className="grid grid-cols-4 gap-3">
          <div>
            <div className="text-xs text-slate-400 mb-1">الكمية</div>
            <Input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value)))} min={1} />
          </div>
          <div className="col-span-2">
            <div className="text-xs text-slate-400 mb-1">سعر الوحدة *</div>
            <Input type="number" value={unitAmount} onChange={e => setUnitAmount(Number(e.target.value))} min={0} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">العملة</div>
            <select
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-sm"
              value={currencyCode}
              onChange={e => setCurrencyCode(e.target.value)}
            >
              {currencies.length === 0 && <option value="USD">USD</option>}
              {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
        </div>

        {/* Total preview */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-slate-400">الإجمالي:</span>
          <span className="text-lg font-bold text-white">{totalAmount.toLocaleString('en-US')} {currencyCode}</span>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">ملاحظات</div>
          <textarea className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white text-sm resize-none h-20"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'جاري الحفظ...' : (isEdit ? 'حفظ التعديلات' : 'إضافة البند')}</Button>
        </div>
      </div>
    </Modal>
  );
}
