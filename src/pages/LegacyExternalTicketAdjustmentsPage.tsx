import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Plus, Trash2, RefreshCw, ArrowLeftRight, TrendingUp, TrendingDown, AlertTriangle, BarChart3, Pencil, ArrowDownToLine, Clock } from 'lucide-react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Input, FormField, Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { fmtMoney } from '../utils/format';
import { useAuth } from '../state/auth';

type Party = { id: number; name: string; phone?: string; type: string };

type LegacyExtAdjustment = {
  id: number;
  passenger_name: string;
  pnr: string | null;
  source_office_id: number | null;
  customer_party_id: number | null;
  customer_party_type: string | null;
  action: 'refund' | 'void';
  original_sell_usd: number;
  original_buy_usd: number;
  customer_refund_usd: number;
  source_refund_usd: number;
  refund_status: 'pending' | 'posted';
  note: string | null;
  created_by_name: string;
  created_at: string;
  source_office_name: string | null;
  customer_party_name: string | null;
};

const emptyForm = {
  passenger_name: '',
  pnr: '',
  source_office_id: '',
  customer_party_type: 'office' as 'customer' | 'office',
  customer_party_id: '',
  new_party_name: '',
  new_party_phone: '',
  action: 'refund' as 'refund' | 'void',
  original_sell_usd: '',
  original_buy_usd: '',
  customer_refund_usd: '',
  source_refund_usd: '',
  note: '',
};

