import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import type { Party } from '../utils/types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { fmtDate, fmtMoney } from '../utils/format';
import { useAuth, hasAnyRole } from '../state/auth';
import { useCurrencies } from '../utils/useCurrencies';
import { OfficeSettlementModal } from '../features/offices/OfficeSettlementModal';
import { OfficeNettingModal } from '../features/offices/OfficeNettingModal';
import { ManualLedgerEntryModal } from '../features/common/ManualLedgerEntryModal';
import { OfficeTransferModal } from '../features/offices/OfficeTransferModal';
import { PartyTransferModal } from '../features/customers/PartyTransferModal';
import {
  Building2, ArrowLeft, RefreshCw, FileSpreadsheet, FileText,
  TrendingUp, TrendingDown, ArrowUpDown, Calendar, Edit,
  Phone, Mail, MapPin, Download, Printer, ArrowRightLeft
} from 'lucide-react';

type StatementRow = {
  happened_at: string;
  entry_type: string;
  ledger_type: 'sell' | 'buy';
  category: string;
  description: string;
  amount: number;
  currency_code: string;
  amount_usd: number;
  debit_usd: number;   // عليه
  credit_usd: number;  // له
  running_balance_usd: number;
  visa_request_id?: number;
  passport_request_id?: number;
  transaction_id?: number;
  receipt_no?: string;
  note?: string;
};

type StatementSummary = {
  total_debit_usd: number;
  total_credit_usd: number;
  balance_usd: number;
};

