import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Plus, Trash2, RefreshCw, Plane, TrendingUp, TrendingDown, AlertTriangle, BarChart3, Printer, Pencil, ArrowDownToLine, Clock } from 'lucide-react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Input, FormField, Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { fmtMoney } from '../utils/format';
import { useAuth } from '../state/auth';

type Airline = { id: number; name: string; currency_code: string; buy_fx_rate_to_usd: number };
type Party = { id: number; name: string; phone?: string; type: string };

type LegacyAdjustment = {
  id: number;
  passenger_name: string;
  pnr: string | null;
  ticket_number: string | null;
  airline_company_id: number | null;
  party_id: number | null;
  party_type: string | null;
  action: 'refund' | 'void';
  original_sell_usd: number;
  original_buy_usd: number;
  airline_refund_usd: number;
  airline_penalty_usd: number;
  customer_refund_usd: number;
  refund_status: 'pending' | 'posted';
  note: string | null;
  created_by_name: string;
  created_at: string;
  airline_name: string | null;
  airline_currency: string | null;
  party_name: string | null;
};

const emptyForm = {
  passenger_name: '',
  pnr: '',
  ticket_number: '',
  airline_company_id: '',
  party_type: 'customer' as 'customer' | 'office',
  party_id: '',
  new_party_name: '',
  new_party_phone: '',
  action: 'refund' as 'refund' | 'void',
  original_sell_usd: '',
  original_buy_usd: '',
  airline_refund_usd: '',
  airline_penalty_usd: '',
  customer_refund_usd: '',
  note: '',
};