export function LegacyExternalTicketAdjustmentsPage() {
  const { user } = useAuth();
  const canDelete = user?.roles?.some((r: string) => ['admin', 'accounting', 'airline_admin'].includes(r));
  const isPrivileged = user?.roles?.some((r: string) => ['admin', 'airline_admin', 'accounting'].includes(r));

  const [rows, setRows] = useState<LegacyExtAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [createNewParty, setCreateNewParty] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Autocomplete state for source office search
  const [sourceQuery, setSourceQuery] = useState('');
  const [sourceResults, setSourceResults] = useState<Party[]>([]);
  const [sourceSearching, setSourceSearching] = useState(false);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const sourceTimerRef = useRef<number | null>(null);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);

  // Autocomplete state for customer party search
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<Party[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerTimerRef = useRef<number | null>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [adjRes] = await Promise.allSettled([
        api.get('/accounting/legacy-external-ticket-adjustments'),
      ]);
      if (adjRes.status === 'fulfilled') setRows(adjRes.value.data?.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target as Node)) {
        setShowSourceDropdown(false);
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Debounced source office search
  useEffect(() => {
    if (!showForm) return;
    const q = sourceQuery.trim();
    if (q.length < 1) { setSourceResults([]); setSourceSearching(false); return; }
    if (sourceTimerRef.current) clearTimeout(sourceTimerRef.current);
    sourceTimerRef.current = window.setTimeout(async () => {
      setSourceSearching(true);
      try {
        const res = await api.get('/meta/offices', { params: { q, limit: 15 } });
        setSourceResults(res.data.data || []);
      } catch { setSourceResults([]); }
      finally { setSourceSearching(false); }
    }, 250);
    return () => { if (sourceTimerRef.current) clearTimeout(sourceTimerRef.current); };
  }, [showForm, sourceQuery]);

  // Debounced customer party search
  useEffect(() => {
    if (!showForm || createNewParty) return;
    const q = customerQuery.trim();
    if (q.length < 1) { setCustomerResults([]); setCustomerSearching(false); return; }
    if (customerTimerRef.current) clearTimeout(customerTimerRef.current);
    customerTimerRef.current = window.setTimeout(async () => {
      setCustomerSearching(true);
      try {
        const endpoint = form.customer_party_type === 'office' ? '/meta/offices' : '/meta/parties';
        const params = form.customer_party_type === 'office'
          ? { q, limit: 15 }
          : { type: 'customer', q, limit: 15 };
        const res = await api.get(endpoint, { params });
        setCustomerResults(res.data.data || []);
      } catch { setCustomerResults([]); }
      finally { setCustomerSearching(false); }
    }, 250);
    return () => { if (customerTimerRef.current) clearTimeout(customerTimerRef.current); };
  }, [showForm, customerQuery, form.customer_party_type, createNewParty]);

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // Profit calculations for privileged users
  const profitsData = useMemo(() => {
    if (!isPrivileged) return [];
    return rows.map(r => {
      const sell = r.original_sell_usd || 0;
      const buy = r.original_buy_usd || 0;
      const profitBefore = sell - buy;
      const profitAfter = (sell - (r.customer_refund_usd || 0))
                        - (buy - (r.source_refund_usd || 0));
      return { ...r, sell, buy, profitBefore, profitAfter };
    });
  }, [rows, isPrivileged]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (!isPrivileged || profitsData.length === 0) return null;
    const totalProfitBefore = profitsData.reduce((s, p) => s + p.profitBefore, 0);
    const totalProfitAfter = profitsData.reduce((s, p) => s + p.profitAfter, 0);
    const lossCount = profitsData.filter(p => p.profitAfter < 0).length;
    const totalLosses = profitsData.filter(p => p.profitAfter < 0).reduce((s, p) => s + p.profitAfter, 0);
    const totalSell = profitsData.reduce((s, p) => s + p.sell, 0);
    const totalBuy = profitsData.reduce((s, p) => s + p.buy, 0);
    const totalSourceRefund = rows.reduce((s, r) => s + (r.source_refund_usd || 0), 0);
    const totalCustomerRefund = rows.reduce((s, r) => s + (r.customer_refund_usd || 0), 0);
    const avgProfitPerTicket = rows.length > 0 ? totalProfitAfter / rows.length : 0;
    const sourceRecoveryRate = totalBuy > 0 ? (totalSourceRefund / totalBuy * 100) : 0;
    const customerRefundRate = totalSell > 0 ? (totalCustomerRefund / totalSell * 100) : 0;
    const profitMargin = totalSell > 0 ? (totalProfitAfter / totalSell * 100) : 0;
    const netFinancialImpact = totalSourceRefund - totalCustomerRefund;
    return {
      totalProfitBefore, totalProfitAfter, lossCount, totalLosses,
      totalSell, totalBuy, totalSourceRefund, totalCustomerRefund,
      avgProfitPerTicket, sourceRecoveryRate, customerRefundRate, profitMargin, netFinancialImpact,
    };
  }, [profitsData, rows, isPrivileged]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.passenger_name.trim()) {
      setError('اسم المسافر مطلوب');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        passenger_name: form.passenger_name.trim(),
        pnr: form.pnr.trim() || null,
        source_office_id: form.source_office_id ? Number(form.source_office_id) : null,
        customer_party_type: form.customer_party_type,
        customer_party_id: !createNewParty && form.customer_party_id ? Number(form.customer_party_id) : null,
        customer_party_name: createNewParty ? form.new_party_name.trim() : null,
        customer_party_phone: createNewParty ? form.new_party_phone.trim() || null : null,
        action: form.action,
        original_sell_usd: Number(form.original_sell_usd) || 0,
        original_buy_usd: Number(form.original_buy_usd) || 0,
        customer_refund_usd: Number(form.customer_refund_usd) || 0,
        source_refund_usd: Number(form.source_refund_usd) || 0,
        note: form.note.trim() || null,
      };
      if (editingId) {
        await api.put(`/accounting/legacy-external-ticket-adjustments/${editingId}`, payload);
      } else {
        await api.post('/accounting/legacy-external-ticket-adjustment', payload);
      }
      setForm(emptyForm);
      setCreateNewParty(false);
      setSourceQuery('');
      setCustomerQuery('');
      setEditingId(null);
      setShowForm(false);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  }

  async function toggleRefundStatus(id: number) {
    try {
      const res = await api.patch(`/accounting/legacy-external-ticket-adjustments/${id}/refund-status`);
      setRows(prev => prev.map(r => r.id === id ? { ...r, refund_status: res.data.data.refund_status } : r));
    } catch (err: any) {
      alert(err?.response?.data?.error || 'حدث خطأ');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    try {
      await api.delete(`/accounting/legacy-external-ticket-adjustments/${id}`);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'حدث خطأ');
    }
  }

  function handleEdit(r: LegacyExtAdjustment) {
    setForm({
      passenger_name: r.passenger_name || '',
      pnr: r.pnr || '',
      source_office_id: r.source_office_id ? String(r.source_office_id) : '',
      customer_party_type: (r.customer_party_type as 'customer' | 'office') || 'office',
      customer_party_id: r.customer_party_id ? String(r.customer_party_id) : '',
      new_party_name: '',
      new_party_phone: '',
      action: r.action || 'refund',
      original_sell_usd: r.original_sell_usd ? String(r.original_sell_usd) : '',
      original_buy_usd: r.original_buy_usd ? String(r.original_buy_usd) : '',
      customer_refund_usd: r.customer_refund_usd ? String(r.customer_refund_usd) : '',
      source_refund_usd: r.source_refund_usd ? String(r.source_refund_usd) : '',
      note: r.note || '',
    });
    setSourceQuery(r.source_office_name || '');
    setCustomerQuery(r.customer_party_name || '');
    setCreateNewParty(false);
    setEditingId(r.id);
    setShowForm(true);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Helper: get profit for a row
  function getRowProfit(r: LegacyExtAdjustment) {
    const sell = r.original_sell_usd || 0;
    const buy = r.original_buy_usd || 0;
    const profitBefore = sell - buy;
    const profitAfter = (sell - (r.customer_refund_usd || 0))
                      - (buy - (r.source_refund_usd || 0));
    return { profitBefore, profitAfter };
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">تعديلات تذاكر خارجية قديمة</h1>
            <p className="text-sm text-slate-400">تسجيل ريفوند وفويد لتذاكر خارجية غير مدخلة بالنظام</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => { setShowForm(v => !v); if (showForm) { setEditingId(null); setForm(emptyForm); setSourceQuery(''); setCustomerQuery(''); } }}>
            <Plus className="w-4 h-4 ml-1" />
            {showForm ? 'إخفاء النموذج' : 'إضافة تعديل جديد'}
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card className={`p-5 ${editingId ? 'border border-amber-600/40' : ''}`}>
          {editingId && (
            <div className="mb-3 px-3 py-2 bg-amber-500/10 rounded-lg text-amber-400 text-sm font-semibold flex items-center gap-2">
              <Pencil className="w-4 h-4" /> تعديل سجل #{editingId}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Section 1: Ticket Info */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">معلومات التذكرة</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField label="اسم المسافر" required>
                  <Input
                    value={form.passenger_name}
                    onChange={e => updateField('passenger_name', e.target.value)}
                    placeholder="اسم المسافر"
                  />
                </FormField>
                <FormField label="PNR">
                  <Input value={form.pnr} onChange={e => updateField('pnr', e.target.value)} placeholder="PNR" />
                </FormField>
                <FormField label="نوع العملية">
                  <Select value={form.action} onChange={e => updateField('action', e.target.value)}>
                    <option value="refund">ريفوند (Refund)</option>
                    <option value="void">فويد (Void)</option>
                  </Select>
                </FormField>
              </div>
            </div>

            {/* Section 2: Source Office (we bought from) */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">مكتب المصدر (اشترينا منو)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="مكتب المصدر">
                  <div className="relative" ref={sourceDropdownRef}>
                    <Input
                      value={sourceQuery}
                      onChange={e => {
                        setSourceQuery(e.target.value);
                        setShowSourceDropdown(true);
                        updateField('source_office_id', '');
                      }}
                      onFocus={() => { if (sourceQuery.length >= 1) setShowSourceDropdown(true); }}
                      placeholder="اكتب للبحث عن المكتب..."
                      autoComplete="off"
                    />
                    {form.source_office_id && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-green-400 text-xs">&#10003;</span>
                    )}
                    {showSourceDropdown && sourceQuery.length >= 1 && (
                      <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {sourceSearching ? (
                          <div className="p-3 text-slate-400 text-xs text-center">جاري البحث...</div>
                        ) : sourceResults.length === 0 ? (
                          <div className="p-3 text-slate-500 text-xs text-center">لا توجد نتائج</div>
                        ) : (
                          sourceResults.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full text-right px-3 py-2 hover:bg-slate-700/60 text-sm text-slate-200 transition-colors border-b border-slate-700/30 last:border-0"
                              onClick={() => {
                                updateField('source_office_id', String(p.id));
                                setSourceQuery(p.name);
                                setShowSourceDropdown(false);
                              }}
                            >
                              <span className="font-medium">{p.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </FormField>
                <FormField label="مبلغ استرداد المصدر (USD)" hint="ينقص اللي علينا للمصدر — لا ينزل إلا بعد التنزيل يدوياً">
                  <Input
                    type="number" step="any"
                    value={form.source_refund_usd}
                    onChange={e => updateField('source_refund_usd', e.target.value)}
                    placeholder="0"
                  />
                </FormField>
              </div>
            </div>

            {/* Section 3: Customer Party (we sold to) */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">العميل / المكتب (بعنالو)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField label="نوع الطرف">
                  <Select value={form.customer_party_type} onChange={e => {
                    updateField('customer_party_type', e.target.value);
                    updateField('customer_party_id', '');
                    setCreateNewParty(false);
                    setCustomerQuery('');
                    setCustomerResults([]);
                  }}>
                    <option value="office">مكتب</option>
                    <option value="customer">عميل</option>
                  </Select>
                </FormField>

                {!createNewParty ? (
                  <FormField label={form.customer_party_type === 'office' ? 'المكتب' : 'العميل'}>
                    <div className="relative" ref={customerDropdownRef}>
                      <Input
                        value={customerQuery}
                        onChange={e => {
                          setCustomerQuery(e.target.value);
                          setShowCustomerDropdown(true);
                          updateField('customer_party_id', '');
                        }}
                        onFocus={() => { if (customerQuery.length >= 1) setShowCustomerDropdown(true); }}
                        placeholder="اكتب للبحث..."
                        autoComplete="off"
                      />
                      {form.customer_party_id && (
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-green-400 text-xs">&#10003;</span>
                      )}
                      {showCustomerDropdown && customerQuery.length >= 1 && (
                        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {customerSearching ? (
                            <div className="p-3 text-slate-400 text-xs text-center">جاري البحث...</div>
                          ) : customerResults.length === 0 ? (
                            <div className="p-3 text-slate-500 text-xs text-center">لا توجد نتائج</div>
                          ) : (
                            customerResults.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full text-right px-3 py-2 hover:bg-slate-700/60 text-sm text-slate-200 transition-colors border-b border-slate-700/30 last:border-0"
                                onClick={() => {
                                  updateField('customer_party_id', String(p.id));
                                  setCustomerQuery(p.name);
                                  setShowCustomerDropdown(false);
                                }}
                              >
                                <span className="font-medium">{p.name}</span>
                                {p.phone && <span className="text-slate-500 text-xs mr-2">({p.phone})</span>}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </FormField>
                ) : (
                  <>
                    <FormField label="اسم الطرف الجديد" required>
                      <Input value={form.new_party_name} onChange={e => updateField('new_party_name', e.target.value)} placeholder="الاسم" />
                    </FormField>
                    <FormField label="رقم الهاتف">
                      <Input value={form.new_party_phone} onChange={e => updateField('new_party_phone', e.target.value)} placeholder="الهاتف" />
                    </FormField>
                  </>
                )}

                <div className="flex items-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => {
                    setCreateNewParty(v => !v);
                    updateField('customer_party_id', '');
                    updateField('new_party_name', '');
                    setCustomerQuery('');
                  }}>
                    {createNewParty ? 'اختيار من القائمة' : '+ إنشاء طرف جديد'}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <FormField label="مبلغ استرداد العميل (USD)" hint="ينقص دين العميل — لا ينزل إلا بعد التنزيل يدوياً">
                  <Input
                    type="number" step="any"
                    value={form.customer_refund_usd}
                    onChange={e => updateField('customer_refund_usd', e.target.value)}
                    placeholder="0"
                  />
                </FormField>
              </div>
            </div>

            {/* Section 4: Additional info */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">معلومات إضافية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="سعر البيع الأصلي (USD)">
                  <Input type="number" step="any" value={form.original_sell_usd} onChange={e => updateField('original_sell_usd', e.target.value)} placeholder="0" />
                </FormField>
                <FormField label="سعر الشراء الأصلي (USD)">
                  <Input type="number" step="any" value={form.original_buy_usd} onChange={e => updateField('original_buy_usd', e.target.value)} placeholder="0" />
                </FormField>
              </div>
              <div className="mt-3">
                <FormField label="ملاحظات">
                  <Textarea value={form.note} onChange={e => updateField('note', e.target.value)} placeholder="ملاحظات إضافية..." className="min-h-[60px]" />
                </FormField>
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" type="button" onClick={() => {
                setShowForm(false); setForm(emptyForm); setCreateNewParty(false);
                setSourceQuery(''); setCustomerQuery(''); setError(''); setEditingId(null);
              }}>
                إلغاء
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'جاري الحفظ...' : editingId ? 'تحديث التعديل' : 'حفظ التعديل'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-right px-3 py-3 text-slate-400 font-medium">المسافر</th>
              <th className="text-right px-3 py-3 text-slate-400 font-medium">PNR</th>
              <th className="text-right px-3 py-3 text-slate-400 font-medium">المصدر</th>
              <th className="text-right px-3 py-3 text-slate-400 font-medium">العميل</th>
              <th className="text-right px-3 py-3 text-slate-400 font-medium">العملية</th>
              <th className="text-right px-3 py-3 text-slate-400 font-medium">استرداد المصدر</th>
              <th className="text-right px-3 py-3 text-slate-400 font-medium">استرداد العميل</th>
              {isPrivileged && (
                <>
                  <th className="text-right px-3 py-3 text-slate-400 font-medium">سعر البيع</th>
                  <th className="text-right px-3 py-3 text-slate-400 font-medium">سعر الشراء</th>
                  <th className="text-right px-3 py-3 text-slate-400 font-medium">ربح قبل</th>
                  <th className="text-right px-3 py-3 text-slate-400 font-medium">ربح/خسارة بعد</th>
                </>
              )}
              <th className="text-right px-3 py-3 text-slate-400 font-medium">بواسطة</th>
              <th className="text-right px-3 py-3 text-slate-400 font-medium">التاريخ</th>
              {isPrivileged && <th className="text-center px-3 py-3 text-slate-400 font-medium">إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={isPrivileged ? 14 : 9} className="text-center py-8 text-slate-500">
                  لا توجد تعديلات مسجلة
                </td>
              </tr>
            ) : (
              rows.map(r => {
                const { profitBefore, profitAfter } = getRowProfit(r);
                return (
                  <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-3 py-2.5">
                      <div className="text-slate-200 font-medium">{r.passenger_name}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 font-mono text-xs">{r.pnr || '-'}</td>
                    <td className="px-3 py-2.5 text-slate-300">
                      {r.source_office_name || '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.customer_party_name ? (
                        <div>
                          <div className="text-slate-300">{r.customer_party_name}</div>
                          <div className="text-xs text-slate-500">{r.customer_party_type === 'office' ? 'مكتب' : 'عميل'}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={r.action === 'refund' ? 'amber' : 'red'}>
                        {r.action === 'refund' ? 'ريفوند' : 'فويد'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-cyan-400 font-medium">
                      {r.source_refund_usd ? fmtMoney(r.source_refund_usd, 'USD') : '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.customer_refund_usd ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-400 font-medium">{fmtMoney(r.customer_refund_usd, 'USD')}</span>
                          <button
                            onClick={() => toggleRefundStatus(r.id)}
                            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
                              r.refund_status === 'posted'
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                            }`}
                            title={r.refund_status === 'posted' ? 'منزّل بكشف الحساب — اضغط لإلغاء التنزيل' : 'معلّق — اضغط للتنزيل بكشف الحساب'}
                          >
                            {r.refund_status === 'posted'
                              ? <><ArrowDownToLine className="w-3 h-3" /> منزّل</>
                              : <><Clock className="w-3 h-3" /> معلّق</>
                            }
                          </button>
                        </div>
                      ) : '-'}
                    </td>
                    {isPrivileged && (
                      <>
                        <td className="px-3 py-2.5 text-slate-300 text-xs">
                          {r.original_sell_usd ? fmtMoney(r.original_sell_usd, 'USD') : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-300 text-xs">
                          {r.original_buy_usd ? fmtMoney(r.original_buy_usd, 'USD') : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-medium">
                          <span className={profitBefore > 0 ? 'text-green-400' : profitBefore < 0 ? 'text-red-400' : 'text-slate-400'}>
                            {fmtMoney(profitBefore, 'USD')}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs font-bold">
                          <span className={profitAfter > 0 ? 'text-green-400' : profitAfter < 0 ? 'text-red-400' : 'text-slate-400'}>
                            {fmtMoney(profitAfter, 'USD')}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-3 py-2.5 text-slate-400 text-xs">{r.created_by_name}</td>
                    <td className="px-3 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('ar-SY')}
                    </td>
                    {isPrivileged && (
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(r)}
                            className="text-amber-400 hover:text-amber-300 p-1 rounded hover:bg-amber-500/10 transition-colors"
                            title="تعديل"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      {/* Summary - basic (visible to all) */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">عدد السجلات</p>
            <p className="text-lg font-bold text-slate-100">{rows.length}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">إجمالي استرداد المصادر</p>
            <p className="text-lg font-bold text-cyan-400">
              {fmtMoney(rows.reduce((s, r) => s + (r.source_refund_usd || 0), 0), 'USD')}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">إجمالي استرداد العملاء</p>
            <p className="text-lg font-bold text-amber-400">
              {fmtMoney(rows.reduce((s, r) => s + (r.customer_refund_usd || 0), 0), 'USD')}
            </p>
          </Card>
        </div>
      )}

      {/* Privileged stats - profit/loss cards */}
      {isPrivileged && stats && rows.length > 0 && (
        <>
          {/* Row 1: Profit/Loss basics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center border border-blue-800/30">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                <p className="text-xs text-slate-400">أرباح قبل التعديل</p>
              </div>
              <p className={`text-lg font-bold ${stats.totalProfitBefore >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmtMoney(stats.totalProfitBefore, 'USD')}
              </p>
            </Card>
            <Card className="p-4 text-center border border-blue-800/30">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingDown className="w-3.5 h-3.5 text-blue-400" />
                <p className="text-xs text-slate-400">أرباح بعد التعديل</p>
              </div>
              <p className={`text-lg font-bold ${stats.totalProfitAfter >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmtMoney(stats.totalProfitAfter, 'USD')}
              </p>
            </Card>
            <Card className="p-4 text-center border border-red-800/30">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <p className="text-xs text-slate-400">عدد الخسائر</p>
              </div>
              <p className="text-lg font-bold text-red-400">{stats.lossCount}</p>
            </Card>
            <Card className="p-4 text-center border border-red-800/30">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <p className="text-xs text-slate-400">إجمالي الخسائر</p>
              </div>
              <p className="text-lg font-bold text-red-400">
                {fmtMoney(stats.totalLosses, 'USD')}
              </p>
            </Card>
          </div>

          {/* Row 2: Advanced financial stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-4 text-center border border-slate-700/30">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs text-slate-400">متوسط ربح/تذكرة</p>
              </div>
              <p className={`text-base font-bold ${stats.avgProfitPerTicket >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmtMoney(stats.avgProfitPerTicket, 'USD')}
              </p>
            </Card>
            <Card className="p-4 text-center border border-slate-700/30">
              <p className="text-xs text-slate-400 mb-1">نسبة استرداد المصدر</p>
              <p className="text-base font-bold text-cyan-400">
                {stats.sourceRecoveryRate.toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-500">من سعر الشراء</p>
            </Card>
            <Card className="p-4 text-center border border-slate-700/30">
              <p className="text-xs text-slate-400 mb-1">نسبة استرداد العميل</p>
              <p className="text-base font-bold text-amber-400">
                {stats.customerRefundRate.toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-500">من سعر البيع</p>
            </Card>
            <Card className="p-4 text-center border border-slate-700/30">
              <p className="text-xs text-slate-400 mb-1">هامش الربح</p>
              <p className={`text-base font-bold ${stats.profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.profitMargin.toFixed(1)}%
              </p>
            </Card>
            <Card className="p-4 text-center border border-slate-700/30">
              <p className="text-xs text-slate-400 mb-1">صافي الأثر المالي</p>
              <p className={`text-base font-bold ${stats.netFinancialImpact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmtMoney(stats.netFinancialImpact, 'USD')}
              </p>
              <p className="text-[10px] text-slate-500">استرداد مصدر - استرداد عملاء</p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
