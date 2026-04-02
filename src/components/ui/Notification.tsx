import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle2, Info, AlertCircle, Bell } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
};

type NotificationContextType = {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setNotifications((prev) => [...prev, { ...notification, id }]);

    if (notification.duration !== 0) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, notification.duration || 5000);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 z-[100] flex flex-col gap-3 max-w-sm w-full">
      {notifications.map((notification, index) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
          style={{ animationDelay: `${index * 50}ms` }}
        />
      ))}
    </div>
  );
}

function NotificationItem({ 
  notification, 
  onClose,
  style 
}: { 
  notification: Notification; 
  onClose: () => void;
  style?: React.CSSProperties;
}) {
  const icons: Record<NotificationType, React.ReactNode> = {
    success: <CheckCircle2 className="text-green-400" size={20} />,
    error: <AlertCircle className="text-red-400" size={20} />,
    warning: <AlertTriangle className="text-amber-400" size={20} />,
    info: <Info className="text-blue-400" size={20} />,
  };

  const borderColors: Record<NotificationType, string> = {
    success: 'border-green-500/30',
    error: 'border-red-500/30',
    warning: 'border-amber-500/30',
    info: 'border-blue-500/30',
  };

  const bgColors: Record<NotificationType, string> = {
    success: 'bg-green-950/40',
    error: 'bg-red-950/40',
    warning: 'bg-amber-950/40',
    info: 'bg-blue-950/40',
  };

  return (
    <div 
      className={`
        animate-slide-in-left
        glass rounded-2xl p-4 
        border ${borderColors[notification.type]} ${bgColors[notification.type]}
        shadow-xl shadow-black/20
      `}
      style={style}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {icons[notification.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-white">{notification.title}</div>
          {notification.message && (
            <div className="text-xs text-slate-300 mt-1">{notification.message}</div>
          )}
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="mt-2 text-xs font-semibold text-brand-400 hover:text-brand-300 transition"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-slate-400 hover:text-white transition"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// Notification Bell Component for Header
type NotificationBellProps = {
  count?: number;
  onClick?: () => void;
};

export function NotificationBell({ count = 0, onClick }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 transition"
    >
      <Bell size={20} className="text-slate-300" />
      {count > 0 && (
        <span className="notification-badge">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

// Alerts Panel Component
type Alert = {
  id: number;
  type: 'overdue' | 'due_soon' | 'payment' | 'general';
  title: string;
  message: string;
  link?: string;
  time: string;
  isRead: boolean;
};

type AlertsPanelProps = {
  alerts: Alert[];
  onAlertClick?: (alert: Alert) => void;
  onMarkAllRead?: () => void;
};

export function AlertsPanel({ alerts, onAlertClick, onMarkAllRead }: AlertsPanelProps) {
  const typeIcons: Record<Alert['type'], React.ReactNode> = {
    overdue: <AlertTriangle className="text-red-400" size={18} />,
    due_soon: <AlertCircle className="text-amber-400" size={18} />,
    payment: <CheckCircle2 className="text-green-400" size={18} />,
    general: <Info className="text-blue-400" size={18} />,
  };

  const typeBg: Record<Alert['type'], string> = {
    overdue: 'bg-red-950/20',
    due_soon: 'bg-amber-950/20',
    payment: 'bg-green-950/20',
    general: 'bg-blue-950/20',
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <div className="font-bold text-sm">التنبيهات</div>
        {onMarkAllRead && alerts.some(a => !a.isRead) && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-brand-400 hover:text-brand-300 transition"
          >
            تعيين الكل كمقروء
          </button>
        )}
      </div>
      
      <div className="max-h-[400px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            لا توجد تنبيهات
          </div>
        ) : (
          alerts.map((alert) => (
            <button
              key={alert.id}
              onClick={() => onAlertClick?.(alert)}
              className={`
                w-full text-right p-4 border-b border-slate-800/50 
                hover:bg-slate-800/30 transition
                ${!alert.isRead ? typeBg[alert.type] : ''}
              `}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {typeIcons[alert.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${!alert.isRead ? 'text-white' : 'text-slate-300'}`}>
                    {alert.title}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {alert.message}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {alert.time}
                  </div>
                </div>
                {!alert.isRead && (
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-brand-500 mt-2" />
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
