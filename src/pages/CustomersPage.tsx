import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../state/auth';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { Users, RefreshCw, Search, Phone, Eye, Plus } from 'lucide-react';

type CustomerRow = {
  id: number;
  type: 'customer';
  name: string;
  phone?: string | null;
  phone2?: string | null;
  status?: 'active' | 'inactive' | string;
};

export function CustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // إضافة عميل متاحة لجميع المستخدمين المسجلين
  const canManage = !!user;

  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    phone2: '',
    opening_balance: '',
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/meta/parties?type=customer');
      const list: CustomerRow[] = (res.data.data || [])
        .map((r: any) => ({
          id: Number(r.id),
          type: 'customer',
          name: String(r.name || ''),
          phone: r.phone || null,
          phone2: r.phone2 || null,
          status: r.status || 'active',
        }))
        .sort((a: CustomerRow, b: CustomerRow) => (a.name || '').localeCompare(b.name || '', 'ar'));
      setRows(list);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل العملاء');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      return (
        (r.name || '').toLowerCase().includes(term) ||
        (r.phone || '').toLowerCase().includes(term) ||
        (r.phone2 || '').toLowerCase().includes(term)
      );
    });
  }, [rows, q]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => String(r.status || '') === 'active').length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [rows]);

  const openCreateModal = () => {
    setFormData({ name: '', phone: '', phone2: '', opening_balance: '' });
    setFormError(null);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setFormError('اسم العميل مطلوب');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: any = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        phone2: formData.phone2.trim() || null,
      };
      if (formData.opening_balance !== '') {
        payload.opening_balance = Number(formData.opening_balance);
        payload.opening_balance_currency = 'USD';
      }
      await api.post('/meta/customers', payload);
      setCreateOpen(false);
      load();
    } catch (e: any) {
      setFormError(e?.response?.data?.error || 'فشل إنشاء العميل');
    } finally {
      setSaving(false);
    }
  };

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
          <p className="mt-1 text-sm text-slate-400">كشف حساب العملاء مرتبط بالتذاكر الخارجية والتحصيلات</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            تحديث
          </Button>
          {canManage && (
            <Button onClick={openCreateModal}>
              <Plus size={16} />
              إضافة عميل
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-slate-400">إجمالي العملاء</div>
          <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-400">نشط</div>
          <div className="text-2xl font-black text-green-400 mt-1">{stats.active}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-400">غير نشط</div>
          <div className="text-2xl font-black text-slate-400 mt-1">{stats.inactive}</div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              className="pr-9"
            />
          </div>
          <Badge tone="cyan" variant="subtle">
            {filtered.length} نتيجة
          </Badge>
        </div>
      </Card>

      {/* List */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <div className="font-bold text-white">قائمة العملاء</div>
          <div className="text-xs text-slate-400">اضغط على العميل لفتح كشف الحساب</div>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-400">{error}</div>
        )}

        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400">لا توجد بيانات</div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/customers/${c.id}`)}
                className="w-full text-right p-4 hover:bg-slate-800/30 transition flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">{c.name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1" dir="ltr">
                      <Phone size={12} />
                      {c.phone || '—'}
                      {c.phone2 && <span className="text-slate-500">/ {c.phone2}</span>}
                    </span>
                    {String(c.status || '') !== 'active' && (
                      <Badge tone="gray" size="sm" variant="subtle">غير نشط</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Eye size={16} />
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Create Customer Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="إضافة عميل جديد"
        width="max-w-md"
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">
              {formError}
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 mb-1 block">الاسم *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="اسم العميل"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">هاتف 1</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+963..."
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">هاتف 2</label>
              <Input
                value={formData.phone2}
                onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                placeholder="+963..."
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">الذمة المالية الابتدائية (USD)</label>
            <Input
              type="number"
              value={formData.opening_balance}
              onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              placeholder="0"
              dir="ltr"
            />
            <p className="text-xs text-slate-500 mt-1">
              موجب = عليه لنا &nbsp;|&nbsp; سالب = له علينا &nbsp;|&nbsp; فارغ = لا يوجد رصيد افتتاحي
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              <Plus size={16} />
              إضافة
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