export function OfficeDetailsPage() {
  const { id } = useParams();
  const officeId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const canSeeFinancial = hasAnyRole(user, 'accounting', 'admin');
  const canManage = hasAnyRole(user, 'admin', 'visa_admin', 'passport_admin', 'airline_admin', 'accounting');
  const { currencies } = useCurrencies();

  const [office, setOffice] = useState<any | null>(null);
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const [nettingOpen, setNettingOpen] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [partyTransferOpen, setPartyTransferOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  // Print preview
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printPreviewLoading, setPrintPreviewLoading] = useState(false);
  const [printEntries, setPrintEntries] = useState<any[]>([]);
  const [printHasOpening, setPrintHasOpening] = useState(false);
  const [printHideOpening, setPrintHideOpening] = useState(false);
  const [printExcluded, setPrintExcluded] = useState<Set<number>>(new Set());

  // Date filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Ledger pages
  const [ledgerPages, setLedgerPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [totalLedgerPages, setTotalLedgerPages] = useState(1);
  const [closePageOpen, setClosePageOpen] = useState(false);
  const [closePageNote, setClosePageNote] = useState('');
  const [closingPage, setClosingPage] = useState(false);

  // Edit form
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', notes: '', opening_balance: '', opening_balance_currency: 'USD' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Get office info
      const meta = await api.get('/meta/offices');
      const found = (meta.data.data || []).find((x: any) => Number(x.id) === officeId);
      setOffice(found || null);

      if (!found) {
        throw new Error('المكتب غير موجود');
      }

      // Get unified statement
      if (canSeeFinancial) {
        const params = new URLSearchParams();
        if (dateFrom) params.append('from', dateFrom);
        if (dateTo) params.append('to', dateTo);
        if (selectedPageId) params.append('pageId', String(selectedPageId));

        const [st, pagesRes] = await Promise.all([
          api.get(`/offices/${officeId}/unified-statement?${params.toString()}`),
          api.get(`/parties/${officeId}/ledger-pages`),
        ]);
        const data = st.data.data;
        setRows(data.rows || []);
        setSummary(data.summary || null);
        if (data.ledger_page) {
          setTotalLedgerPages(data.ledger_page.total_pages || 1);
        }
        setLedgerPages(pagesRes.data.data?.pages || []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'تعذر تحميل ملف المكتب');
    } finally {
      setLoading(false);
    }
  }, [officeId, canSeeFinancial, dateFrom, dateTo, selectedPageId]);

  useEffect(() => {
    if (!officeId) return;
    load();
  }, [officeId, load]);

  const badges = useMemo(() => {
    const sell = !!office?.can_sell_to_office;
    const buy = !!office?.can_buy_from_office;
    return { sell, buy };
  }, [office]);

  const openEditModal = () => {
    setFormData({
      name: office?.name || '',
      phone: office?.phone || '',
      email: office?.email || '',
      address: office?.address || '',
      notes: office?.notes || '',
      opening_balance: office?.opening_balance != null ? String(office.opening_balance) : '',
      opening_balance_currency: office?.opening_balance_currency || 'USD',
    });
    setFormError(null);
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      setFormError('اسم المكتب مطلوب');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await api.patch(`/meta/offices/${officeId}`, formData);
      setEditOpen(false);
      load();
    } catch (e: any) {
      setFormError(e?.response?.data?.error || 'فشل تحديث المكتب');
    } finally {
      setSaving(false);
    }
  };

  const openPrintPreview = async () => {
    if (!canSeeFinancial) return;
    setPrintPreviewLoading(true);
    setPrintPreviewOpen(true);
    setPrintExcluded(new Set());
    setPrintHideOpening(false);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);
      if (selectedPageId) params.append('pageId', String(selectedPageId));
      const res = await api.get(`/reports/office/${officeId}/export-preview?${params.toString()}`);
      const data = res.data.data;
      setPrintEntries(data.entries || []);
      setPrintHasOpening(data.hasOpeningBalance);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تحميل المعاينة');
      setPrintPreviewOpen(false);
    } finally {
      setPrintPreviewLoading(false);
    }
  };

  const handleClosePage = async () => {
    if (!summary) return;
    setClosingPage(true);
    try {
      await api.post(`/parties/${officeId}/ledger-pages/close`, {
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
    const lastPage = ledgerPages[0]; // sorted DESC
    if (!confirm('هل تريد حذف آخر إقفال والعودة للصفحة السابقة؟')) return;
    try {
      await api.delete(`/parties/${officeId}/ledger-pages/${lastPage.id}`);
      setSelectedPageId(null);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل حذف الإقفال');
    }
  };

  const executePrint = async () => {
    setExporting('excel');
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);
      if (printHideOpening) params.append('hideOpening', '1');
      if (printExcluded.size > 0) params.append('exclude', Array.from(printExcluded).join(','));
      if (selectedPageId) params.append('pageId', String(selectedPageId));

      const response = await api.get(`/reports/office/${officeId}/export?${params.toString()}`, {
        responseType: 'blob'
      });

      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => { try { window.URL.revokeObjectURL(url); } catch {} }, 60_000);
      setPrintPreviewOpen(false);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تصدير الكشف');
    } finally {
      setExporting(null);
    }
  };

  const printStatement = () => {
    window.print();
  };

  if (!officeId || Number.isNaN(officeId)) {
    return (
      <Card className="p-8 text-center">
        <div className="text-slate-400">رقم مكتب غير صالح</div>
      </Card>
    );
  }

  const balanceStatus = summary ? (
    summary.balance_usd > 0.01 ? 'debit' :
    summary.balance_usd < -0.01 ? 'credit' : 'zero'
  ) : 'zero';

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header - Hidden on print */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 print:hidden">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/offices')}
            className="p-2 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-400" />
          </button>
          
          <div>
            <div className="flex items-center gap-3">
              <div className={`
                w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black
                ${badges.sell && badges.buy ? 'bg-gradient-to-br from-green-500/20 to-blue-500/20 text-blue-400' :
                  badges.sell ? 'bg-green-500/10 text-green-400' :
                  badges.buy ? 'bg-blue-500/10 text-blue-400' :
                  'bg-slate-700/50 text-slate-400'
                }
              `}>
                {office?.name?.charAt(0) || '؟'}
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">{office?.name || `مكتب #${officeId}`}</h1>
                <div className="flex items-center gap-2 mt-1">
                  {badges.sell && <Badge tone="green">نبيع له</Badge>}
                  {badges.buy && <Badge tone="blue">نشتري منه</Badge>}
                  {!badges.sell && !badges.buy && <Badge tone="gray">جديد</Badge>}
                </div>
              </div>
            </div>
            
            {/* Contact Info */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-400">
              {office?.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={14} />
                  <span dir="ltr">{office.phone}</span>
                </span>
              )}
              {office?.email && (
                <span className="flex items-center gap-1">
                  <Mail size={14} />
                  {office.email}
                </span>
              )}
              {office?.address && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {office.address}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
          {canManage && (
            <Button variant="secondary" size="sm" onClick={openEditModal}>
              <Edit size={16} />
            </Button>
          )}
          {canSeeFinancial && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setTransferOpen(true)}>
                تحويل لمكتب
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPartyTransferOpen(true)}>
                <ArrowRightLeft size={16} />
                تحويل لعميل/مكتب
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setManualEntryOpen(true)}>
                بند يدوي
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setNettingOpen(true)}>
                مقاصة
              </Button>
              <Button onClick={() => setSettleOpen(true)}>
                تسوية
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">كشف حساب</h1>
        <h2 className="text-xl mt-2">{office?.name}</h2>
        {(dateFrom || dateTo) && (
          <p className="text-sm mt-1">
            الفترة: {dateFrom || 'البداية'} إلى {dateTo || 'الآن'}
          </p>
        )}
        <p className="text-xs mt-1 text-gray-500">
          تاريخ الطباعة: {new Date().toLocaleDateString('en-GB')}
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-800/60 bg-red-950/30 p-4 text-sm text-red-200 print:hidden">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3">
            <Card className="relative overflow-hidden print:border print:border-gray-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600 print:hidden" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 print:text-gray-600">مجموع عليه (مدين)</p>
                  <p className="text-sm text-slate-500 print:text-gray-500">ما يستحقه لنا</p>
                </div>
                <TrendingDown className="w-5 h-5 text-red-400 print:text-red-600" />
              </div>
              <p className="text-2xl font-black text-white mt-2 print:text-black">
                {canSeeFinancial ? fmtMoney(summary?.total_debit_usd || 0, 'USD') : '🔒'}
              </p>
            </Card>

            <Card className="relative overflow-hidden print:border print:border-gray-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600 print:hidden" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 print:text-gray-600">مجموع له (دائن)</p>
                  <p className="text-sm text-slate-500 print:text-gray-500">ما نستحقه له</p>
                </div>
                <TrendingUp className="w-5 h-5 text-green-400 print:text-green-600" />
              </div>
              <p className="text-2xl font-black text-white mt-2 print:text-black">
                {canSeeFinancial ? fmtMoney(summary?.total_credit_usd || 0, 'USD') : '🔒'}
              </p>
            </Card>

            <Card className={`relative overflow-hidden print:border print:border-gray-300 ${
              balanceStatus === 'debit' ? 'ring-2 ring-red-500/30' :
              balanceStatus === 'credit' ? 'ring-2 ring-green-500/30' : ''
            }`}>
              <div className={`absolute top-0 left-0 w-full h-1 print:hidden ${
                balanceStatus === 'debit' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                balanceStatus === 'credit' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                'bg-gradient-to-r from-slate-500 to-slate-600'
              }`} />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 print:text-gray-600">الرصيد الصافي</p>
                  <p className="text-sm text-slate-500 print:text-gray-500">
                    {balanceStatus === 'debit' ? 'عليه لنا' :
                     balanceStatus === 'credit' ? 'له علينا' : 'متعادل'}
                  </p>
                </div>
                <ArrowUpDown className={`w-5 h-5 ${
                  balanceStatus === 'debit' ? 'text-red-400 print:text-red-600' :
                  balanceStatus === 'credit' ? 'text-green-400 print:text-green-600' :
                  'text-slate-400'
                }`} />
              </div>
              <p className={`text-2xl font-black mt-2 ${
                balanceStatus === 'debit' ? 'text-red-400 print:text-red-600' :
                balanceStatus === 'credit' ? 'text-green-400 print:text-green-600' :
                'text-white print:text-black'
              }`}>
                {canSeeFinancial ? fmtMoney(Math.abs(summary?.balance_usd || 0), 'USD') : '🔒'}
              </p>
            </Card>
          </div>

          {/* Filter & Export - Hidden on print */}
          {canSeeFinancial && (
            <Card className="p-4 print:hidden">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-slate-400" />
                  <span className="font-bold text-white">فلترة الفترة</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().slice(0, 10);
                      setDateFrom(today);
                      setDateTo(today);
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 transition font-medium"
                  >
                    اليوم
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date();
                      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
                      const today = now.toISOString().slice(0, 10);
                      setDateFrom(monthStart);
                      setDateTo(today);
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-purple-400 transition font-medium"
                  >
                    هذا الشهر
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">من:</span>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">إلى:</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  {(dateFrom || dateTo) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                    >
                      مسح
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openPrintPreview()}
                    loading={exporting === 'excel'}
                    disabled={!!exporting}
                  >
                    <Printer size={16} />
                    طباعة التقرير
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Ledger Pages Bar */}
          {canSeeFinancial && ledgerPages.length > 0 && (
            <Card className="p-3 print:hidden">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-slate-300">صفحات الكشف:</span>
                <select
                  value={selectedPageId ?? ''}
                  onChange={(e) => setSelectedPageId(e.target.value ? Number(e.target.value) : null)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200"
                >
                  <option value="">الصفحة الحالية (صفحة {totalLedgerPages})</option>
                  {ledgerPages.map((p, i) => (
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
            <div className="flex justify-end print:hidden">
              <Button
                size="sm"
                onClick={() => { setClosePageNote(''); setClosePageOpen(true); }}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                إقفال صفحة الكشف
              </Button>
            </div>
          )}

          {/* Close Page Confirmation Modal */}
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

          {/* Unified Statement Table */}
          <Card className="overflow-hidden print:shadow-none print:border print:border-gray-300">
            <div className="p-4 border-b border-slate-800 print:border-gray-300 print:hidden">
              <h3 className="font-bold text-white">كشف الحساب</h3>
              <p className="text-xs text-slate-400">{rows.length} حركة مالية</p>
            </div>
            
            {!canSeeFinancial ? (
              <div className="py-12 text-center text-slate-400">
                🔒 كشف الحساب متاح للمحاسبة والإدارة فقط
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                لا توجد حركات في هذه الفترة
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm print:text-xs">
                  <thead className="bg-slate-900/60 text-slate-300 print:bg-gray-100 print:text-black">
                    <tr>
                      <th className="text-right px-4 py-3 font-bold">#</th>
                      <th className="text-right px-4 py-3 font-bold">التاريخ</th>
                      <th className="text-right px-4 py-3 font-bold">البيان</th>
                      <th className="text-right px-4 py-3 font-bold">المبلغ</th>
                      <th className="text-right px-4 py-3 font-bold text-red-400 print:text-red-600">عليه (مدين)</th>
                      <th className="text-right px-4 py-3 font-bold text-green-400 print:text-green-600">له (دائن)</th>
                      <th className="text-right px-4 py-3 font-bold">الرصيد</th>
                      <th className="text-right px-4 py-3 font-bold print:hidden">مرجع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className="border-t border-slate-800/60 hover:bg-slate-800/30 transition-colors print:border-gray-200 print:hover:bg-transparent"
                      >
                        <td className="px-4 py-3 text-slate-500 print:text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-slate-300 print:text-black whitespace-nowrap">
                          {row.happened_at ? fmtDate(row.happened_at) : '—'}
                        </td>
                        <td className="px-4 py-3 print:text-black">
                          <div className="flex items-center gap-2">
                            <Badge
                              tone={row.entry_type === 'opening_balance' ? 'gray' : row.ledger_type === 'sell' ? 'blue' : 'amber'}
                              className="text-[10px] print:hidden"
                            >
                              {row.entry_type === 'opening_balance' ? 'رصيد افتتاحي' : row.ledger_type === 'sell' ? 'بيع' : 'شراء'}
                            </Badge>
                            <span className="text-slate-200 print:text-black">{row.description}</span>
                          </div>
                          {row.note && row.note !== row.description && (
                            <div className="text-xs text-slate-500 mt-1 print:text-gray-500">{row.note}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 print:text-gray-600 whitespace-nowrap">
                          {row.currency_code !== 'USD' && (
                            <span>{fmtMoney(row.amount, row.currency_code)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold whitespace-nowrap">
                          {row.debit_usd > 0 ? (
                            <span className="text-red-400 print:text-red-600">
                              {fmtMoney(row.debit_usd, 'USD')}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold whitespace-nowrap">
                          {row.credit_usd > 0 ? (
                            <span className="text-green-400 print:text-green-600">
                              {fmtMoney(row.credit_usd, 'USD')}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className={`px-4 py-3 font-bold whitespace-nowrap ${
                          row.running_balance_usd > 0.01 ? 'text-red-400 print:text-red-600' :
                          row.running_balance_usd < -0.01 ? 'text-green-400 print:text-green-600' :
                          'text-slate-400 print:text-gray-600'
                        }`}>
                          {fmtMoney(Math.abs(row.running_balance_usd), 'USD')}
                          <span className="text-xs mr-1">
                            {row.running_balance_usd > 0.01 ? 'عليه' :
                             row.running_balance_usd < -0.01 ? 'له' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 print:hidden">
                          {row.visa_request_id ? (
                            <Link className="text-blue-400 hover:underline" to={`/visa/${row.visa_request_id}`}>
                              فيزا #{row.visa_request_id}
                            </Link>
                          ) : row.passport_request_id ? (
                            <Link className="text-cyan-400 hover:underline" to={`/passport/${row.passport_request_id}`}>
                              جواز #{row.passport_request_id}
                            </Link>
                          ) : (row as any).external_ticket_id ? (
                            <Link className="text-blue-400 hover:underline" to={`/external-tickets/${(row as any).external_ticket_id}`}>
                              تذكرة خارجية #{(row as any).external_ticket_id}
                            </Link>
                          ) : row.receipt_no ? (
                            <span className="text-slate-500">#{row.receipt_no}</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Footer with totals */}
                  <tfoot className="bg-slate-900/80 print:bg-gray-200 font-bold">
                    <tr className="border-t-2 border-slate-700 print:border-gray-400">
                      <td colSpan={4} className="px-4 py-3 text-slate-300 print:text-black">المجموع</td>
                      <td className="px-4 py-3 text-red-400 print:text-red-600">
                        {fmtMoney(summary?.total_debit_usd || 0, 'USD')}
                      </td>
                      <td className="px-4 py-3 text-green-400 print:text-green-600">
                        {fmtMoney(summary?.total_credit_usd || 0, 'USD')}
                      </td>
                      <td className={`px-4 py-3 ${
                        balanceStatus === 'debit' ? 'text-red-400 print:text-red-600' :
                        balanceStatus === 'credit' ? 'text-green-400 print:text-green-600' :
                        'text-slate-400'
                      }`}>
                        {fmtMoney(Math.abs(summary?.balance_usd || 0), 'USD')}
                        <span className="text-xs mr-1">
                          {balanceStatus === 'debit' ? 'عليه' :
                           balanceStatus === 'credit' ? 'له' : ''}
                        </span>
                      </td>
                      <td className="print:hidden"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>

          {/* Office Info Card */}
          <Card className="print:hidden">
            <h3 className="font-bold text-white mb-3">معلومات المكتب</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-400 block">الاسم</span>
                <span className="text-white font-medium">{office?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">الهاتف</span>
                <span className="text-white" dir="ltr">{office?.phone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">البريد</span>
                <span className="text-white">{office?.email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">نوع التعامل</span>
                <span className="text-white">
                  {badges.sell && badges.buy ? 'بيع + شراء' :
                   badges.sell ? 'بيع' :
                   badges.buy ? 'شراء' : '—'}
                </span>
              </div>
              {office?.opening_balance != null && Number(office.opening_balance) !== 0 && (
                <div>
                  <span className="text-slate-400 block">الذمة الابتدائية</span>
                  <span className="text-amber-400 font-medium">
                    {fmtMoney(Number(office.opening_balance), office.opening_balance_currency || 'USD')}
                  </span>
                </div>
              )}
            </div>
            {office?.notes && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <span className="text-slate-400 block mb-1">ملاحظات</span>
                <span className="text-slate-300 text-xs">{office.notes}</span>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Modals */}
      {canSeeFinancial && (
        <>
          <OfficeSettlementModal
            open={settleOpen}
            onClose={() => setSettleOpen(false)}
            officeId={officeId}
            onSaved={load}
          />
          <OfficeNettingModal
            open={nettingOpen}
            onClose={() => setNettingOpen(false)}
            officeId={officeId}
            onSaved={load}
          />
          <ManualLedgerEntryModal
            open={manualEntryOpen}
            onClose={() => setManualEntryOpen(false)}
            partyId={officeId}
            partyType="office"
            partyName={office?.name}
            onSaved={load}
          />
          <OfficeTransferModal
            open={transferOpen}
            onClose={() => setTransferOpen(false)}
            fromOfficeId={officeId}
            fromOfficeName={office?.name}
            onSaved={load}
          />
          <PartyTransferModal
            open={partyTransferOpen}
            onClose={() => setPartyTransferOpen(false)}
            fromPartyId={officeId}
            fromPartyName={office?.name}
            fromPartyType="office"
            onSaved={load}
          />
        </>
      )}

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`تعديل: ${office?.name || ''}`}
        width="max-w-lg"
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">
              {formError}
            </div>
          )}
          
          <div>
            <label className="text-xs text-slate-400 mb-1 block">اسم المكتب *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">رقم الهاتف</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">البريد الإلكتروني</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">العنوان</label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {/* Opening Balance */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">الذمة الابتدائية</label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="0.00"
                value={formData.opening_balance}
                onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                className="flex-1"
                step="0.01"
              />
              <select
                value={formData.opening_balance_currency}
                onChange={(e) => setFormData({ ...formData, opening_balance_currency: e.target.value })}
                className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[90px]"
              >
                {(currencies.length ? currencies : [{ code: 'USD' }, { code: 'SYP' }, { code: 'AED' }] as any[]).map((c: any) => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500 mt-1">الرصيد الافتتاحي لهذا المكتب قبل بدء التشغيل</p>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">ملاحظات</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdate} loading={saving}>
              حفظ التغييرات
            </Button>
          </div>
        </div>
      </Modal>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { 
            background: white !important; 
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>

      {/* Print Preview Modal - MUST be outside style tag */}
      <Modal open={printPreviewOpen} onClose={() => setPrintPreviewOpen(false)} title="تحضير طباعة كشف الحساب" width="max-w-3xl">
        <div className="space-y-4">
          <p className="text-xs text-slate-400">أزل علامة ✓ من البنود التي لا تريد إظهارها بالطباعة. سيتم إعادة حساب الرصيد تلقائياً.</p>

          {printPreviewLoading ? (
            <div className="text-center py-8 text-slate-400">جاري التحميل...</div>
          ) : (
            <>
              {/* Opening balance toggle */}
              {printHasOpening && (
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!printHideOpening}
                    onChange={(e) => setPrintHideOpening(!e.target.checked)}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span className="text-sm font-bold text-yellow-300">رصيد افتتاحي</span>
                  <span className="text-xs text-slate-400 mr-auto">إلغاء التحديد = إخفاء من الطباعة</span>
                </div>
              )}

              {/* Entries list */}
              <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-700/50">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900/60 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-right w-10">
                        <input
                          type="checkbox"
                          checked={printExcluded.size === 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPrintExcluded(new Set());
                            } else {
                              setPrintExcluded(new Set(printEntries.map((_: any, i: number) => i)));
                            }
                          }}
                          className="w-4 h-4 accent-blue-500"
                        />
                      </th>
                      <th className="px-3 py-2 text-right text-slate-400 text-xs">التاريخ</th>
                      <th className="px-3 py-2 text-right text-slate-400 text-xs">البيان</th>
                      <th className="px-3 py-2 text-right text-slate-400 text-xs">النوع</th>
                      <th className="px-3 py-2 text-right text-slate-400 text-xs">المبلغ USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printEntries.map((entry: any, i: number) => {
                      const isExcluded = printExcluded.has(i);
                      return (
                        <tr
                          key={i}
                          className={`border-t border-slate-800/40 transition ${isExcluded ? 'opacity-30 bg-slate-900/40' : 'hover:bg-slate-800/30'}`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={!isExcluded}
                              onChange={() => {
                                const next = new Set(printExcluded);
                                if (isExcluded) next.delete(i);
                                else next.add(i);
                                setPrintExcluded(next);
                              }}
                              className="w-4 h-4 accent-blue-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-slate-300 whitespace-nowrap text-xs">{entry.date}</td>
                          <td className="px-3 py-2 text-slate-200 text-xs">{entry.description}</td>
                          <td className="px-3 py-2">
                            <Badge tone={entry.ledger === 'بيع' ? 'blue' : 'amber'} className="text-[10px]">
                              {entry.ledger}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-slate-300 text-xs font-mono whitespace-nowrap">
                            {entry.amount_usd?.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {printExcluded.size > 0 && (
                <div className="text-xs text-amber-400">
                  سيتم إخفاء {printExcluded.size} بند من أصل {printEntries.length}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                <Button variant="secondary" onClick={() => setPrintPreviewOpen(false)}>إلغاء</Button>
                <Button onClick={executePrint} loading={exporting === 'excel'}>
                  <Printer size={16} />
                  طباعة
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
