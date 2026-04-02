import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, ClipboardList, Clock, DollarSign, Megaphone, Settings, Check, Trash2 } from 'lucide-react';
import { api } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  priority: string;
  is_read: number;
  related_type: string | null;
  related_id: number | null;
  created_at: string;
  read_at: string | null;
};

type NotificationPreferences = {
  notify_overdue: number;
  notify_due_soon: number;
  notify_pending_payment: number;
  notify_status_change: number;
  notify_announcements: number;
  due_soon_days: number;
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-600',
  normal: 'bg-blue-600',
  high: 'bg-blue-600',
  urgent: 'bg-red-600',
};

const typeIcons: Record<string, React.ReactNode> = {
  overdue: <AlertTriangle size={18} className="text-red-400" />,
  due_soon: <Clock size={18} className="text-blue-400" />,
  pending_payment: <DollarSign size={18} className="text-emerald-400" />,
  status_change: <ClipboardList size={18} className="text-blue-400" />,
  announcement: <Megaphone size={18} className="text-purple-400" />,
  system: <Bell size={18} className="text-slate-300" />,
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications', {
        params: { unread_only: unreadOnly ? '1' : '0', limit: 100 }
      });
      setNotifications(res.data.data || []);
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  const fetchPreferences = async () => {
    try {
      const res = await api.get('/notifications/preferences');
      setPreferences(res.data.data);
    } catch (e) {
      console.error('Failed to fetch preferences:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, [fetchNotifications]);

  const markAsRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, is_read: 1 } : n
      ));
    } catch (e) {
      console.error('Failed to mark as read:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error('Failed to delete notification:', e);
    }
  };

  const clearReadNotifications = async () => {
    try {
      await api.delete('/notifications/clear-read');
      setNotifications(prev => prev.filter(n => n.is_read === 0));
    } catch (e) {
      console.error('Failed to clear read notifications:', e);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.is_read === 0) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean | number) => {
    try {
      await api.patch('/notifications/preferences', { [key]: value });
      setPreferences(prev => prev ? { ...prev, [key]: typeof value === 'boolean' ? (value ? 1 : 0) : value } : null);
    } catch (e) {
      console.error('Failed to update preference:', e);
    }
  };

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">الإشعارات</h1>
          <p className="text-sm text-slate-400 mt-1">
            {unreadCount > 0 ? `لديك ${unreadCount} إشعار غير مقروء` : 'لا توجد إشعارات جديدة'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowPrefs(!showPrefs)}>
            <Settings size={16} />
            الإعدادات
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/announcements')}>
            <Megaphone size={16} />
            التعميمات
          </Button>
        </div>
      </div>

      {/* Preferences Panel */}
      {showPrefs && preferences && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-white mb-4">إعدادات الإشعارات</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={preferences.notify_overdue === 1}
                onChange={(e) => updatePreference('notify_overdue', e.target.checked)}
                className="rounded bg-slate-700 border-slate-600"
              />
              الطلبات المتأخرة
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={preferences.notify_due_soon === 1}
                onChange={(e) => updatePreference('notify_due_soon', e.target.checked)}
                className="rounded bg-slate-700 border-slate-600"
              />
              قبل موعد التسليم
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={preferences.notify_pending_payment === 1}
                onChange={(e) => updatePreference('notify_pending_payment', e.target.checked)}
                className="rounded bg-slate-700 border-slate-600"
              />
              الدفعات المعلّقة
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={preferences.notify_status_change === 1}
                onChange={(e) => updatePreference('notify_status_change', e.target.checked)}
                className="rounded bg-slate-700 border-slate-600"
              />
              تغيير الحالة
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={preferences.notify_announcements === 1}
                onChange={(e) => updatePreference('notify_announcements', e.target.checked)}
                className="rounded bg-slate-700 border-slate-600"
              />
              التعميمات
            </label>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span>التنبيه قبل:</span>
              <select
                value={preferences.due_soon_days}
                onChange={(e) => updatePreference('due_soon_days', Number(e.target.value))}
                className="bg-slate-700 border-slate-600 rounded px-2 py-1 text-sm"
              >
                <option value={1}>يوم واحد</option>
                <option value={2}>يومين</option>
                <option value={3}>3 أيام</option>
                <option value={5}>5 أيام</option>
                <option value={7}>أسبوع</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="rounded bg-slate-700 border-slate-600"
          />
          غير المقروءة فقط
        </label>
        <div className="flex-1" />
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllAsRead}>
            <ClipboardList size={16} />
            قراءة الكل
          </Button>
        )}
        {notifications.some(n => n.is_read === 1) && (
          <Button variant="secondary" size="sm" onClick={clearReadNotifications}>
            حذف المقروءة
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={unreadOnly ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات'}
          description="ستظهر هنا الإشعارات الجديدة"
        />
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => (
            <Card
              key={notification.id}
              className={`p-4 cursor-pointer transition-all hover:bg-slate-800/70 ${
                notification.is_read === 0 ? 'bg-slate-800/50 border-blue-500/30' : 'bg-slate-900/50'
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="mt-0.5">
                  {typeIcons[notification.type] || <Bell size={18} className="text-slate-300" />}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">
                      {notification.title}
                    </span>
                    {notification.is_read === 0 && (
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                    <Badge className={`${priorityColors[notification.priority]} text-white text-[10px]`}>
                      {notification.priority === 'urgent' ? 'عاجل' :
                       notification.priority === 'high' ? 'مهم' :
                       notification.priority === 'low' ? 'منخفض' : 'عادي'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span>{new Date(notification.created_at).toLocaleString('en-US')}</span>
                    {notification.link && (
                      <span className="text-blue-400">← عرض التفاصيل</span>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1">
                  {notification.is_read === 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                      className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      title="تحديد كمقروء"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
