import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Phone,
  RefreshCw,
  Search,
  Plus,
  HandMetal,
  MessageCircle,
  CheckCircle2,
  Clock,
  Eye,
  ArrowUpRight,
  UserPlus,
  TrendingUp,
} from 'lucide-react';

import { api } from '../utils/api';
import {
  leadStatusTone,
  leadStatusLabel,
  leadServiceLabel,
  timeAgo,
} from '../utils/format';

import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth, hasAnyRole } from '../state/auth';

type CustomerRow = {
  id: number;
  name: string;
  phone?: string | null;
  phone2?: string | null;
  status?: 'active' | 'inactive' | string;
};

type LeadRow = any;

function normalizePhone(p?: string | null) {
  if (!p) return '';
  return String(p).replace(/[^0-9]/g, '');
}

function serviceColor(s: string) {
  switch (s) {
    case 'visa':
      return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    case 'passport':
      return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    case 'ticket':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'external_ticket':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    default:
      return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  }
}

// ─────────────────────────────────────────────────────────
// Register Visit Modal (Create Lead)
// ─────────────────────────────────────────────────────────
function RegisterVisitModal({
  open,
  onClose,
  onCreated,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (leadId: number) => void;
  initial?: { name?: string; phone?: string | null; phone2?: string | null };
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [service, setService] = useState('visa');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name || '');
    setPhone(initial?.phone || '');
    setPhone2(initial?.phone2 || '');
    setService('visa');
    setNotes('');
    setError(null);
  }, [open, initial?.name, initial?.phone, initial?.phone2]);

  async function handleSubmit() {
    if (!name.trim()) return setError('اسم العميل مطلوب');
    setSaving(true);
    setError(null);
    try {
      const res = await api.post('/leads', {
        customer_name: name.trim(),
        customer_phone: phone.trim() || null,
        customer_phone2: phone2.trim() || null,
        service_interest: service,
        notes: notes.trim() || null,
      });
      const id = Number(res.data?.data?.id);
      onCreated(id);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تسجيل الزيارة');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="تسجيل زيارة عميل" width="max-w-lg">
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-3">
          <h4 className="text-xs font-bold text-amber-400">بيانات العميل</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">اسم العميل *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">رقم الهاتف 1</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="05..." />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">رقم الهاتف 2</label>
              <Input value={phone2} onChange={(e) => setPhone2(e.target.value)} dir="ltr" placeholder="05..." />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">الخدمة المهتم بها *</label>
            <Select value={service} onChange={(e) => setService(e.target.value)}>
              <option value="visa">فيزا</option>
              <option value="passport">جوازات</option>
              <option value="ticket">تذاكر طيران</option>
              <option value="external_ticket">تذاكر خارجية</option>
              <option value="other">أخرى</option>
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">ملاحظة سريعة</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none text-sm"
              placeholder="مثال: يسأل عن فيزا شنغن..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            <UserPlus size={16} />
            تسجيل
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function CustomersHubPage({ defaultTab }: { defaultTab?: 'followup' | 'customers' }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const isAdmin = hasAnyRole(user, 'admin', 'accounting');
  const canSeeLedger = hasAnyRole(user, 'admin', 'accounting');

  // Backward-compat:
  // Older builds used ?tab=open|mine|active|done|all for the Leads page.
  // In the Hub we use: ?tab=followup|customers and ?leadTab=...
  const rawTab = (searchParams.get('tab') || '').toLowerCase();
  const legacyLeadTabs = new Set(['open', 'mine', 'active', 'done', 'all']);
  const legacyLeadTab = legacyLeadTabs.has(rawTab) ? rawTab : null;
  const requestedNewVisit = searchParams.get('new') === '1';

  // Main tabs
  const urlTab = legacyLeadTab ? '' : rawTab;
  const initialTab: 'followup' | 'customers' =
    requestedNewVisit
      ? 'followup'
      : urlTab === 'followup' || urlTab === 'customers'
        ? (urlTab as any)
        : defaultTab
          ? defaultTab
          : canSeeLedger
            ? 'customers'
            : 'followup';

  const [tab, setTab] = useState<'followup' | 'customers'>(initialTab);

  // Keep URL in sync
  useEffect(() => {
    const current = (searchParams.get('tab') || '').toLowerCase();
    if (current !== tab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', tab);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Shared search
  const [q, setQ] = useState('');

  // ─── Leads state ───
  const [leadTab, setLeadTab] = useState(searchParams.get('leadTab') || legacyLeadTab || 'open');
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsRows, setLeadsRows] = useState<LeadRow[]>([]);
  const [leadsStats, setLeadsStats] = useState<any>({});
  const [claimingId, setClaimingId] = useState<number | null>(null);

  // ─── Customers state ───
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [custFilter, setCustFilter] = useState<'all' | 'with_follow' | 'no_follow'>('all');

  // Lead index (for matching customers ↔ leads)
  const [leadIndex, setLeadIndex] = useState<LeadRow[]>([]);

  // Create lead modal
  const [createOpen, setCreateOpen] = useState(() => requestedNewVisit);
  const [createInitial, setCreateInitial] = useState<{ name?: string; phone?: string | null } | undefined>(undefined);

  // Create customer modal
  const [createCustOpen, setCreateCustOpen] = useState(false);
  const [createCustSaving, setCreateCustSaving] = useState(false);
  const [createCustError, setCreateCustError] = useState<string | null>(null);
  const [createCustData, setCreateCustData] = useState({ name: '', phone: '', phone2: '', opening_balance: '' });

  const handleCreateCustomer = async () => {
    if (!createCustData.name.trim()) { setCreateCustError('اسم العميل مطلوب'); return; }
    setCreateCustSaving(true);
    setCreateCustError(null);
    try {
      const payload: any = {
        name: createCustData.name.trim(),
        phone: createCustData.phone.trim() || null,
        phone2: createCustData.phone2.trim() || null,
      };
      if (createCustData.opening_balance !== '') {
        payload.opening_balance = Number(createCustData.opening_balance);
        payload.opening_balance_currency = 'USD';
      }
      await api.post('/meta/customers', payload);
      setCreateCustOpen(false);
      loadCustomers();
    } catch (e: any) {
      setCreateCustError(e?.response?.data?.error || 'فشل إنشاء العميل');
    } finally {
      setCreateCustSaving(false);
    }
  };

  async function loadLeads() {
    setLeadsLoading(true);
    try {
      const params: any = {};
      if (leadTab === 'open') params.status = 'open';
      else if (leadTab === 'mine') params.mine = '1';
      else if (leadTab === 'active') params.status = 'active';
      else if (leadTab === 'done') params.status = 'done';
      // 'all' = no filter

      const res = await api.get('/leads', { params });
      setLeadsRows(res.data?.data?.rows || []);
      setLeadsStats(res.data?.data?.stats || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLeadsLoading(false);
    }
  }

  async function loadLeadIndex() {
    try {
      const [openRes, activeRes] = await Promise.all([
        api.get('/leads', { params: { status: 'open' } }),
        api.get('/leads', { params: { status: 'active' } }),
      ]);
      const all = [...(openRes.data?.data?.rows || []), ...(activeRes.data?.data?.rows || [])];
      const uniq = Array.from(new Map(all.map((r: any) => [r.id, r])).values());
      setLeadIndex(uniq);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadCustomers() {
    setCustomersLoading(true);
    try {
      const res = await api.get('/meta/parties', { params: { type: 'customer' } });
      const list: CustomerRow[] = (res.data?.data || [])
        .map((r: any) => ({
          id: Number(r.id),
          name: String(r.name || ''),
          phone: r.phone || null,
          phone2: r.phone2 || null,
          status: r.status || 'active',
        }))
        .sort((a: CustomerRow, b: CustomerRow) => (a.name || '').localeCompare(b.name || '', 'ar'));
      setCustomers(list);
    } catch (e) {
      console.error(e);
    } finally {
      setCustomersLoading(false);
    }
  }

  async function refreshAll() {
    await Promise.all([loadLeads(), loadLeadIndex(), loadCustomers()]);
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadTab]);

  // keep leadTab in URL (nice when navigating back)
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set('leadTab', leadTab);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadTab]);

  const customerByPhone = useMemo(() => {
    const m = new Map<string, CustomerRow>();
    for (const c of customers) {
      const k = normalizePhone(c.phone);
      if (!k) continue;
      if (!m.has(k)) m.set(k, c);
    }
    return m;
  }, [customers]);

  const leadByPhone = useMemo(() => {
    const m = new Map<string, LeadRow>();
    for (const l of leadIndex) {
      const k = normalizePhone(l.customer_phone);
      if (!k) continue;
      const prev = m.get(k);
      const prevAt = prev?.updated_at || prev?.created_at || '';
      const curAt = l?.updated_at || l?.created_at || '';
      if (!prev || String(curAt) > String(prevAt)) m.set(k, l);
    }
    return m;
  }, [leadIndex]);

  const leadsFiltered = useMemo(() => {
    if (!q.trim()) return leadsRows;
    const term = q.toLowerCase();
    return leadsRows.filter((r: any) =>
      r.customer_name?.toLowerCase().includes(term) ||
      r.customer_phone?.toLowerCase().includes(term) ||
      r.claimed_by_name?.toLowerCase().includes(term)
    );
  }, [leadsRows, q]);

  const customersFiltered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = customers;
    if (custFilter !== 'all') {
      list = list.filter((c) => {
        const has = !!leadByPhone.get(normalizePhone(c.phone));
        return custFilter === 'with_follow' ? has : !has;
      });
    }
    if (!term) return list;
    return list.filter((c) =>
      (c.name || '').toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term)
    );
  }, [customers, q, custFilter, leadByPhone]);

  const customersStats = useMemo(() => {
    const total = customers.length;
    const withFollow = customers.filter((c) => !!leadByPhone.get(normalizePhone(c.phone))).length;
    return { total, withFollow, noFollow: total - withFollow };
  }, [customers, leadByPhone]);

  async function handleClaim(id: number) {
    setClaimingId(id);
    try {
      await api.patch(`/leads/${id}/claim`);
      await Promise.all([loadLeads(), loadLeadIndex()]);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'فشل استلام العميل');
    } finally {
      setClaimingId(null);
    }
  }

  const followTabs = useMemo(() => {
    return [
      { key: 'open', label: 'بانتظار المتابعة', count: leadsStats.open, icon: Clock, tone: 'amber' },
      { key: 'mine', label: 'عملائي', count: null, icon: HandMetal, tone: 'blue' },
      {
        key: 'active',
        label: 'قيد المتابعة',
        count: (leadsStats.claimed || 0) + (leadsStats.contacted || 0) + (leadsStats.interested || 0),
        icon: MessageCircle,
        tone: 'purple',
      },
      {
        key: 'done',
        label: 'مكتملة',
        count: (leadsStats.converted || 0) + (leadsStats.not_interested || 0) + (leadsStats.closed || 0),
        icon: CheckCircle2,
        tone: 'green',
      },
      ...(isAdmin ? [{ key: 'all', label: 'الكل', count: leadsStats.total, icon: Eye, tone: 'slate' }] : []),
    ];
  }, [isAdmin, leadsStats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            العملاء
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            دمج ذكي بين دليل العملاء وكشف الحساب و"متابعة العملاء" في صفحة واحدة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={refreshAll}>
            <RefreshCw size={16} />
            تحديث
          </Button>
          {tab === 'followup' && isAdmin && (
            <Button variant="secondary" size="sm" onClick={() => navigate('/leads/reports')}>
              <TrendingUp size={16} />
              التقارير
            </Button>
          )}
          {tab === 'customers' && (
            <Button
              variant="secondary"
              onClick={() => {
                setCreateCustData({ name: '', phone: '', phone2: '', opening_balance: '' });
                setCreateCustError(null);
                setCreateCustOpen(true);
              }}
            >
              <Plus size={16} />
              إضافة عميل
            </Button>
          )}
          <Button
            onClick={() => {
              setCreateInitial(undefined);
              setCreateOpen(true);
            }}
          >
            <Plus size={16} />
            تسجيل زيارة
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition flex items-center gap-2 ${
            tab === 'followup'
              ? 'bg-green-500/20 border-green-500/30 text-white'
              : 'border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-white'
          }`}
          onClick={() => setTab('followup')}
        >
          <Phone size={14} />
          متابعة العملاء
          <span className="bg-slate-700 text-xs px-1.5 py-0.5 rounded-full">{leadsStats.open || 0}</span>
        </button>

        <button
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition flex items-center gap-2 ${
            tab === 'customers'
              ? 'bg-cyan-500/20 border-cyan-500/30 text-white'
              : 'border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-white'
          }`}
          onClick={() => setTab('customers')}
        >
          <Users size={14} />
          العملاء
          <span className="bg-slate-700 text-xs px-1.5 py-0.5 rounded-full">{customers.length}</span>
          {!canSeeLedger && (
            <Badge tone="gray" variant="subtle" size="sm">
              كشف الحساب للمحاسبة فقط
            </Badge>
          )}
        </button>
      </div>

      {/* Global Search */}
      <Card className="p-4">
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder={tab === 'followup' ? 'بحث بالاسم أو رقم الهاتف أو الموظف...' : 'بحث باسم العميل أو رقم الهاتف...'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pr-10"
          />
        </div>
        {tab === 'customers' && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {([
              { key: 'all', label: 'الكل' },
              { key: 'with_follow', label: 'لديهم متابعة' },
              { key: 'no_follow', label: 'بدون متابعة' },
            ] as const).map((t) => (
              <button
                key={t.key}
                className={`px-3 py-1.5 rounded-xl text-xs border transition ${
                  custFilter === t.key
                    ? 'bg-slate-700/50 border-slate-600 text-white'
                    : 'border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-white'
                }`}
                onClick={() => setCustFilter(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Follow-up Tab */}
      {tab === 'followup' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Card className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">بانتظار</span>
                <Clock size={14} className="text-amber-400" />
              </div>
              <p className="text-xl font-black text-amber-400">{leadsStats.open || 0}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">قيد المتابعة</span>
                <MessageCircle size={14} className="text-blue-400" />
              </div>
              <p className="text-xl font-black text-blue-400">{(leadsStats.claimed || 0) + (leadsStats.contacted || 0)}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">مهتمين</span>
                <Users size={14} className="text-green-400" />
              </div>
              <p className="text-xl font-black text-green-400">{leadsStats.interested || 0}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">تم التحويل</span>
                <CheckCircle2 size={14} className="text-emerald-400" />
              </div>
              <p className="text-xl font-black text-emerald-400">{leadsStats.converted || 0}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">الإجمالي</span>
                <Phone size={14} className="text-slate-400" />
              </div>
              <p className="text-xl font-black text-white">{leadsStats.total || 0}</p>
            </Card>
          </div>

          {/* Follow-up sub tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {followTabs.map((t) => {
              const Icon = t.icon;
              const active = leadTab === t.key;
              return (
                <button
                  key={t.key}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition flex items-center gap-2 ${
                    active
                      ? 'bg-slate-700/40 border-slate-600 text-white'
                      : 'border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-white'
                  }`}
                  onClick={() => setLeadTab(t.key)}
                >
                  <Icon size={14} />
                  {t.label}
                  {t.count != null && t.count > 0 && (
                    <span className="bg-slate-700 text-xs px-1.5 py-0.5 rounded-full">{t.count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Leads List */}
          <div className="space-y-3">
            {leadsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="h-16 bg-slate-800 rounded-xl animate-pulse" />
                </Card>
              ))
            ) : leadsFiltered.length === 0 ? (
              <Card className="p-12 text-center">
                <Phone size={48} className="mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400">لا توجد نتائج</p>
              </Card>
            ) : (
              leadsFiltered.map((lead: any) => {
                const matchedCustomer = customerByPhone.get(normalizePhone(lead.customer_phone));
                return (
                  <Card
                    key={lead.id}
                    className={`p-4 hover:bg-slate-800/30 transition cursor-pointer ${
                      lead.status === 'open' ? 'border-r-4 border-r-amber-500' : ''
                    }`}
                    onClick={() => {
                      if (lead.status === 'open') return; // use claim
                      navigate(`/leads/${lead.id}`);
                    }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black border ${serviceColor(
                            lead.service_interest
                          )}`}
                        >
                          {lead.customer_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">{lead.customer_name}</span>
                            <Badge tone={leadStatusTone(lead.status) as any}>{leadStatusLabel(lead.status)}</Badge>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${serviceColor(lead.service_interest)}`}>
                              {leadServiceLabel(lead.service_interest)}
                            </span>
                            {matchedCustomer && (
                              <span className="text-xs px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                                عميل مسجّل
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                            {lead.customer_phone && <span dir="ltr">{lead.customer_phone}</span>}
                            <span>{timeAgo(lead.created_at)}</span>
                            <span>سجّله: {lead.created_by_name}</span>
                            {lead.claimed_by_name && <span className="text-blue-400">يتابعه: {lead.claimed_by_name}</span>}
                            {lead.follow_up_count > 0 && <span className="text-purple-400">{lead.follow_up_count} متابعة</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {matchedCustomer && canSeeLedger && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/customers/${matchedCustomer.id}`)}
                          >
                            <Eye size={14} />
                            كشف الحساب
                          </Button>
                        )}

                        {lead.status === 'open' ? (
                          <Button
                            size="sm"
                            onClick={() => handleClaim(lead.id)}
                            loading={claimingId === lead.id}
                            className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                          >
                            <HandMetal size={14} />
                            استلام متابعة
                          </Button>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={() => navigate(`/leads/${lead.id}`)}>
                            <ArrowUpRight size={14} />
                            التفاصيل
                          </Button>
                        )}

                        {lead.customer_phone && (
                          <a
                            href={`https://wa.me/${normalizePhone(lead.customer_phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition"
                            title="واتساب"
                          >
                            <MessageCircle size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Customers Tab */}
      {tab === 'customers' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-xs text-slate-400">إجمالي العملاء</div>
              <div className="text-2xl font-black text-white mt-1">{customersStats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-400">لديهم متابعة حالية</div>
              <div className="text-2xl font-black text-green-400 mt-1">{customersStats.withFollow}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-400">بدون متابعة</div>
              <div className="text-2xl font-black text-slate-300 mt-1">{customersStats.noFollow}</div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-white">دليل العملاء</div>
                <div className="text-xs text-slate-400">
                  {canSeeLedger ? 'اضغط لفتح كشف الحساب' : 'يمكنك إنشاء متابعة من هنا — كشف الحساب للمحاسبة فقط'}
                </div>
              </div>
              <Badge tone="cyan" variant="subtle">
                {customersFiltered.length} نتيجة
              </Badge>
            </div>

            {customersLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : customersFiltered.length === 0 ? (
              <div className="p-10 text-center text-slate-400">لا توجد بيانات</div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {customersFiltered.map((c) => {
                  const matchingLead = leadByPhone.get(normalizePhone(c.phone));
                  return (
                    <div
                      key={c.id}
                      className="w-full text-right p-4 hover:bg-slate-800/30 transition flex items-center justify-between gap-3"
                    >
                      <button
                        className="min-w-0 flex-1 text-right"
                        onClick={() => {
                          if (canSeeLedger) return navigate(`/customers/${c.id}`);
                          if (matchingLead) return navigate(`/leads/${matchingLead.id}`);
                        }}
                      >
                        <div className="font-bold text-white truncate">{c.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1" dir="ltr">
                            <Phone size={12} />
                            {c.phone || '—'}
                          </span>
                          {String(c.status || '') !== 'active' && (
                            <Badge tone="gray" size="sm" variant="subtle">
                              غير نشط
                            </Badge>
                          )}
                          {matchingLead && (
                            <Badge tone={leadStatusTone(matchingLead.status) as any} size="sm" variant="subtle">
                              متابعة: {leadStatusLabel(matchingLead.status)}
                            </Badge>
                          )}
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setCreateInitial({ name: c.name, phone: c.phone || null });
                            setCreateOpen(true);
                          }}
                          title="إنشاء متابعة"
                        >
                          <UserPlus size={14} />
                          متابعة
                        </Button>

                        {matchingLead && (
                          <Button variant="secondary" size="sm" onClick={() => navigate(`/leads/${matchingLead.id}`)}>
                            <ArrowUpRight size={14} />
                            المتابعة
                          </Button>
                        )}

                        {canSeeLedger && (
                          <Button variant="secondary" size="sm" onClick={() => navigate(`/customers/${c.id}`)}>
                            <Eye size={14} />
                            كشف
                          </Button>
                        )}

                        {c.phone && (
                          <a
                            href={`https://wa.me/${normalizePhone(c.phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition"
                            title="واتساب"
                          >
                            <MessageCircle size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      <RegisterVisitModal
        open={createOpen}
        initial={createInitial}
        onClose={() => {
          setCreateOpen(false);
          setCreateInitial(undefined);
        }}
        onCreated={async (leadId) => {
          setCreateOpen(false);
          setCreateInitial(undefined);
          setTab('followup');
          setLeadTab('open');
          await Promise.all([loadLeads(), loadLeadIndex()]);
          if (leadId) {
            // Open details right away for convenience (unless it's open and needs claim)
            navigate(`/leads/${leadId}`);
          }
        }}
      />

      {/* Create Customer Modal */}
      <Modal
        open={createCustOpen}
        onClose={() => setCreateCustOpen(false)}
        title="إضافة عميل جديد"
        width="max-w-md"
      >
        <div className="space-y-4">
          {createCustError && (
            <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">
              {createCustError}
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 mb-1 block">الاسم *</label>
            <Input
              value={createCustData.name}
              onChange={(e) => setCreateCustData({ ...createCustData, name: e.target.value })}
              placeholder="اسم العميل"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">هاتف 1</label>
              <Input
                value={createCustData.phone}
                onChange={(e) => setCreateCustData({ ...createCustData, phone: e.target.value })}
                placeholder="+963..."
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">هاتف 2</label>
              <Input
                value={createCustData.phone2}
                onChange={(e) => setCreateCustData({ ...createCustData, phone2: e.target.value })}
                placeholder="+963..."
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">الذمة المالية الابتدائية (USD)</label>
            <Input
              type="number"
              value={createCustData.opening_balance}
              onChange={(e) => setCreateCustData({ ...createCustData, opening_balance: e.target.value })}
              placeholder="0"
              dir="ltr"
            />
            <p className="text-xs text-slate-500 mt-1">
              موجب = عليه لنا &nbsp;|&nbsp; سالب = له علينا &nbsp;|&nbsp; فارغ = لا يوجد رصيد
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
            <Button variant="secondary" onClick={() => setCreateCustOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreateCustomer} loading={createCustSaving}>
              <Plus size={16} />
              إضافة
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