export function LegacyTicketAdjustmentsPage() {
  const { user } = useAuth();
  const canDelete = user?.roles?.some((r: string) => ['admin', 'accounting', 'airline_admin'].includes(r));
  const isPrivileged = user?.roles?.some((r: string) => ['admin', 'airline_admin', 'accounting'].includes(r));

  const [rows, setRows] = useState<LegacyAdjustment[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [createNewParty, setCreateNewParty] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Autocomplete state for party search
  const [partyQuery, setPartyQuery] = useState('');
  const [partyResults, setPartyResults] = useState<Party[]>([]);
  const [partySearching, setPartySearching] = useState(false);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const partyTimerRef = useRef<number | null>(null);
  const partyDropdownRef = useRef<HTMLDivElement>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [adjRes, airRes] = await Promise.allSettled([
        api.get('/accounting/legacy-ticket-adjustments'),
        api.get('/airlines'),
      ]);
      if (adjRes.status === 'fulfilled') setRows(adjRes.value.data?.data || []);
      if (airRes.status === 'fulfilled') setAirlines(airRes.value.data?.items || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(e.target as Node)) {
        setShowPartyDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Debounced party search
  useEffect(() => {
    if (!showForm || createNewParty) return;
    const q = partyQuery.trim();
    if (q.length < 1) { setPartyResults([]); setPartySearching(false); return; }
    if (partyTimerRef.current) clearTimeout(partyTimerRef.current);
    partyTimerRef.current = window.setTimeout(async () => {
      setPartySearching(true);
      try {
        const endpoint = form.party_type === 'office' ? '/meta/offices' : '/meta/parties';
        const params = form.party_type === 'office'
          ? { q, limit: 15 }
          : { type: 'customer', q, limit: 15 };
        const res = await api.get(endpoint, { params });
        setPartyResults(res.data.data || []);
      } catch { setPartyResults([]); }
      finally { setPartySearching(false); }
    }, 250);
    return () => { if (partyTimerRef.current) clearTimeout(partyTimerRef.current); };
  }, [showForm, partyQuery, form.party_type, createNewParty]);

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // Get selected airline info
  const selectedAirline = useMemo(() => {
    if (!form.airline_company_id) return null;
    return airlines.find(a => a.id === Number(form.airline_company_id)) || null;
  }, [form.airline_company_id, airlines]);

  // Profit calculations for privileged users
  const profitsData = useMemo(() => {
    if (!isPrivileged) return [];
    return rows.map(r => {
      const sell = r.original_sell_usd || 0;
      const buy = r.original_buy_usd || 0;
      const profitBefore = sell - buy;
      const profitAfter = (sell - (r.customer_refund_usd || 0))
                        - (buy - (r.airline_refund_usd || 0) + (r.airline_penalty_usd || 0));
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
    const totalAirlineRefund = rows.reduce((s, r) => s + (r.airline_refund_usd || 0), 0);
    const totalCustomerRefund = rows.reduce((s, r) => s + (r.customer_refund_usd || 0), 0);
    const totalPenalty = rows.reduce((s, r) => s + (r.airline_penalty_usd || 0), 0);
    const avgProfitPerTicket = rows.length > 0 ? totalProfitAfter / rows.length : 0;
    const airlineRecoveryRate = totalBuy > 0 ? (totalAirlineRefund / totalBuy * 100) : 0;
    const customerRefundRate = totalSell > 0 ? (totalCustomerRefund / totalSell * 100) : 0;
    const profitMargin = totalSell > 0 ? (totalProfitAfter / totalSell * 100) : 0;
    const netFinancialImpact = totalAirlineRefund - totalCustomerRefund - totalPenalty;
    return {
      totalProfitBefore, totalProfitAfter, lossCount, totalLosses,
      totalSell, totalBuy, totalAirlineRefund, totalCustomerRefund, totalPenalty,
      avgProfitPerTicket, airlineRecoveryRate, customerRefundRate, profitMargin, netFinancialImpact,
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
        ticket_number: form.ticket_number.trim() || null,
        airline_company_id: form.airline_company_id ? Number(form.airline_company_id) : null,
        party_type: form.party_type,
        party_id: !createNewParty && form.party_id ? Number(form.party_id) : null,
        party_name: createNewParty ? form.new_party_name.trim() : null,
        party_phone: createNewParty ? form.new_party_phone.trim() || null : null,
        action: form.action,
        original_sell_usd: Number(form.original_sell_usd) || 0,
        original_buy_usd: Number(form.original_buy_usd) || 0,
        airline_refund_usd: Number(form.airline_refund_usd) || 0,
        airline_penalty_usd: Number(form.airline_penalty_usd) || 0,
        customer_refund_usd: Number(form.customer_refund_usd) || 0,
        note: form.note.trim() || null,
      };
      if (editingId) {
        await api.put(`/accounting/legacy-ticket-adjustments/${editingId}`, payload);
      } else {
        await api.post('/accounting/legacy-ticket-adjustment', payload);
      }
      setForm(emptyForm);
      setCreateNewParty(false);
      setPartyQuery('');
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
      const res = await api.patch(`/accounting/legacy-ticket-adjustments/${id}/refund-status`);
      setRows(prev => prev.map(r => r.id === id ? { ...r, refund_status: res.data.data.refund_status } : r));
    } catch (err: any) {
      alert(err?.response?.data?.error || 'حدث خطأ');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟ سيتم عكس جميع الحركات المالية المرتبطة.')) return;
    try {
      await api.delete(`/accounting/legacy-ticket-adjustments/${id}`);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'حدث خطأ');
    }
  }

  function handleEdit(r: LegacyAdjustment) {
    setForm({
      passenger_name: r.passenger_name || '',
      pnr: r.pnr || '',
      ticket_number: r.ticket_number || '',
      airline_company_id: r.airline_company_id ? String(r.airline_company_id) : '',
      party_type: (r.party_type as 'customer' | 'office') || 'customer',
      party_id: r.party_id ? String(r.party_id) : '',
      new_party_name: '',
      new_party_phone: '',
      action: r.action || 'refund',
      original_sell_usd: r.original_sell_usd ? String(r.original_sell_usd) : '',
      original_buy_usd: r.original_buy_usd ? String(r.original_buy_usd) : '',
      airline_refund_usd: r.airline_refund_usd ? String(r.airline_refund_usd) : '',
      airline_penalty_usd: r.airline_penalty_usd ? String(r.airline_penalty_usd) : '',
      customer_refund_usd: r.customer_refund_usd ? String(r.customer_refund_usd) : '',
      note: r.note || '',
    });
    setPartyQuery(r.party_name || '');
    setCreateNewParty(false);
    setEditingId(r.id);
    setShowForm(true);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function printReport() {
    setPrinting(true);
    try {
      const res = await api.get('/reports/legacy-adjustments/export', { responseType: 'blob' } as any);
      const blob = res.data as Blob;
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => { try { window.URL.revokeObjectURL(url); } catch {} }, 60_000);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشل فتح التقرير');
    } finally {
      setPrinting(false);
    }
  }

  // Helper: get profit for a row (used in table)
  function getRowProfit(r: LegacyAdjustment) {
    const sell = r.original_sell_usd || 0;
    const buy = r.original_buy_usd || 0;
    const profitBefore = sell - buy;
    const profitAfter = (sell - (r.customer_refund_usd || 0))
                      - (buy - (r.airline_refund_usd || 0) + (r.airline_penalty_usd || 0));
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
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Plane className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">تعديلات تذاكر قديمة</h1>
            <p className="text-sm text-slate-400">تسجيل ريفوند وفويد لتذاكر غير مدخلة بالنظام</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          {isPrivileged && (
            <Button variant="secondary" onClick={printReport} disabled={printing}>
              <Printer className="w-4 h-4 ml-1" />
              {printing ? '...' : 'طباعة تقرير'}
            </Button>
          )}
          <Button onClick={() => { setShowForm(v => !v); if (showForm) { setEditingId(null); setForm(emptyForm); setPartyQuery(''); } }}>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <FormField label="رقم التذكرة">
                  <Input value={form.ticket_number} onChange={e => updateField('ticket_number', e.target.value)} placeholder="رقم التذكرة" />
                </FormField>
                <FormField label="نوع العملية">
                  <Select value={form.action} onChange={e => updateField('action', e.target.value)}>
                    <option value="refund">ريفوند (Refund)</option>
                    <option value="void">فويد (Void)</option>
                  </Select>
                </FormField>
              </div>
            </div>

            {/* Section 2: Party (Customer/Office) */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">صاحب التذكرة</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField label="نوع الطرف">
                  <Select value={form.party_type} onChange={e => {
                    updateField('party_type', e.target.value);
                    updateField('party_id', '');
                    setCreateNewParty(false);
                    setPartyQuery('');
                    setPartyResults([]);
                  }}>
                    <option value="customer">عميل</option>
                    <option value="office">مكتب</option>
                  </Select>
                </FormField>

                {!createNewParty ? (
                  <FormField label={form.party_type === 'office' ? 'المكتب' : 'العميل'}>
                    <div className="relative" ref={partyDropdownRef}>
                      <Input
                        value={partyQuery}
                        onChange={e => {
                          setPartyQuery(e.target.value);
                          setShowPartyDropdown(true);
                          updateField('party_id', '');
                        }}
                        onFocus={() => { if (partyQuery.length >= 1) setShowPartyDropdown(true); }}
                        placeholder="اكتب للبحث..."
                        autoComplete="off"
                      />
                      {form.party_id && (
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-green-400 text-xs">&#10003;</span>
                      )}
                      {showPartyDropdown && partyQuery.length >= 1 && (
                        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {partySearching ? (
                            <div className="p-3 text-slate-400 text-xs text-center">جاري البحث...</div>
                          ) : partyResults.length === 0 ? (
                            <div className="p-3 text-slate-500 text-xs text-center">لا توجد نتائج</div>
                          ) : (
                            partyResults.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full text-right px-3 py-2 hover:bg-slate-700/60 text-sm text-slate-200 transition-colors border-b border-slate-700/30 last:border-0"
                                onClick={() => {
                                  updateField('party_id', String(p.id));
                                  setPartyQuery(p.name);
                                  setShowPartyDropdown(false);
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
                    updateField('party_id', '');
                    updateField('new_party_name', '');
                    setPartyQuery('');
                  }}>
                    {createNewParty ? 'اختيار من القائمة' : '+ إنشاء طرف جديد'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Section 3: Airline */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">شركة الطيران</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField label="شركة الطيران">
                  <Select value={form.airline_company_id} onChange={e => updateField('airline_company_id', e.target.value)}>
                    <option value="">-- اختياري --</option>
                    {airlines.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.currency_code})</option>
                    ))}
                  </Select>
                </FormField>

                {selectedAirline && (
                  <div className="flex items-end pb-2">
                    <span className="text-xs text-slate-400">
                      عملة الشركة: <span className="text-slate-200 font-semibold">{selectedAirline.currency_code}</span>
                      {selectedAirline.currency_code !== 'USD' && (
                        <> — سعر الصرف: <span className="text-slate-200 font-semibold">1 USD = {selectedAirline.buy_fx_rate_to_usd} {selectedAirline.currency_code}</span></>
                      )}
                    </span>
                  </div>
                )}

                <FormField label="مبلغ استرداد الطيران (USD)" hint="المبلغ الذي تعيده الشركة (بالدولار)">
                  <Input type="number" step="any" value={form.airline_refund_usd} onChange={e => updateField('airline_refund_usd', e.target.value)} placeholder="0" />
                </FormField>

                {selectedAirline && selectedAirline.currency_code !== 'USD' && Number(form.airline_refund_usd) > 0 && (
                  <div className="flex items-end pb-2">
                    <span className="text-xs text-green-400">
                      = {fmtMoney(Number(form.airline_refund_usd) * (selectedAirline.buy_fx_rate_to_usd || 1), selectedAirline.currency_code)} بعملة الشركة
                    </span>
                  </div>
                )}

                <FormField label="غرامة شركة الطيران (USD)">
                  <Input type="number" step="any" value={form.airline_penalty_usd} onChange={e => updateField('airline_penalty_usd', e.target.value)} placeholder="0" />
                </FormField>
              </div>
            </div>

            {/* Section 4: Original amounts + refund + notes */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">معلومات إضافية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField label="سعر البيع الأصلي (USD)">
                  <Input type="number" step="any" value={form.original_sell_usd} onChange={e => updateField('original_sell_usd', e.target.value)} placeholder="0" />
                </FormField>
                <FormField label="سعر الشراء الأصلي (USD)">
                  <Input type="number" step="any" value={form.original_buy_usd} onChange={e => updateField('original_buy_usd', e.target.value)} placeholder="0" />
                </FormField>
                <FormField label="مبلغ استرداد الطرف (USD)" hint="لا ينزل بكشف الحساب إلا بعد التنزيل يدوياً">
                  <Input
                    type="number" step="any"
                    value={form.customer_refund_usd}
                    onChange={e => updateField('customer_refund_usd', e.target.value)}
                    placeholder="0"
                  />
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
              <Button variant="ghost" type="button" onClick={() => { setShowForm(false); setForm(emptyForm); setCreateNewParty(false); setPartyQuery(''); setError(''); setEditingId(null); }}>
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
              <th className="text-right px-3 py-3 text-slate-400 font-medium">شركة الطيران</th>
              <th className="text-right px-3 py-3 text-slate-400 font-medium">الطرف</th>
              <th className="text-right px-3 py-3 text-slate-400 font-medium">العملية</th>
              <th className="text-right px-3 py-3 text-slate-400 font-medium">استرداد الطيران</th>
              <th className="text-right px-3 py-3 text-slate-400 font-medium">استرداد الطرف</th>
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
                      {r.ticket_number && <div className="text-xs text-slate-500 font-mono">{r.ticket_number}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 font-mono text-xs">{r.pnr || '-'}</td>
                    <td className="px-3 py-2.5">
                      {r.airline_name ? (
                        <div>
                          <div className="text-slate-300">{r.airline_name}</div>
                          {r.airline_currency && r.airline_currency !== 'USD' && (
                            <div className="text-xs text-slate-500">{r.airline_currency}</div>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.party_name ? (
                        <div>
                          <div className="text-slate-300">{r.party_name}</div>
                          <div className="text-xs text-slate-500">{r.party_type === 'office' ? 'مكتب' : 'عميل'}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={r.action === 'refund' ? 'amber' : 'red'}>
                        {r.action === 'refund' ? 'ريفوند' : 'فويد'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-green-400 font-medium">
                      {r.airline_refund_usd ? fmtMoney(r.airline_refund_usd, 'USD') : '-'}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">عدد السجلات</p>
            <p className="text-lg font-bold text-slate-100">{rows.length}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">إجمالي استرداد الطيران</p>
            <p className="text-lg font-bold text-green-400">
              {fmtMoney(rows.reduce((s, r) => s + (r.airline_refund_usd || 0), 0), 'USD')}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">إجمالي الغرامات</p>
            <p className="text-lg font-bold text-red-400">
              {fmtMoney(rows.reduce((s, r) => s + (r.airline_penalty_usd || 0), 0), 'USD')}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">إجمالي استرداد الأطراف</p>
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
              <p className="text-xs text-slate-400 mb-1">نسبة استرداد الطيران</p>
              <p className="text-base font-bold text-cyan-400">
                {stats.airlineRecoveryRate.toFixed(1)}%
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
              <p className="text-[10px] text-slate-500">استرداد طيران - استرداد عملاء - غرامات</p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
