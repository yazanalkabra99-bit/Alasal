import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth, hasAnyRole } from '../state/auth';
import type { Party } from '../utils/types';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { 
  Building2, Phone, Mail, MapPin, Plus, Search, 
  ArrowUpDown, TrendingUp, TrendingDown, RefreshCw,
  Edit, Eye, Filter
} from 'lucide-react';

type OfficeRow = Party & {
  can_sell_to_office?: boolean;
  can_buy_from_office?: boolean;
  email?: string;
  address?: string;
  notes?: string;
  total_sales?: number;
  total_visa_sourced?: number;
  total_passport_sourced?: number;
};

type FilterType = 'all' | 'sell' | 'buy' | 'both' | 'inactive';

export function OfficesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const canManage = hasAnyRole(user, 'admin', 'visa_admin', 'visa_admin_2', 'passport_admin', 'airline_admin', 'accounting', 'employee');
  const canSeeFinancial = hasAnyRole(user, 'accounting', 'admin');

  const [rows, setRows] = useState<OfficeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<OfficeRow | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    type: 'office',
    opening_balance: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/meta/offices');
      const list: OfficeRow[] = (res.data.data || [])
        .map((r: any) => ({
          ...r,
          can_sell_to_office: !!r.can_sell_to_office,
          can_buy_from_office: !!r.can_buy_from_office,
        }))
        .sort((a: OfficeRow, b: OfficeRow) => (a.name || '').localeCompare(b.name || '', 'ar'));
      setRows(list);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'تعذر تحميل المكاتب');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const sellOnly = rows.filter(p => p.can_sell_to_office && !p.can_buy_from_office).length;
    const buyOnly = rows.filter(p => !p.can_sell_to_office && p.can_buy_from_office).length;
    const both = rows.filter(p => p.can_sell_to_office && p.can_buy_from_office).length;
    const active = rows.filter(p => p.status === 'active').length;
    return { total, sellOnly, buyOnly, both, active };
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((p) => {
      const sell = !!p.can_sell_to_office;
      const buy = !!p.can_buy_from_office;

      if (filter === 'sell' && !sell) return false;
      if (filter === 'buy' && !buy) return false;
      if (filter === 'both' && !(sell && buy)) return false;
      if (filter === 'inactive' && p.status !== 'inactive') return false;

      if (!term) return true;
      return (
        (p.name || '').toLowerCase().includes(term) || 
        (p.phone || '').toLowerCase().includes(term) ||
        (p.email || '').toLowerCase().includes(term)
      );
    });
  }, [rows, q, filter]);

  const openCreateModal = () => {
    setFormData({ name: '', phone: '', email: '', address: '', notes: '', type: 'office', opening_balance: '' });
    setFormError(null);
    setCreateModalOpen(true);
  };

  const openEditModal = (office: OfficeRow) => {
    setSelectedOffice(office);
    setFormData({
      name: office.name || '',
      phone: office.phone || '',
      email: office.email || '',
      address: office.address || '',
      notes: office.notes || '',
      type: office.type || 'office',
      opening_balance: '',
    });
    setFormError(null);
    setEditModalOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setFormError('اسم المكتب مطلوب');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: any = { ...formData };
      if (formData.opening_balance !== '') {
        payload.opening_balance = Number(formData.opening_balance);
        payload.opening_balance_currency = 'USD';
      } else {
        delete payload.opening_balance;
      }
      await api.post('/meta/offices', payload);
      setCreateModalOpen(false);
      load();
    } catch (e: any) {
      setFormError(e?.response?.data?.error || 'فشل إنشاء المكتب');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      setFormError('اسم المكتب مطلوب');
      return;
    }
    if (!selectedOffice) return;
    setSaving(true);
    setFormError(null);
    try {
      await api.patch(`/meta/offices/${selectedOffice.id}`, formData);
      setEditModalOpen(false);
      load();
    } catch (e: any) {
      setFormError(e?.response?.data?.error || 'فشل تحديث المكتب');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (office: OfficeRow) => {
    try {
      await api.patch(`/meta/offices/${office.id}`, {
        status: office.status === 'active' ? 'inactive' : 'active'
      });
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل تغيير الحالة');
    }
  };

  const filterButtons: { key: FilterType; label: string; icon: any; color: string }[] = [
    { key: 'all', label: 'الكل', icon: Building2, color: 'blue' },
    { key: 'sell', label: 'نبيع له', icon: TrendingUp, color: 'green' },
    { key: 'buy', label: 'نشتري منه', icon: TrendingDown, color: 'amber' },
    { key: 'both', label: 'الطرفين', icon: ArrowUpDown, color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            إدارة المكاتب
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            المكتب الواحد يمكن أن يكون <span className="text-green-400 font-bold">عميل</span> نبيع له و<span className="text-amber-400 font-bold">مصدر</span> نشتري منه
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            تحديث
          </Button>
          {canManage && (
            <Button onClick={openCreateModal}>
              <Plus size={16} />
              مكتب جديد
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">إجمالي المكاتب</p>
              <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">نبيع لهم</p>
              <p className="text-2xl font-black text-white mt-1">{stats.sellOnly + stats.both}</p>
            </div>
            <div className="p-3 rounded-xl bg-green-500/10">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">نشتري منهم</p>
              <p className="text-2xl font-black text-white mt-1">{stats.buyOnly + stats.both}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10">
              <TrendingDown className="w-6 h-6 text-amber-400" />
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">بيع + شراء</p>
              <p className="text-2xl font-black text-white mt-1">{stats.both}</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10">
              <ArrowUpDown className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-800/60 bg-red-950/30 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Filters & Search */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث بالاسم أو الهاتف أو البريد..."
              className="pr-10"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-slate-400" />
            {filterButtons.map((btn) => {
              const isActive = filter === btn.key;
              const colorClasses = {
                blue: isActive ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : '',
                green: isActive ? 'bg-green-500/20 border-green-500/40 text-green-300' : '',
                amber: isActive ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : '',
                purple: isActive ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : '',
              };
              return (
                <button
                  key={btn.key}
                  onClick={() => setFilter(btn.key)}
                  className={`
                    flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border
                    ${isActive 
                      ? colorClasses[btn.color as keyof typeof colorClasses]
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                    }
                  `}
                >
                  <btn.icon size={14} />
                  {btn.label}
                </button>
              );
            })}
          </div>

          {/* Results Count */}
          <div className="text-sm text-slate-400 lg:mr-auto">
            <span className="font-bold text-white">{filtered.length}</span> مكتب
          </div>
        </div>
      </Card>

      {/* Offices Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">لا توجد مكاتب</h3>
          <p className="text-sm text-slate-400">
            {q ? 'جرب البحث بكلمات مختلفة' : 'ابدأ بإضافة مكتب جديد'}
          </p>
          {canManage && !q && (
            <Button className="mt-4" onClick={openCreateModal}>
              <Plus size={16} />
              إضافة مكتب
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((office) => {
            const sell = !!office.can_sell_to_office;
            const buy = !!office.can_buy_from_office;
            const isInactive = office.status === 'inactive';
            
            return (
              <Card 
                key={office.id} 
                className={`group relative overflow-hidden transition-all hover:border-slate-600 ${isInactive ? 'opacity-60' : ''}`}
              >
                {/* Status indicator */}
                <div className={`absolute top-0 left-0 w-full h-1 ${
                  sell && buy ? 'bg-gradient-to-r from-green-500 via-purple-500 to-amber-500' :
                  sell ? 'bg-gradient-to-r from-green-500 to-green-600' :
                  buy ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                  'bg-gradient-to-r from-slate-500 to-slate-600'
                }`} />

                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black
                        ${sell && buy ? 'bg-gradient-to-br from-green-500/20 to-amber-500/20 text-purple-400' :
                          sell ? 'bg-green-500/10 text-green-400' :
                          buy ? 'bg-amber-500/10 text-amber-400' :
                          'bg-slate-700/50 text-slate-400'
                        }
                      `}>
                        {office.name?.charAt(0) || '؟'}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">{office.name}</h3>
                        <p className="text-xs text-slate-500">#{office.id}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      {sell && <Badge tone="green" className="text-[10px]">نبيع له</Badge>}
                      {buy && <Badge tone="amber" className="text-[10px]">نشتري منه</Badge>}
                      {!sell && !buy && <Badge tone="gray" className="text-[10px]">جديد</Badge>}
                      {isInactive && <Badge tone="red" className="text-[10px]">معطّل</Badge>}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 space-y-2">
                    {office.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Phone size={14} className="text-slate-500" />
                        <span dir="ltr">{office.phone}</span>
                      </div>
                    )}
                    {office.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Mail size={14} className="text-slate-500" />
                        <span className="truncate">{office.email}</span>
                      </div>
                    )}
                    {office.address && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <MapPin size={14} className="text-slate-500" />
                        <span className="truncate">{office.address}</span>
                      </div>
                    )}
                    {!office.phone && !office.email && !office.address && (
                      <div className="text-xs text-slate-500 italic">لا توجد معلومات اتصال</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/offices/${office.id}`)}
                    >
                      <Eye size={14} />
                      {canSeeFinancial ? 'كشف الحساب' : 'عرض'}
                    </Button>
                    
                    {canManage && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditModal(office)}
                      >
                        <Edit size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="إضافة مكتب جديد"
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
              placeholder="مثال: مكتب السفر الذهبي"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">رقم الهاتف</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+963..."
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">البريد الإلكتروني</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">العنوان</label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="المدينة، الشارع..."
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">ملاحظات</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="ملاحظات إضافية..."
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
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
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              <Plus size={16} />
              إضافة المكتب
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`تعديل: ${selectedOffice?.name || ''}`}
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

          <div>
            <label className="text-xs text-slate-400 mb-1 block">ملاحظات</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
          </div>

          {selectedOffice && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700">
              <div>
                <p className="text-sm text-slate-300">حالة المكتب</p>
                <p className="text-xs text-slate-500">
                  {selectedOffice.status === 'active' ? 'المكتب نشط حالياً' : 'المكتب معطّل'}
                </p>
              </div>
              <Button
                variant={selectedOffice.status === 'active' ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => {
                  toggleStatus(selectedOffice);
                  setEditModalOpen(false);
                }}
              >
                {selectedOffice.status === 'active' ? 'تعطيل' : 'تفعيل'}
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdate} loading={saving}>
              حفظ التغييرات
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
