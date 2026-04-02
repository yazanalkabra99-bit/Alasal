import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { browserNotificationService } from '../services/browserNotifications';
import { AlertTriangle, Bell, ClipboardList, Clock, DollarSign, Megaphone } from 'lucide-react';

type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  priority: string;
  is_read: number;
  created_at: string;
};

export function NotificationBell() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count || 0);
    } catch (e) {
      // Silently fail
    }
  }, []);

  const fetchRecentNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications', { params: { unread_only: '1', limit: 5 } });
      setRecentNotifications(res.data.data || []);
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Set up SSE connection + listeners for real-time updates
    const checkNotificationPermission = async () => {
      if (!browserNotificationService.hasPermission()) {
        const granted = await browserNotificationService.requestPermission();
        if (granted) {
          browserNotificationService.showWelcomeNotification();
        }
      }
      // Connect SSE (will fallback to polling internally if needed)
      browserNotificationService.connectSSE();
    };

    checkNotificationPermission();

    // Listen for SSE real-time unread count updates
    const unsubUnread = browserNotificationService.on('unread_count', (data) => {
      setUnreadCount(data.count || 0);
    });

    // Listen for new notification events — refresh dropdown if open
    const unsubNew = browserNotificationService.on('new_notification', () => {
      // Bump count optimistically, SSE unread_count event will correct it
      setUnreadCount(prev => prev + 1);
    });

    // Listen for "all read" event
    const unsubAllRead = browserNotificationService.on('all_read', () => {
      setUnreadCount(0);
      setRecentNotifications([]);
    });

    // Fallback polling for unread count (in case SSE isn't available)
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => {
      clearInterval(interval);
      unsubUnread();
      unsubNew();
      unsubAllRead();
      browserNotificationService.disconnectSSE();
    };
  }, [fetchUnreadCount]);

  const handleBellClick = () => {
    if (!showDropdown) {
      fetchRecentNotifications();
    }
    setShowDropdown(!showDropdown);
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      await api.patch(`/notifications/${notification.id}/read`);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setRecentNotifications(prev => prev.filter(n => n.id !== notification.id));
    } catch (e) {
      // Ignore
    }

    setShowDropdown(false);

    if (notification.link) {
      navigate(notification.link);
    } else {
      navigate('/notifications');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setUnreadCount(0);
      setRecentNotifications([]);
      setShowDropdown(false);
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  };

  const priorityColors: Record<string, string> = {
    low: 'border-slate-500',
    normal: 'border-blue-500',
    high: 'border-amber-500',
    urgent: 'border-red-500',
  };

  const typeIcons: Record<string, React.ReactNode> = {
    overdue: <AlertTriangle size={18} className="text-red-400" />,
    due_soon: <Clock size={18} className="text-amber-400" />,
    pending_payment: <DollarSign size={18} className="text-emerald-400" />,
    status_change: <ClipboardList size={18} className="text-blue-400" />,
    announcement: <Megaphone size={18} className="text-purple-400" />,
    system: <Bell size={18} className="text-slate-300" />,
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-xl hover:bg-slate-700/50 transition-colors"
        title="الإشعارات"
      >
        <svg
          className={`w-6 h-6 ${unreadCount > 0 ? 'text-blue-400' : 'text-slate-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute left-0 mt-2 w-80 bg-slate-800 rounded-xl border border-slate-700 shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <span className="font-semibold text-white">الإشعارات</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  قراءة الكل
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-slate-400">
                  جاري التحميل...
                </div>
              ) : recentNotifications.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="flex justify-center mb-2"><Bell size={28} className="text-slate-400" /></div>
                  <div className="text-sm text-slate-400">لا توجد إشعارات جديدة</div>
                </div>
              ) : (
                recentNotifications.map(notification => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-right px-4 py-3 hover:bg-slate-700/50 transition-colors border-r-2 ${priorityColors[notification.priority]}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5">
                        {typeIcons[notification.type] || <Bell size={18} className="text-slate-300" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {notification.title}
                        </div>
                        <div className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                          {notification.message}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {new Date(notification.created_at).toLocaleString('en-US')}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <button
              onClick={() => { setShowDropdown(false); navigate('/notifications'); }}
              className="w-full px-4 py-3 text-center text-sm text-blue-400 hover:bg-slate-700/50 border-t border-slate-700 transition-colors"
            >
              عرض كل الإشعارات
            </button>
          </div>
        </>
      )}
    </div>
  );
}
