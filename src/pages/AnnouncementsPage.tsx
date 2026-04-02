import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Megaphone, Settings, User, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth, roleLabels } from '../state/auth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import type { Role } from '../utils/types';

type Announcement = {
  id: number;
  title: string;
  content: string;
  priority: string;
  target_roles: string | null;
  created_by: number;
  created_by_name: string;
  is_active: number;
  expires_at: string | null;
  created_at: string;
  is_read?: number;
  read_count?: number;
  total_users?: number;
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-600',
  normal: 'bg-blue-600',
  high: 'bg-blue-600',
  urgent: 'bg-red-600',
};

const priorityLabels: Record<string, string> = {
  low: 'منخفض',
  normal: 'عادي',
  high: 'مهم',
  urgent: 'عاجل',
};

const availableRoles: { id: Role; name: string }[] = [
  { id: 'employee', name: 'موظف' },
  { id: 'visa_admin', name: 'مدير فيزا' },
  { id: 'passport_admin', name: 'مدير جوازات' },
  { id: 'airline_admin', name: 'مدير تذاكر' },
  { id: 'accounting', name: 'محاسبة' },
  { id: 'admin', name: 'مدير النظام' },
];

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'user' | 'manage'>('user');
  
  // Create form state
  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'normal',
    target_roles: [] as Role[],
    expires_at: '',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = hasRole('admin', 'visa_admin', 'passport_admin', 'airline_admin', 'accounting');

  useEffect(() => {
    fetchAnnouncements();
  }, [viewMode]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const endpoint = viewMode === 'manage' && canManage 
        ? '/notifications/announcements/manage'
        : '/notifications/announcements';
      const res = await api.get(endpoint);
      setAnnouncements(res.data.data || []);
    } catch (e) {
      console.error('Failed to fetch announcements:', e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/announcements/${id}/read`);
      setAnnouncements(prev => prev.map(a => 
        a.id === id ? { ...a, is_read: 1 } : a
      ));
    } catch (e) {
      console.error('Failed to mark as read:', e);
    }
  };

  const deleteAnnouncement = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا التعميم؟')) return;
    try {
      await api.delete(`/notifications/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error('Failed to delete announcement:', e);
    }
  };

  const createAnnouncement = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('العنوان والمحتوى مطلوبان');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await api.post('/notifications/announcements', {
        title: form.title.trim(),
        content: form.content.trim(),
        priority: form.priority,
        target_roles: form.target_roles.length > 0 ? form.target_roles : null,
        expires_at: form.expires_at || null,
      });
      setShowCreateModal(false);
      setForm({ title: '', content: '', priority: 'normal', target_roles: [], expires_at: '' });
      fetchAnnouncements();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'فشل إنشاء التعميم');
    } finally {
      setCreating(false);
    }
  };

  const toggleTargetRole = (role: Role) => {
    setForm(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role]
    }));
  };

  const getTargetRolesDisplay = (targetRoles: string | null) => {
    if (!targetRoles) return 'الجميع';
    try {
      const roles = JSON.parse(targetRoles) as Role[];
      if (roles.length === 0) return 'الجميع';
      return roles.map(r => roleLabels[r] || r).join(', ');
    } catch {
      return 'الجميع';
    }
  };

  const unreadCount = announcements.filter(a => a.is_read === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">التعميمات</h1>
          <p className="text-sm text-slate-400 mt-1">
            {unreadCount > 0 ? `لديك ${unreadCount} تعميم غير مقروء` : 'الإعلانات والتعميمات الرسمية'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/notifications')}>
            <Bell size={16} />
            الإشعارات
          </Button>
          {canManage && (
            <>
              <Button 
                variant={viewMode === 'manage' ? 'primary' : 'secondary'} 
                size="sm" 
                onClick={() => setViewMode(viewMode === 'manage' ? 'user' : 'manage')}
              >
                {viewMode === 'manage' ? (<><User size={16} /> عرض المستخدم</>) : (<><Settings size={16} /> الإدارة</>)}
              </Button>
              <Button size="sm" onClick={() => setShowCreateModal(true)}>
                + تعميم جديد
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="لا توجد تعميمات"
          description={canManage ? 'أنشئ تعميماً جديداً للموظفين' : 'لا توجد تعميمات حالياً'}
        />
      ) : (
        <div className="space-y-4">
          {announcements.map(announcement => (
            <Card
              key={announcement.id}
              className={`p-5 transition-all ${
                announcement.is_read === 0 ? 'bg-slate-800/60 border-blue-500/30' : 'bg-slate-900/50'
              } ${announcement.is_active === 0 ? 'opacity-50' : ''}`}
              onClick={() => viewMode === 'user' && announcement.is_read === 0 && markAsRead(announcement.id)}
            >
              <div className="flex items-start gap-4">
                {/* Priority indicator */}
                <div className={`w-1 self-stretch rounded-full ${priorityColors[announcement.priority]}`} />
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-semibold text-white text-lg">
                      {announcement.title}
                    </h3>
                    {announcement.is_read === 0 && viewMode === 'user' && (
                      <Badge className="bg-blue-600 text-white">جديد</Badge>
                    )}
                    <Badge className={`${priorityColors[announcement.priority]} text-white`}>
                      {priorityLabels[announcement.priority]}
                    </Badge>
                    {announcement.is_active === 0 && (
                      <Badge className="bg-red-600 text-white">محذوف</Badge>
                    )}
                  </div>
                  
                  <p className="text-slate-300 whitespace-pre-wrap mb-3">
                    {announcement.content}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <User size={14} />
                      {announcement.created_by_name}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarIcon size={14} />
                      {new Date(announcement.created_at).toLocaleDateString('en-GB')}
                    </span>
                    {viewMode === 'manage' && (
                      <>
                        <span>
                          {announcement.read_count || 0}/{announcement.total_users || 0} قرأوا
                        </span>
                        <span>
                          الفئة المستهدفة: {getTargetRolesDisplay(announcement.target_roles)}
                        </span>
                      </>
                    )}
                    {announcement.expires_at && (
                      <span className="text-amber-400">
                        ينتهي: {new Date(announcement.expires_at).toLocaleDateString('en-GB')}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                {viewMode === 'manage' && announcement.is_active === 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteAnnouncement(announcement.id); }}
                    className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="تعميم جديد"
        width="max-w-2xl"
      >
        <div className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          
          <div>
            <label className="text-xs text-slate-400 mb-1 block">العنوان *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="عنوان التعميم"
            />
          </div>
          
          <div>
            <label className="text-xs text-slate-400 mb-1 block">المحتوى *</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="محتوى التعميم..."
              rows={5}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">الأولوية</label>
              <Select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">منخفض</option>
                <option value="normal">عادي</option>
                <option value="high">مهم</option>
                <option value="urgent">عاجل</option>
              </Select>
            </div>
            
            <div>
              <label className="text-xs text-slate-400 mb-1 block">تاريخ الانتهاء (اختياري)</label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs text-slate-400 mb-2 block">
              موجه إلى (اتركه فارغاً للجميع)
            </label>
            <div className="flex flex-wrap gap-2">
              {availableRoles.map(role => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleTargetRole(role.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    form.target_roles.includes(role.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {role.name}
                </button>
              ))}
            </div>
            {form.target_roles.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                سيصل لـ: {form.target_roles.map(r => roleLabels[r] || r).join(', ')}
              </p>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              إلغاء
            </Button>
            <Button onClick={createAnnouncement} loading={creating}>
              إرسال التعميم
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
