import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, DollarSign, Megaphone, MessageCircle, RefreshCw, ExternalLink, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { browserNotificationService } from '../services/browserNotifications';
import { useAuth } from '../state/auth';
import { api } from '../utils/api';

// ── WhatsApp Status Card (admin only) ─────────────────────────────────────
function WhatsAppCard() {
  const { token, hasRole } = useAuth();
  const [waStatus, setWaStatus] = useState<'disconnected' | 'connecting' | 'open' | null>(null);
  const [hasQr, setHasQr] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setWaStatus(res.data?.data?.status ?? 'disconnected');
      setHasQr(!!res.data?.data?.hasQr);
    } catch {
      setWaStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    if (!hasRole('admin')) return;
    fetchStatus();
    const id = setInterval(fetchStatus, 8000);
    return () => clearInterval(id);
  }, [fetchStatus, hasRole]);

  if (!hasRole('admin')) return null;

  const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/api$/, '');

  const openQrPage = () => {
    window.open(`${apiBase}/whatsapp/qr?token=${encodeURIComponent(token || '')}`, '_blank');
  };

  const resetConnection = async () => {
    setResetting(true);
    setMsg(null);
    try {
      await api.post('/whatsapp/reset');
      setMsg('تم مسح الجلسة — جاري الانتظار لظهور QR...');
      setTimeout(fetchStatus, 3000);
    } catch (e: any) {
      setMsg(e?.response?.data?.error || 'فشلت إعادة التعيين');
    } finally {
      setResetting(false);
    }
  };

  const statusConfig = {
    open:         { label: 'متصل',    color: 'text-emerald-400', dot: 'bg-emerald-500', Icon: CheckCircle2  },
    connecting:   { label: 'يتصل…',  color: 'text-amber-400',   dot: 'bg-amber-500 animate-pulse', Icon: Loader2 },
    disconnected: { label: 'غير متصل', color: 'text-red-400',   dot: 'bg-red-500',     Icon: XCircle       },
  };
  const cfg = statusConfig[waStatus ?? 'disconnected'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle size={18} className="text-emerald-400" />
          واتساب
        </CardTitle>
        <CardDescription>إدارة اتصال واتساب وربط الجهاز</CardDescription>
      </CardHeader>

      <div className="px-6 pb-6 space-y-4">
        {/* Status row */}
        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
          <div>
            <p className="text-sm text-slate-400 mb-1">حالة الاتصال</p>
            <p className={`font-bold flex items-center gap-2 ${cfg.color}`}>
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </p>
          </div>
          <button
            onClick={fetchStatus}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition"
            title="تحديث"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Open QR page — shown when disconnected/connecting OR when QR is available */}
          {waStatus !== 'open' && (
            <Button onClick={openQrPage} className="flex-1 flex items-center justify-center gap-2">
              <ExternalLink size={15} />
              {hasQr ? 'امسح رمز QR' : 'صفحة QR (تحديث كل 5 ث)'}
            </Button>
          )}

          {/* Reset — force clear auth & re-generate QR */}
          <Button
            variant="secondary"
            onClick={resetConnection}
            disabled={resetting}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <RefreshCw size={15} className={resetting ? 'animate-spin' : ''} />
            {resetting ? 'جاري الإعادة...' : 'إعادة تعيين الاتصال'}
          </Button>
        </div>

        {msg && (
          <p className="text-sm text-amber-300 bg-amber-900/20 border border-amber-800/30 rounded-lg px-3 py-2">
            {msg}
          </p>
        )}

        <div className="text-xs text-slate-500 space-y-1">
          <p>• <b>امسح رمز QR</b>: يفتح صفحة في تبويب جديد — افتح واتساب ← الأجهزة المرتبطة ← ربط جهاز</p>
          <p>• <b>إعادة تعيين</b>: امسح الجلسة القديمة وأنشئ رمز QR جديد (في حال توقف الاتصال)</p>
          <p>• الصفحة تتحدث تلقائياً — رمز QR صالح لمدة ~60 ثانية</p>
        </div>
      </div>
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function NotificationSettings() {
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setPermissionStatus(Notification.permission);
  }, []);

  const requestPermission = async () => {
    setIsLoading(true);
    try {
      const granted = await browserNotificationService.requestPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
      
      if (granted) {
        browserNotificationService.showWelcomeNotification();
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (permissionStatus) {
      case 'granted': return 'text-green-400';
      case 'denied': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getStatusText = () => {
    switch (permissionStatus) {
      case 'granted': return 'مفعلة';
      case 'denied': return 'مرفوضة';
      default: return 'غير محددة';
    }
  };

  const getActionText = () => {
    switch (permissionStatus) {
      case 'granted': return 'إعادة تفعيل';
      case 'denied': return 'محاولة مرة أخرى';
      default: return 'تفعيل الإشعارات';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">إعدادات الإشعارات</h1>
        <p className="text-slate-400">إدارة إعدادات الإشعارات الخارجية للمتصفح</p>
      </div>

      {/* WhatsApp section — admin only */}
      <WhatsAppCard />

      <Card>
        <CardHeader>
          <CardTitle>الإشعارات الخارجية</CardTitle>
          <CardDescription>
            تفعيل الإشعارات لتظهر حتى عندما يكون المتصفح مغلقاً أو في الخلفية
          </CardDescription>
        </CardHeader>
        
        <div className="px-6 pb-6 space-y-6">
          {/* Permission Status */}
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
            <div>
              <h3 className="font-medium text-white mb-1">حالة الإشعارات</h3>
              <p className={`text-sm ${getStatusColor()}`}>
                {getStatusText()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                permissionStatus === 'granted' ? 'bg-green-500' :
                permissionStatus === 'denied' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-xs text-slate-400">
                {permissionStatus === 'granted' ? 'نشط' :
                 permissionStatus === 'denied' ? 'معطل' : 'معلق'}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={requestPermission}
              disabled={isLoading || permissionStatus === 'granted'}
              className="flex-1"
            >
              {isLoading ? 'جاري التفعيل...' : getActionText()}
            </Button>
            
            {permissionStatus === 'granted' && (
              <Button
                variant="secondary"
                onClick={() => browserNotificationService.showWelcomeNotification()}
                className="flex-1"
              >
                إظهار إشعار تجريبي
              </Button>
            )}
          </div>

          {/* Info Section */}
          <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
            <h4 className="font-medium text-blue-300 mb-2">معلومات مهمة:</h4>
            <ul className="text-sm text-blue-200 space-y-1">
              <li>• الإشعارات تظهر حتى عند إغلاق المتصفح</li>
              <li>• يمكنك إيقافها مؤقتاً من إعدادات المتصفح</li>
              <li>• سيتم إرسال إشعارات للطلبات المتأخرة والرحلات القادمة</li>
              <li>• النقر على الإشعار يفتح الصفحة ذات الصلة</li>
            </ul>
          </div>

          {/* Browser Settings */}
          {permissionStatus === 'denied' && (
            <div className="p-4 bg-amber-900/20 border border-amber-800/30 rounded-lg">
              <h4 className="font-medium text-amber-300 mb-2">كيفية تفعيل الإشعارات:</h4>
              <ol className="text-sm text-amber-200 space-y-1 list-decimal list-inside">
                <li>انقر على أيقونة القفل بجانب عنوان الموقع في شريط العنوان</li>
                <li>ابحث عن خيار "الإشعارات"</li>
                <li>اختر "السماح" أو "طلب إذن"</li>
                <li>عد إلى هذه الصفحة وانقر على زر التفعيل</li>
              </ol>
            </div>
          )}
        </div>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>أنواع الإشعارات</CardTitle>
          <CardDescription>
            أنواع الإشعارات التي ستتلقاها
          </CardDescription>
        </CardHeader>
        
        <div className="px-6 pb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className="text-amber-400" />
                <h4 className="font-medium text-white">الطلبات المتأخرة</h4>
              </div>
              <p className="text-sm text-slate-400">
                إشعارات عند تجاوز الطلبات موعد التسليم
              </p>
            </div>
            
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={18} className="text-blue-400" />
                <h4 className="font-medium text-white">الرحلات القادمة</h4>
              </div>
              <p className="text-sm text-slate-400">
                تذكير قبل 24 ساعة من موعد الرحلة
              </p>
            </div>
            
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} className="text-emerald-400" />
                <h4 className="font-medium text-white">المدفوعات المعلقة</h4>
              </div>
              <p className="text-sm text-slate-400">
                تنبيه للمدفوعات التي تحتاج متابعة
              </p>
            </div>
            
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Megaphone size={18} className="text-purple-400" />
                <h4 className="font-medium text-white">الإعلانات</h4>
              </div>
              <p className="text-sm text-slate-400">
                إشعارات إدارية وتحديثات مهمة
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}