import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { api } from '../../utils/api';

type CurrencyOpt = { code: string; name?: string };
type CustomerOpt = { id: number; name: string; phone?: string | null; status?: string };
type OfficeOpt = { id: number; name: string };

type Sale = {
  id: number;
  customer_party_id?: number | null;
  customer_name?: string;
  customer_phone?: string | null;
  customer_phone2?: string | null;
  service_name?: string;
  cost_amount?: number;
  cost_currency_code?: string;
  sell_amount?: number;
  sell_currency_code?: string;
  source_party_id?: number | null;
  notes?: string | null;
};

export function EditServiceSaleModal({
  open,
  onClose,
  onSaved,
  sale,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  sale: Sale | null;
}) {
  const [currencies, setCurrencies] = useState<CurrencyOpt[]>([
    { code: 'USD', name: 'USD' },
    { code: 'SYP', name: 'SYP' },
    { code: 'AED', name: 'AED' },
  ]);
  const [offices, setOffices] = useState<OfficeOpt[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Customer autocomplete
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPhone2, setCustomerPhone2] = useState('');
  const [customerPartyId, setCustomerPartyId] = useState<number | null>(null);
  const [customerResults, setCustomerResults] = useState<CustomerOpt[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearching, setCustomerSearching] = useState(false);
  const customerSearchTimerRef = useRef<number | null>(null);

  // Service name autocomplete
  const [serviceName, setServiceName] = useState('');
  const [serviceResults, setServiceResults] = useState<string[]>([]);
  const [serviceSearchOpen, setServiceSearchOpen] = useState(false);
  const [serviceSearching, setServiceSearching] = useState(false);
  const serviceSearchTimerRef = useRef<number | null>(null);

  const [costAmount, setCostAmount] = useState<number>(0);
  const [costCurrency, setCostCurrency] = useState('USD');
  const [sellAmount, setSellAmount] = useState<number>(0);
  const [sellCurrency, setSellCurrency] = useState('USD');
  const [sourcePartyId, setSourcePartyId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-populate fields when modal opens with current sale data
  useEffect(() => {
    if (!open || !sale) return;
    setError(null);
    setCustomerName(sale.customer_name || '');
    setCustomerPhone(sale.customer_phone || '');
    setCustomerPhone2(sale.customer_phone2 || '');
    setCustomerPartyId(sale.customer_party_id ?? null);
    setServiceName(sale.service_name || '');
    setCostAmount(Number(sale.cost_amount || 0));
    setCostCurrency(sale.cost_currency_code || 'USD');
    setSellAmount(Number(sale.sell_amount || 0));
    setSellCurrency(sale.sell_currency_code || 'USD');
    setSourcePartyId(sale.source_party_id ? Number(sale.source_party_id) : '');
    setNotes(sale.notes || '');
    setCustomerResults([]);
    setCustomerSearchOpen(false);
    setServiceResults([]);
    setServiceSearchOpen(false);
  }, [open, sale]);

  // Load currencies when modal opens
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingMeta(true);
      try {
        const [curRes, officesRes] = await Promise.all([
          api.get('/currencies').catch(() => ({ data: { data: [] } })),
          api.get('/meta/offices').catch(() => ({ data: { data: [] } })),
        ]);
        const curList = (curRes.data.data || [])
          .filter((c: any) => c.is_active)
          .map((c: any) => ({ code: c.code, name: `${c.code} - ${c.name}` }));
        if (curList.length > 0) setCurrencies(curList);
        setOffices(officesRes.data.data || []);
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, [open]);

  // Customer search
  useEffect(() => {
    if (!open) return;
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
  }, [open, customerName]);

  // Service name search
  useEffect(() => {
    if (!open) return;
    const q = serviceName.trim();
    if (q.length < 2) {
      setServiceResults([]);
      setServiceSearching(false);
      return;
    }
    if (serviceSearchTimerRef.current) {
      window.clearTimeout(serviceSearchTimerRef.current);
      serviceSearchTimerRef.current = null;
    }
    serviceSearchTimerRef.current = window.setTimeout(async () => {
      setServiceSearching(true);
      try {
        const res = await api.get('/meta/service-names', { params: { q, limit: 10 } });
        setServiceResults(res.data.data || []);
      } catch {
        setServiceResults([]);
      } finally {
        setServiceSearching(false);
      }
    }, 250);
    return () => {
      if (serviceSearchTimerRef.current) {
        window.clearTimeout(serviceSearchTimerRef.current);
        serviceSearchTimerRef.current = null;
      }
    };
  }, [open, serviceName]);

  async function handleSubmit() {
    if (!sale) return;
    if (!customerName.trim()) return setError('اسم العميل مطلوب');
    if (!serviceName.trim()) return setError('اسم الخدمة مطلوب');
    if (costAmount <= 0) return setError('قيمة الخدمة مطلوبة');
    if (sellAmount <= 0) return setError('سعر البيع مطلوب');

    setSaving(true);
    setError(null);
    try {
      await api.patch(`/service-sales/${sale.id}`, {
        customer_party_id: customerPartyId,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        customer_phone2: customerPhone2.trim() || null,
        service_name: serviceName.trim(),
        cost_amount: costAmount,
        cost_currency_code: costCurrency,
        sell_amount: sellAmount,
        sell_currency_code: sellCurrency,
        source_party_id: sourcePartyId ? Number(sourcePartyId) : null,
        notes: notes.trim() || null,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تعديل عملية بيع الخدمة');
    } finally {
      setSaving(false);
    }
  }

  const profitPreview = useMemo(() => {
    if (!(sellAmount > 0) || !(costAmount > 0)) return null;
    return sellAmount - costAmount;
  }, [sellAmount, costAmount]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`تعديل بيع خدمة #${sale?.id ?? ''}`}
      width="max-w-2xl"
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Service Details */}
        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-3">
          <h4 className="text-xs font-bold text-amber-400">بيانات الخدمة</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative md:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">اسم الخدمة *</label>
              <Input
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                onFocus={() => setServiceSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setServiceSearchOpen(false), 150)}
                placeholder="اسم الخدمة"
              />
              {serviceSearchOpen && serviceName.trim().length >= 2 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-950 shadow-xl overflow-hidden">
                  {serviceSearching ? (
                    <div className="p-3 text-xs text-slate-400">جاري البحث…</div>
                  ) : serviceResults.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500">لا توجد اقتراحات</div>
                  ) : (
                    <div className="max-h-56 overflow-auto">
                      {serviceResults.map((name) => (
                        <button
                          type="button"
                          key={name}
                          className="w-full text-right px-3 py-2 hover:bg-slate-800/50 transition text-sm text-slate-100"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setServiceName(name);
                            setServiceSearchOpen(false);
                          }}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">قيمة الخدمة *</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={costAmount}
                  onChange={(e) => setCostAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="flex-1"
                />
                <Select value={costCurrency} onChange={(e) => setCostCurrency(e.target.value)} className="w-24">
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name || c.code}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">سعر البيع *</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="flex-1"
                />
                <Select value={sellCurrency} onChange={(e) => setSellCurrency(e.target.value)} className="w-24">
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name || c.code}
                    </option>
                  ))}
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

            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">المصدر (المكتب/المورد)</label>
              <Select value={sourcePartyId} onChange={(e) => setSourcePartyId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">— بدون مصدر —</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </Select>
              <div className="mt-1 text-[11px] text-slate-500">اختياري: المكتب/المورد الذي تشتري منه الخدمة</div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-3">
          <h4 className="text-xs font-bold text-amber-400">معلومات العميل</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <label className="text-xs text-slate-400 mb-1 block">اسم العميل *</label>
              <Input
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setCustomerPartyId(null);
                }}
                onFocus={() => setCustomerSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setCustomerSearchOpen(false), 150)}
                placeholder="اسم العميل"
              />
              {customerSearchOpen && customerName.trim().length >= 2 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-950 shadow-xl overflow-hidden">
                  {customerSearching ? (
                    <div className="p-3 text-xs text-slate-400">جاري البحث…</div>
                  ) : customerResults.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500">لا توجد نتائج</div>
                  ) : (
                    <div className="max-h-56 overflow-auto">
                      {customerResults.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          className="w-full text-right px-3 py-2 hover:bg-slate-800/50 transition"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setCustomerPartyId(Number(c.id));
                            setCustomerName(String(c.name || ''));
                            setCustomerPhone(String(c.phone || ''));
                            setCustomerSearchOpen(false);
                          }}
                        >
                          <div className="text-sm font-bold text-slate-100 truncate">{c.name}</div>
                          <div className="text-[11px] text-slate-500" dir="ltr">{c.phone || '—'}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-1 text-[11px] text-slate-500">
                {customerPartyId ? 'عميل مسجّل' : 'اكتب حرفين للبحث عن عميل مسجّل'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">رقم الموبايل 1</label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  dir="ltr"
                  placeholder="05..."
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">رقم الموبايل 2</label>
                <Input
                  value={customerPhone2}
                  onChange={(e) => setCustomerPhone2(e.target.value)}
                  dir="ltr"
                  placeholder="05..."
                />
              </div>
            </div>
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
          <div className="text-xs text-slate-500">{loadingMeta ? 'تحميل العملات…' : ''}</div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              إغلاق
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'جاري الحفظ…' : 'حفظ التعديلات'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
