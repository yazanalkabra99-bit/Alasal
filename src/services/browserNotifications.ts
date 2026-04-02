import { api } from '../utils/api';

type SSEListener = (data: any) => void;

class BrowserNotificationService {
  private permissionGranted: boolean = false;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private eventSource: EventSource | null = null;
  private sseListeners: Map<string, Set<SSEListener>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private sseConnected = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notification');
      return;
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    this.permissionGranted = permission === 'granted';
    return this.permissionGranted;
  }

  public hasPermission(): boolean {
    return this.permissionGranted;
  }

  // =====================================================
  // SSE (Server-Sent Events) — Real-Time Connection
  // =====================================================

  /**
   * Connect to the SSE stream for real-time notifications.
   * Falls back to polling if SSE fails.
   */
  public connectSSE(): void {
    if (this.eventSource) return; // already connected

    const token = localStorage.getItem('token');
    if (!token) return;

    // Build SSE URL with auth token as query param (SSE doesn't support headers)
    const baseURL = (import.meta.env.VITE_API_BASE_URL as string) || '/api';
    const cleanToken = token.replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '');
    const sseUrl = `${baseURL}/notifications/stream?token=${encodeURIComponent(cleanToken)}`;

    try {
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.sseConnected = true;
        this.reconnectAttempts = 0;
        // SSE is connected — stop polling if it was running as fallback
        this.stopPolling();
      };

      // Listen for specific events
      this.eventSource.addEventListener('new_notification', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.emitEvent('new_notification', data);
          // Show desktop notification
          if (this.permissionGranted) {
            this.showDesktopNotification(data);
          }
        } catch { /* ignore parse errors */ }
      });

      this.eventSource.addEventListener('new_notifications', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.emitEvent('new_notifications', data);
        } catch { /* ignore */ }
      });

      this.eventSource.addEventListener('unread_count', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.emitEvent('unread_count', data);
        } catch { /* ignore */ }
      });

      this.eventSource.addEventListener('all_read', (event: MessageEvent) => {
        this.emitEvent('all_read', {});
      });

      this.eventSource.onerror = () => {
        this.sseConnected = false;
        this.disconnectSSE();
        this.scheduleReconnect();
      };

    } catch {
      // SSE not supported or connection failed — fall back to polling
      this.sseConnected = false;
      this.startPolling();
    }
  }

  /**
   * Disconnect SSE and clean up
   */
  public disconnectSSE(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.sseConnected = false;
  }

  /**
   * Schedule a reconnect with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Max attempts reached — fall back to polling permanently
      this.startPolling();
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // max 30s
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectSSE();
    }, delay);
  }

  /**
   * Subscribe to SSE events (used by components like NotificationBell)
   */
  public on(event: string, listener: SSEListener): () => void {
    if (!this.sseListeners.has(event)) {
      this.sseListeners.set(event, new Set());
    }
    this.sseListeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.sseListeners.get(event);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) this.sseListeners.delete(event);
      }
    };
  }

  private emitEvent(event: string, data: any): void {
    const listeners = this.sseListeners.get(event);
    if (!listeners) return;
    for (const listener of listeners) {
      try { listener(data); } catch { /* ignore */ }
    }
  }

  public isSSEConnected(): boolean {
    return this.sseConnected;
  }

  // =====================================================
  // Desktop Notifications (browser native)
  // =====================================================

  public showNotification(title: string, options?: NotificationOptions): void {
    if (!this.permissionGranted) return;

    const notification = new Notification(title, {
      body: options?.body || '',
      icon: options?.icon || '/logo.png',
      badge: options?.badge,
      tag: options?.tag,
      ...options
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if ((options as any)?.data?.link) {
        window.location.href = (options as any).data.link;
      }
      notification.close();
    };

    // Auto close after 10 seconds
    setTimeout(() => { notification.close(); }, 10000);
  }

  /**
   * Show a desktop notification from SSE event data.
   * Does NOT mark it as read — the user must click it in-app to mark as read.
   */
  private showDesktopNotification(data: any): void {
    if (!this.permissionGranted) return;

    const title = data.title || 'إشعار جديد';
    const body = data.message || '';

    // Play sound for high/urgent priority
    if (data.priority === 'high' || data.priority === 'urgent') {
      this.playNotificationSound();
    }

    this.showNotification(title, {
      body,
      icon: '/logo.png',
      badge: this.getBadgeForType(data.type),
      tag: `notification-${data.id || Date.now()}`,
      data: { link: data.link, type: data.type },
    } as NotificationOptions);
  }

  /**
   * Show desktop notification for a notification object (from API).
   * Does NOT mark as read — user must interact in-app.
   */
  public async showNewNotification(notificationData: any): Promise<void> {
    if (!this.permissionGranted) return;

    this.showDesktopNotification(notificationData);
    // NOTE: Intentionally NOT marking as read here.
    // The old code called api.patch(`/notifications/${id}/read`) which was wrong —
    // it marked notifications as read before the user even saw them in the app.
  }

  private getBadgeForType(type: string): string {
    const badges: Record<string, string> = {
      'overdue': '⚠️',
      'due_soon': '⏰',
      'pending_payment': '💰',
      'status_change': '📋',
      'announcement': '📢',
      'system': '🔔',
      'ticket': '✈️',
      'external_ticket': '🌍',
      'pending_source_payment': '💼',
    };
    return badges[type] || '🔔';
  }

  // =====================================================
  // Notification Sound
  // =====================================================

  private playNotificationSound(): void {
    try {
      // Use Web Audio API for a short notification beep
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch {
      // Audio not available — silent
    }
  }

  // =====================================================
  // Polling Fallback (used when SSE is unavailable)
  // =====================================================

  public startPolling(): void {
    if (this.pollingInterval) return;
    if (this.sseConnected) return; // Don't poll if SSE is active

    this.pollingInterval = setInterval(async () => {
      if (this.sseConnected) {
        this.stopPolling();
        return;
      }

      try {
        const response = await api.get('/notifications', {
          params: {
            unread_only: '1',
            limit: 5,
            since: localStorage.getItem('lastNotificationCheck') || undefined
          }
        });

        const notifications = response.data.data || [];
        const lastCheck = new Date().toISOString();
        localStorage.setItem('lastNotificationCheck', lastCheck);

        // Show desktop notifications (but don't auto-mark as read)
        for (const notification of notifications) {
          if (this.permissionGranted) {
            this.showDesktopNotification(notification);
          }
        }

        // Emit unread count for UI update
        if (response.data.unread_count !== undefined) {
          this.emitEvent('unread_count', { count: response.data.unread_count });
        }
      } catch {
        // Silent fail — might be logged out or network issue
      }
    }, 30000);
  }

  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // =====================================================
  // Lifecycle
  // =====================================================

  public async showWelcomeNotification(): Promise<void> {
    if (!this.permissionGranted) return;

    this.showNotification('مرحباً!', {
      body: 'تم تفعيل الإشعارات بنجاح. ستتلقى تنبيهات فورية عند وجود إشعارات جديدة.',
      icon: '/logo.png',
      tag: 'welcome-notification'
    });
  }

  /**
   * Full cleanup — disconnect SSE, stop polling, clear timers
   */
  public destroy(): void {
    this.disconnectSSE();
    this.stopPolling();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.sseListeners.clear();
  }
}

// Export singleton instance
export const browserNotificationService = new BrowserNotificationService();

// Auto-start SSE (or fallback to polling) when permission is granted
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (browserNotificationService.hasPermission()) {
        browserNotificationService.connectSSE();
      }
    }, 2000);
  });
}
