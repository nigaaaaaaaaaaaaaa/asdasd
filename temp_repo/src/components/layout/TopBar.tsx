import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types/database';
import { Bell, X } from 'lucide-react';

export function TopBar({ title }: { title: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setNotifications(data as Notification[]);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
    fetchNotifications();
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-bg-secondary border-b border-border-subtle shrink-0">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-md text-gray-400 hover:text-white hover:bg-bg-tertiary transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          {showNotifs && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
              <div className="absolute right-0 mt-2 w-80 glass-panel-elevated z-50 animate-slide-up">
                <div className="flex items-center justify-between p-3 border-b border-border-subtle">
                  <span className="text-sm font-semibold text-white">Notifications</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300">
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setShowNotifs(false)} className="text-gray-500 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 border-b border-border-subtle hover:bg-bg-tertiary transition-colors ${
                          !n.is_read ? 'bg-blue-600/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`status-dot mt-1.5 ${
                            n.severity === 'error' ? 'bg-red-500' :
                            n.severity === 'warning' ? 'bg-amber-500' :
                            n.severity === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white font-medium">{n.title}</div>
                            {n.message && <div className="text-xs text-gray-400 mt-0.5">{n.message}</div>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
