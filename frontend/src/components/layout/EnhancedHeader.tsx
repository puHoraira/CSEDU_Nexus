import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, Moon, Sun, User, LogOut, ChevronDown, Settings } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { formatRelativeTime } from '../../lib/utils';
import toast from 'react-hot-toast';

type UnreadPayload = { unreadCount: number };
type NotifRow = { _id: string; title: string; message: string; category: string; isRead: boolean; createdAt: string; actionUrl?: string };
type NotifPreview = { items: NotifRow[]; unreadCount: number };

const drop = {
  initial: { opacity: 0, y: 8, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit:    { opacity: 0, y: 8, scale: 0.96 },
  transition: { duration: 0.15 },
};

export function EnhancedHeader() {
  const { user, token, logout, loading } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const qc = useQueryClient();
  const [notifOpen, setNotifOpen]     = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadQ = useQuery({
    queryKey: ['notif-count', token],
    queryFn: () => apiRequest<UnreadPayload>('/notifications/unread-count', { token }),
    enabled: Boolean(token) && !loading,
    refetchInterval: 60_000,
  });
  const previewQ = useQuery({
    queryKey: ['notif-preview', token],
    queryFn: () => apiRequest<NotifPreview>('/notifications?limit=5', { token }),
    enabled: Boolean(token) && !loading && notifOpen,
  });
  const markAllMut = useMutation({
    mutationFn: () => apiRequest('/notifications/read-all', { method: 'PATCH', token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-count', token] });
      qc.invalidateQueries({ queryKey: ['notif-preview', token] });
      toast.success('All marked as read');
    },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = unreadQ.data?.unreadCount ?? 0;
  const notifs = previewQ.data?.items ?? [];

  return (
    <header className="ui-header">
      {/* Search */}
      <label className="ui-header__search">
        <Search size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <input placeholder="Search members, events, notices…" />
      </label>

      <div className="ui-header__actions">
        {/* Theme */}
        <button className="icon-button" onClick={toggleTheme} title={resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}>
          {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className={`icon-button ${unread > 0 ? 'icon-button--ring' : ''}`}
            onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}
          >
            <Bell size={17} />
            {unread > 0 && <span className="icon-button__badge">{unread > 9 ? '9+' : unread}</span>}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div {...drop} className="ui-notif-panel">
                <div className="ui-notif-panel__head">
                  <div>
                    <p className="ui-notif-panel__title">Notifications</p>
                    <p className="ui-notif-panel__count">{unread} unread</p>
                  </div>
                  <button
                    onClick={() => markAllMut.mutate()}
                    disabled={unread === 0}
                    className="ui-link"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: unread === 0 ? 0.4 : 1 }}
                  >
                    Mark all read
                  </button>
                </div>

                <div className="ui-notif-panel__list">
                  {previewQ.isLoading && (
                    <div className="ui-empty ui-empty--sm"><p className="ui-text-sm ui-text-muted">Loading…</p></div>
                  )}
                  {!previewQ.isLoading && notifs.length === 0 && (
                    <div className="ui-empty ui-empty--sm"><p className="ui-text-sm ui-text-muted">No notifications</p></div>
                  )}
                  {notifs.map(n => (
                    <div key={n._id} className={`ui-notif-item ${!n.isRead ? 'ui-notif-item--unread' : ''}`}>
                      <div className="ui-flex ui-flex-between">
                        <div className="ui-notif-item__title">{n.title}</div>
                        {!n.isRead && <div className="ui-notif-item__dot" />}
                      </div>
                      <div className="ui-notif-item__msg">{n.message}</div>
                      <div className="ui-notif-item__time">{formatRelativeTime(n.createdAt)}</div>
                    </div>
                  ))}
                </div>

                <div className="ui-notif-panel__footer">
                  <Link to="/dashboard/notifications" onClick={() => setNotifOpen(false)} className="ui-link">
                    View all notifications
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            className="ui-profile-btn"
            onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
          >
            <div className="ui-sidebar__avatar" style={{ width: 30, height: 30, fontSize: '0.78rem' }}>
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user?.firstName?.charAt(0).toUpperCase() ?? 'G'
              }
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {user?.roles[0] ?? 'Member'}
              </div>
            </div>
            <ChevronDown size={13} style={{ color: 'var(--muted)', transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div {...drop} className="ui-profile-dropdown">
                <Link to="/dashboard/profile" onClick={() => setProfileOpen(false)} className="ui-dropdown-item">
                  <User size={15} /> Profile
                </Link>
                <Link to="/dashboard/settings" onClick={() => setProfileOpen(false)} className="ui-dropdown-item">
                  <Settings size={15} /> Settings
                </Link>
                <div className="ui-divider" style={{ margin: '4px 0' }} />
                <button onClick={() => { logout(); setProfileOpen(false); }} className="ui-dropdown-item ui-dropdown-item--danger">
                  <LogOut size={15} /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
