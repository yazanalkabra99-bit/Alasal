import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { fmtDate, fmtMoney } from '../utils/format';
import { useAuth, hasAnyRole } from '../state/auth';
import { Modal } from '../components/ui/Modal';
import { ArrowLeft, RefreshCw, Calendar, Edit, Handshake, FilePlus2, ArrowRightLeft } from 'lucide-react';
import { CustomerSettlementModal } from '../features/customers/CustomerSettlementModal';
import { ManualLedgerEntryModal } from '../features/common/ManualLedgerEntryModal';
import { PartyTransferModal } from '../features/customers/PartyTransferModal';

type StatementRow = {
  happened_at: string;
  entry_type: string;
  ledger_type: 'sell';
  category: string;
  description: string;
  amount: number;
  currency_code: string;
  amount_usd: number;
  debit_usd: number;
  credit_usd: number;
  running_balance_usd: number;
  direction?: string;
  external_ticket_id?: number;
  receipt_no?: string | null;
  note?: string | null;
};

type StatementSummary = {
  total_debit_usd: number;
  total_credit_usd: number;
  balance_usd: number;
};

export function CustomerDetailsPage() {
  const { id } = useParams();
  const customerId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const canSeeFinancial = hasAnyRole(user, 'accounting', 'admin');
  const canEditCustomer = hasAnyRole(user, 'accounting', 'admin');

  const [customer, setCustomer] = useState<any | null>(null);
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settlement modal
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', phone: '', phone2: '', status: 'active', opening_balance: '' });

  const openEdit = () => {
    setEditData({
      name: customer?.name || '',
      phone: customer?.phone || '',
      phone2: customer?.phone2 || '',
      status: customer?.status || 'active',
      opening_balance: customer?.opening_balance != null && customer?.opening_balance !== 0
        ? String(customer.opening_balance) : '',
    });
    setEditError(null);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editData.name.trim()) { setEditError('الاسم مطلوب'); return; }
    setEditSaving(true);
    setEditError(null);
    try {
      const payload: any = {
        name: editData.name.trim(),
        phone: editData.phone.trim() || null,
        phone2: editData.phone2.trim() || null,
        status: editData.status,
      };
      if (editData.opening_balance !== '') {
        payload.opening_balance = Number(editData.opening_balance);
        payload.opening_balance_currency = 'USD';
      } else {
        payload.opening_balance = 0;
      }
      await api.patch(`/meta/customers/${customerId}`, payload);
      setEditOpen(false);
      load();
    } catch (e: any) {
      setEditError(e?.response?.data?.error || 'فشل الحفظ');
    } finally {
      setEditSaving(false);
    }
  };

  // Date filter
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'custom'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Ledger pages
  const [ledgerPages, setLedgerPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [totalLedgerPages, setTotalLedgerPages] = useState(1);
  const [closePageOpen, setClosePageOpen] = useState(false);
  const [closePageNote, setClosePageNote] = useState('');
  const [closingPage, setClosingPage] = useState(false);
  
  // Transaction type filter
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'collection' | 'refund' | 'settlement'>('all');
  
  // Service filter
  const [serviceFilter, setServiceFilter] = useState<'all' | 'visa' | 'passport' | 'ticket' | 'external_ticket' | 'service'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      
      // Handle date filters
      if (dateFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.append('from', today);
        params.append('to', today);
      } else if (dateFilter === 'this_week') {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        params.append('from', weekStart.toISOString().split('T')[0]);
        params.append('to', now.toISOString().split('T')[0]);
      } else if (dateFilter === 'this_month') {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        params.append('from', monthStart.toISOString().split('T')[0]);
        params.append('to', now.toISOString().split('T')[0]);
      } else if (dateFilter === 'custom') {
        if (dateFrom) params.append('from', dateFrom);
        if (dateTo) params.append('to', dateTo);
      }
      
      if (selectedPageId) params.append('pageId', String(selectedPageId));

      const [st, pagesRes] = await Promise.all([
        api.get(`/customers/${customerId}/unified-statement?${params.toString()}`),
        api.get(`/parties/${customerId}/ledger-pages`),
      ]);
      const data = st.data.data;
      setCustomer(data.customer || null);
      setRows(data.rows || []);
      setSummary(data.summary || null);
      if (data.ledger_page) {
        setTotalLedgerPages(data.ledger_page.total_pages || 1);
      }
      setLedgerPages(pagesRes.data.data?.pages || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'تعذر تحميل كشف الحساب');
    } finally {
      setLoading(false);
    }
  }, [customerId, dateFilter, dateFrom, dateTo, selectedPageId]);

  useEffect(() => {
    if (!customerId || Number.isNaN(customerId)) return;
    load();
  }, [customerId, load]);

  const balanceStatus = useMemo(() => {
    const b = Number(summary?.balance_usd || 0);
    if (b > 0.01) return 'debit';
    if (b < -0.01) return 'credit';
    return 'zero';
  }, [summary]);

  const handleClosePage = async () => {
    if (!summary) return;
    setClosingPage(true);
    try {
      await api.post(`/parties/${customerId}/ledger-pages/close`, {
        closing_balance_usd: summary.balance_usd,
        note: closePageNote.trim() || null,
      });
      setClosePageOpen(false);
      setClosePageNote('');
      setSelectedPageId(null);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل إقفال الصفحة');
    } finally {
      setClosingPage(false);
    }
  };

  const handleDeleteLastPage = async () => {
    if (ledgerPages.length === 0) return;
    const lastPage = ledgerPages[0];
    if (!confirm('هل تريد حذف آخر إقفال والعودة للصفحة السابقة؟')) return;
    try {
      await api.delete(`/parties/${customerId}/ledger-pages/${lastPage.id}`);
      setSelectedPageId(null);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل حذف الإقفال');
    }
  };

  // Filtered rows based on type and service filters
  const filteredRows = useMemo(() => {
    let filtered = rows;
    
    // Filter by transaction type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(row => row.entry_type === typeFilter);
    }
    
    // Filter by service type
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(row => {
        const cat = row.category;
        if (serviceFilter === 'visa') return cat === 'visa_sale';
        if (serviceFilter === 'passport') return cat === 'passport_sale';
        if (serviceFilter === 'ticket') return cat === 'flight_ticket_sale';
        if (serviceFilter === 'external_ticket') return cat === 'ext_ticket_sale';
        if (serviceFilter === 'service') return cat === 'service_sale';
        return true;
      });
    }
    
    return filtered;
  }, [rows, typeFilter, serviceFilter]);

  if (!customerId || Number.isNaN(customerId)) {
    return (
      <Card className="p-8 text-center">
        <div className="text-slate-400">رقم عميل غير صالح</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/customers?tab=customers')}
            className="p-2 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-400" />
          </button>

          <div>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl font-black text-cyan-400">
                {customer?.name?.charAt(0) || 'ع'}
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">{customer?.name || `عميل #${customerId}`}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge tone="cyan">عميل</Badge>
                  {!canSeeFinancial && <Badge tone="gray" variant="subtle">عرض فقط</Badge>}
                </div>
              </div>
            </div>
            {(customer?.phone || customer?.phone2) && (
              <div className="mt-2 text-sm text-slate-400" dir="ltr">
                {customer.phone || '—'}
                {customer.phone2 && <span className="text-slate-500"> / {customer.phone2}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            تحديث
          </Button>
          {customer && canSeeFinancial && (
            <>
              <Button size="sm" onClick={() => setSettlementOpen(true)}>
                <Handshake size={16} />
                تسوية
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setManualEntryOpen(true)}>
                <FilePlus2 size={16} />
                بند يدوي
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setTransferOpen(true)}>
                <ArrowRightLeft size={16} />
                تحويل رصيد
              </Button>
            </>
          )}
          {customer && canEditCustomer && (
            <Button variant="secondary" size="sm" onClick={openEdit}>
              <Edit size={16} />
              تعديل
            </Button>
          )}
        </div>
      </div>

      {/* Date filter */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            فلاتر متقدمة
          </div>
          
          {/* Date filter row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">فترة التقرير</div>
              <select 
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value as any)}
              >
                <option value="all">جميع الفترات</option>
                <option value="today">هذا اليوم</option>
                <option value="this_week">هذا الأسبوع</option>
                <option value="this_month">هذا الشهر</option>
                <option value="custom">فترة مخصصة</option>
              </select>
            </div>
            
            <div>
              <div className="text-xs text-slate-400 mb-1">نوع الحركة</div>
              <select 
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value as any)}
              >
                <option value="all">جميع الحركات</option>
                <option value="sale">بيع</option>
                <option value="collection">تحصيل</option>
                <option value="settlement">تسوية</option>
                <option value="refund">استرداد</option>
              </select>
            </div>
            
            <div>
              <div className="text-xs text-slate-400 mb-1">نوع الخدمة</div>
              <select 
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                value={serviceFilter} 
                onChange={(e) => setServiceFilter(e.target.value as any)}
              >
                <option value="all">جميع الخدمات</option>
                <option value="visa">فيزا</option>
                <option value="passport">جوازات</option>
                <option value="ticket">تذاكر طيران</option>
                <option value="external_ticket">تذاكر خارجية</option>
                <option value="service">خدمات</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={load} disabled={loading} className="w-full">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                تطبيق
              </Button>
            </div>
          </div>
          
          {/* Custom date range */}
          {dateFilter === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              <div>
                <div className="text-xs text-slate-400 mb-1">من</div>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">إلى</div>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setDateFilter('all');
                  }}
                  className="w-full"
                >
                  مسح
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-slate-400">إجمالي عليه (USD)</div>
          <div className="text-2xl font-black text-red-400 mt-1">{fmtMoney(summary?.total_debit_usd || 0, 'USD')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-400">إجمالي له (USD)</div>
          <div className="text-2xl font-black text-green-400 mt-1">{fmtMoney(summary?.total_credit_usd || 0, 'USD')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-400">الرصيد (USD)</div>
          <div
            className={
              'text-2xl font-black mt-1 ' +
              (balanceStatus === 'debit'
                ? 'text-red-400'
                : balanceStatus === 'credit'
                  ? 'text-green-400'
                  : 'text-slate-300')
            }
          >
            {fmtMoney(Math.abs(summary?.balance_usd || 0), 'USD')}
            <span className="text-xs mr-1">
              {balanceStatus === 'debit' ? 'عليه' : balanceStatus === 'credit' ? 'له' : ''}
            </span>
          </div>
        </Card>
      </div>

      {/* Ledger Pages Bar */}
      {canSeeFinancial && ledgerPages.length > 0 && (
        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-300">صفحات الكشف:</span>
            <select
              value={selectedPageId ?? ''}
              onChange={(e) => setSelectedPageId(e.target.value ? Number(e.target.value) : null)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200"
            >
              <option value="">الصفحة الحالية (صفحة {totalLedgerPages})</option>
              {ledgerPages.map((p: any, i: number) => (
                <option key={p.id} value={p.id}>
                  صفحة {totalLedgerPages - 1 - i} — إقفال {String(p.closed_at || '').slice(0, 10)} — رصيد {Number(p.closing_balance_usd).toFixed(2)} USD
                </option>
              ))}
            </select>
            {selectedPageId && (
              <Button variant="secondary" size="sm" onClick={() => setSelectedPageId(null)}>
                العودة للصفحة الحالية
              </Button>
            )}
            {!selectedPageId && (
              <Button
                size="sm"
                onClick={() => { setClosePageNote(''); setClosePageOpen(true); }}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                إقفال الصفحة الحالية
              </Button>
            )}
            {!selectedPageId && ledgerPages.length > 0 && hasAnyRole(user, 'admin') && (
              <Button variant="secondary" size="sm" onClick={handleDeleteLastPage} className="text-red-400 hover:text-red-300">
                حذف آخر إقفال
              </Button>
            )}
          </div>
          {selectedPageId && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
              تعرض صفحة مغلقة — الحركات بعد هذا الإقفال لن تظهر هنا
            </div>
          )}
        </Card>
      )}
      {canSeeFinancial && ledgerPages.length === 0 && summary && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => { setClosePageNote(''); setClosePageOpen(true); }}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            إقفال صفحة الكشف
          </Button>
        </div>
      )}

      {/* Close Page Modal */}
      <Modal open={closePageOpen} onClose={() => setClosePageOpen(false)} title="إقفال صفحة كشف الحساب">
        <div className="space-y-4">
          <p className="text-slate-300 text-sm">
            سيتم إقفال الصفحة الحالية وبدء صفحة جديدة. الرصيد الحالي سيكون الرصيد الافتتاحي للصفحة الجديدة.
          </p>
          <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">الرصيد الحالي (سيُنقل كرصيد افتتاحي)</div>
            <div className={`text-lg font-bold ${summary && summary.balance_usd > 0 ? 'text-red-400' : summary && summary.balance_usd < 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
              {summary ? `${Math.abs(summary.balance_usd).toFixed(2)} USD` : '—'} {summary && summary.balance_usd > 0 ? '(عليه)' : summary && summary.balance_usd < 0 ? '(له)' : ''}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">ملاحظة (اختياري)</label>
            <Input
              value={closePageNote}
              onChange={(e) => setClosePageNote(e.target.value)}
              placeholder="مثال: إقفال نهاية الأسبوع"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setClosePageOpen(false)}>إلغاء</Button>
            <Button onClick={handleClosePage} loading={closingPage} className="bg-amber-600 hover:bg-amber-700">
              تأكيد الإقفال
            </Button>
          </div>
        </div>
      </Modal>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <div className="font-bold text-white">كشف الحساب</div>
          <div className="text-xs text-slate-400">{filteredRows.length} حركة مالية {
            (typeFilter !== 'all' || serviceFilter !== 'all') && 
            `(مفلترة من ${rows.length})`
          }</div>
        </div>

        {!canSeeFinancial ? (
          <div className="py-12 text-center text-slate-400">🔒 كشف الحساب متاح للمحاسبة والإدارة فقط</div>
        ) : loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-400">{error}</div>
        ) : filteredRows.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            {
              (typeFilter !== 'all' || serviceFilter !== 'all') 
                ? 'لا توجد حركات بهذا الفلتر' 
                : 'لا توجد حركات في هذه الفترة'
            }
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/60 text-slate-300">
                <tr>
                  <th className="text-right px-4 py-3 font-bold">#</th>
                  <th className="text-right px-4 py-3 font-bold">التاريخ</th>
                  <th className="text-right px-4 py-3 font-bold">البيان</th>
                  <th className="text-right px-4 py-3 font-bold">المبلغ</th>
                  <th className="text-right px-4 py-3 font-bold text-red-400">عليه</th>
                  <th className="text-right px-4 py-3 font-bold text-green-400">له</th>
                  <th className="text-right px-4 py-3 font-bold">الرصيد</th>
                  <th className="text-right px-4 py-3 font-bold">مرجع</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{row.happened_at ? fmtDate(row.happened_at) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          tone={
                            row.entry_type === 'opening_balance' ? 'gray' :
                            row.entry_type === 'sale' ? 'blue' :
                            row.entry_type === 'collection' ? 'green' :
                            row.entry_type === 'settlement' ? 'cyan' :
                            'amber'
                          }
                          className="text-[10px]"
                        >
                          {row.entry_type === 'opening_balance' ? 'رصيد افتتاحي' :
                           row.entry_type === 'sale' ? 'بيع' :
                           row.entry_type === 'collection' ? 'تحصيل' :
                           row.entry_type === 'settlement'
                             ? (row.direction === 'out' ? 'تسوية (صادر)' : 'تسوية')
                             : 'استرداد'}
                        </Badge>
                        <span className="text-slate-200">{row.description}</span>
                      </div>
                      {row.receipt_no && (
                        <div className="text-xs text-slate-500 mt-1">إيصال: {row.receipt_no}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {row.currency_code !== 'USD' ? fmtMoney(row.amount, row.currency_code) : '—'}
                    </td>
                    <td className="px-4 py-3 font-bold whitespace-nowrap">
                      {row.debit_usd > 0 ? <span className="text-red-400">{fmtMoney(row.debit_usd, 'USD')}</span> : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 font-bold whitespace-nowrap">
                      {row.credit_usd > 0 ? <span className="text-green-400">{fmtMoney(row.credit_usd, 'USD')}</span> : <span className="text-slate-600">—</span>}
                    </td>
                    <td
                      className={
                        'px-4 py-3 font-bold whitespace-nowrap ' +
                        (row.running_balance_usd > 0.01
                          ? 'text-red-400'
                          : row.running_balance_usd < -0.01
                            ? 'text-green-400'
                            : 'text-slate-400')
                      }
                    >
                      {fmtMoney(Math.abs(row.running_balance_usd), 'USD')}
                      <span className="text-xs mr-1">
                        {row.running_balance_usd > 0.01 ? 'عليه' : row.running_balance_usd < -0.01 ? 'له' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {row.external_ticket_id ? (
                        <Link className="text-amber-400 hover:underline" to={`/external-tickets/${row.external_ticket_id}`}>
                          تذكرة خارجية #{row.external_ticket_id}
                        </Link>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900/80 font-bold">
                <tr className="border-t-2 border-slate-700">
                  <td colSpan={4} className="px-4 py-3 text-slate-300">المجموع</td>
                  <td className="px-4 py-3 text-red-400">{fmtMoney(summary?.total_debit_usd || 0, 'USD')}</td>
                  <td className="px-4 py-3 text-green-400">{fmtMoney(summary?.total_credit_usd || 0, 'USD')}</td>
                  <td className={(balanceStatus === 'debit' ? 'text-red-400' : balanceStatus === 'credit' ? 'text-green-400' : 'text-slate-400') + ' px-4 py-3'}>
                    {fmtMoney(Math.abs(summary?.balance_usd || 0), 'USD')}
                    <span className="text-xs mr-1">
                      {balanceStatus === 'debit' ? 'عليه' : balanceStatus === 'credit' ? 'له' : ''}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Settlement Modal */}
      <CustomerSettlementModal
        open={settlementOpen}
        onClose={() => setSettlementOpen(false)}
        customerId={customerId}
        onSaved={load}
      />

      {/* Manual Ledger Entry Modal */}
      <ManualLedgerEntryModal
        open={manualEntryOpen}
        onClose={() => setManualEntryOpen(false)}
        partyId={customerId}
        partyType="customer"
        partyName={customer?.name}
        onSaved={load}
      />

      {/* Party Transfer Modal */}
      <PartyTransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        fromPartyId={customerId}
        fromPartyName={customer?.name}
        fromPartyType="customer"
        onSaved={load}
      />

      {/* Edit Customer Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="تعديل بيانات العميل" width="max-w-md">
        <div className="space-y-4">
          {editError && (
            <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{editError}</div>
          )}

          <div>
            <label className="text-xs text-slate-400 mb-1 block">الاسم *</label>
            <Input
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              placeholder="اسم العميل"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">هاتف 1</label>
              <Input
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                placeholder="+963..."
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">هاتف 2</label>
              <Input
                value={editData.phone2}
                onChange={(e) => setEditData({ ...editData, phone2: e.target.value })}
                placeholder="+963..."
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">الذمة المالية الابتدائية (USD)</label>
            <Input
              type="number"
              value={editData.opening_balance}
              onChange={(e) => setEditData({ ...editData, opening_balance: e.target.value })}
              placeholder="0"
              dir="ltr"
            />
            <p className="text-xs text-slate-500 mt-1">موجب = عليه لنا &nbsp;|&nbsp; سالب = له علينا &nbsp;|&nbsp; 0 = لا يوجد</p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700">
            <div>
              <p className="text-sm text-slate-300">الحالة</p>
              <p className="text-xs text-slate-500">{editData.status === 'active' ? 'العميل نشط' : 'العميل غير نشط'}</p>
            </div>
            <button
              type="button"
              onClick={() => setEditData({ ...editData, status: editData.status === 'active' ? 'inactive' : 'active' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                editData.status === 'active'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                  : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
              }`}
            >
              {editData.status === 'active' ? 'تعطيل' : 'تفعيل'}
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>إلغاء</Button>
            <Button onClick={handleEdit} loading={editSaving}>حفظ التغييرات</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
