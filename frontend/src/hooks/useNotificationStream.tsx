import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { env } from '../config/env';
import { useAuth } from '../auth/AuthContext';
import type { NotificationRow } from '../lib/notifications';
import { categoryMeta, priorityMeta } from '../lib/notifications';

/**
 * useNotificationStream — the browser-side observer.
 * -------------------------------------------------------------------------
 * Subscribes to the backend SSE stream (`/notifications/stream`) and reacts to
 * pushed events in real time:
 *   - `notification`  → toast + invalidate lists + bump unread caches
 *   - `unread-count`  → update all unread-count caches instantly
 *
 * EventSource can't send Authorization headers, so the access token is passed
 * as a query param (validated server-side). Auto-reconnects on drop; the browser
 * handles retry via the `retry:` hint from the server.
 * -------------------------------------------------------------------------
 */
export function useNotificationStream() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token) return;

    const url = `${env.apiBaseUrl}/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    const setUnread = (count: number) => {
      // Update every unread-count cache key variant used across the app.
      qc.setQueryData(['notif-count', token], { unreadCount: count });
      qc.setQueryData(['notification-unread-count', token], { unreadCount: count });
      qc.setQueryData(['notif-count'], { unreadCount: count });
    };

    es.addEventListener('unread-count', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        if (typeof data.unreadCount === 'number') setUnread(data.unreadCount);
      } catch { /* ignore malformed frame */ }
    });

    es.addEventListener('notification', (e) => {
      let n: NotificationRow;
      try {
        n = JSON.parse((e as MessageEvent).data);
      } catch {
        return;
      }

      // Refresh lists + counts so the bell panel and page reflect the new item.
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-preview'] });
      qc.invalidateQueries({ queryKey: ['notifications-preview'] });
      qc.invalidateQueries({ queryKey: ['notif-count'] });
      qc.invalidateQueries({ queryKey: ['notification-unread-count'] });

      // Surface a toast styled by category/priority.
      const meta = categoryMeta(n.category);
      const pmeta = priorityMeta(n.priority);
      const Icon = meta.icon;
      const duration = pmeta.emphasize ? 7000 : 4500;

      toast.custom(
        (tt) => (
          <div
            onClick={() => {
              if (n.actionUrl) window.location.assign(n.actionUrl);
              toast.dismiss(tt.id);
            }}
            style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              maxWidth: 380, padding: '12px 14px', borderRadius: 14,
              background: 'var(--panel-strong, #1c1f27)',
              border: `1px solid ${pmeta.emphasize ? pmeta.color : 'var(--border, #2a2e37)'}`,
              boxShadow: '0 12px 30px rgba(0,0,0,0.28)',
              cursor: n.actionUrl ? 'pointer' : 'default',
              color: 'var(--text, #e6e8ec)',
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${meta.color}22`, color: meta.color,
            }}>
              <Icon size={17} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem' }}>{n.title}</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', opacity: 0.8, lineHeight: 1.4 }}>{n.message}</p>
            </div>
          </div>
        ),
        { duration }
      );
    });

    es.onerror = () => {
      // Browser auto-reconnects using the server's retry hint. If the token is
      // stale the next connection will 401 and close; that's acceptable.
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [token, qc]);

  return esRef;
}
