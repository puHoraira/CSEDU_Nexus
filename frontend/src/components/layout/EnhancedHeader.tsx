import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Moon, Sun, User, LogOut, ChevronDown, Settings, Menu, Languages } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { formatRelativeTime } from '../../lib/utils';
import { categoryMeta, tint } from '../../lib/notifications';
import { getUserTypeDisplayName, getUserType } from '../../utils/dashboardRouter';
import { GlobalSearchBox } from '../search/GlobalSearchBox';
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

interface Props {
  onMobileMenuToggle: () => void;
}

export function EnhancedHeader({ onMobileMenuToggle }: Props) {
  const { user, token, logout, loading } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [notifOpen, setNotifOpen]     = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadQ = useQuery({
    queryKey: ['notif-count', token],
    queryFn: () => apiRequest<UnreadPayload>('/notifications/unread-count', { token }),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  });
  const previewQ = useQuery({
    queryKey: ['notif-preview', token],
    queryFn: () => apiRequest<NotifPreview>('/notifications?limit=5', { token }),
    enabled: Boolean(token),
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

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const unread = unreadQ.data?.unreadCount ?? 0;
  const notifs = previewQ.data?.items ?? [];
  const userType = getUserType(user);
  const userTypeDisplay = getUserTypeDisplayName(userType);

  const handleNotificationClick = () => {
    if (isMobile) {
      // On mobile, navigate directly to notifications page
      navigate('/dashboard/notifications');
    } else {
      // On desktop, toggle dropdown panel
      setNotifOpen(v => !v);
      setProfileOpen(false);
    }
  };

  return (
    <header className="ui-header">
      {/* Mobile Menu Button */}
      <button 
        className="ui-mobile-menu-btn ui-touch-target" 
        onClick={onMobileMenuToggle}
        aria-label="Toggle menu"
        aria-expanded={false}
      >
        <Menu size={20} />
      </button>

      {/* Global Search */}
      <GlobalSearchBox 
        placeholder={t('header.searchPlaceholder')}
      />

      <div className="ui-header__actions">
        {/* Language Toggle */}
        <button 
          className="icon-button ui-touch-target" 
          onClick={toggleLanguage} 
          title={language === 'en' ? 'বাংলা' : 'English'}
          aria-label={language === 'en' ? 'Switch to Bangla' : 'Switch to English'}
        >
          <Languages size={17} />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, marginLeft: '-2px' }}>
            {language === 'en' ? 'বাং' : 'EN'}
          </span>
        </button>

        {/* Theme */}
        <button 
          className="icon-button ui-touch-target" 
          onClick={toggleTheme} 
          title={resolvedTheme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
          aria-label={resolvedTheme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
        >
          {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className={`icon-button ui-touch-target ${unread > 0 ? 'icon-button--ring' : ''}`}
            onClick={handleNotificationClick}
            aria-label={`${t('header.notifications')} ${unread > 0 ? `(${unread} ${t('header.unread')})` : ''}`}
            aria-expanded={notifOpen}
          >
            <Bell size={17} />
            {unread > 0 && <span className="icon-button__badge">{unread > 9 ? '9+' : unread}</span>}
          </button>

          <AnimatePresence>
            {!isMobile && notifOpen && (
              <motion.div {...drop} className="ui-notif-panel">
                <div className="ui-notif-panel__head">
                  <div>
                    <p className="ui-notif-panel__title">{t('header.notifications')}</p>
                    <p className="ui-notif-panel__count">{unread} {t('header.unread')}</p>
                  </div>
                  <button
                    onClick={() => markAllMut.mutate()}
                    disabled={unread === 0}
                    className="ui-link"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: unread === 0 ? 0.4 : 1 }}
                  >
                    {t('header.markAllRead')}
                  </button>
                </div>

                <div className="ui-notif-panel__list">
                  {previewQ.isLoading && (
                    <div className="ui-empty ui-empty--sm"><p className="ui-text-sm ui-text-muted">{t('common.loading')}</p></div>
                  )}
                  {!previewQ.isLoading && notifs.length === 0 && (
                    <div className="ui-empty ui-empty--sm"><p className="ui-text-sm ui-text-muted">{t('header.noNotifications')}</p></div>
                  )}
                  {notifs.map(n => {
                    const meta = categoryMeta(n.category);
                    const Icon = meta.icon;
                    return (
                      <div key={n._id} className={`ui-notif-item ${!n.isRead ? 'ui-notif-item--unread' : ''}`}>
                        <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'flex-start' }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: 8, flexShrink: 0, marginTop: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: tint(meta.color, 0.14), color: meta.color,
                          }}>
                            <Icon size={15} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="ui-flex ui-flex-between">
                              <div className="ui-notif-item__title">{n.title}</div>
                              {!n.isRead && <div className="ui-notif-item__dot" />}
                            </div>
                            <div className="ui-notif-item__msg">{n.message}</div>
                            <div className="ui-notif-item__time">{formatRelativeTime(n.createdAt)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="ui-notif-panel__footer">
                  <Link to="/dashboard/notifications" onClick={() => setNotifOpen(false)} className="ui-link">
                    {t('header.viewAll')}
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            className="ui-profile-btn ui-touch-target"
            onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
            aria-label={`Profile menu for ${user ? `${user.firstName} ${user.lastName}` : 'Guest'}`}
            aria-expanded={profileOpen}
          >
            <div className="ui-sidebar__avatar" style={{ width: 30, height: 30, fontSize: '0.78rem' }}>
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user?.firstName?.charAt(0).toUpperCase() ?? 'G'
              }
            </div>
            <div className="ui-hide-mobile" style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {userTypeDisplay}
              </div>
            </div>
            <ChevronDown 
              size={13} 
              className="ui-hide-mobile"
              style={{ 
                color: 'var(--muted)', 
                transform: profileOpen ? 'rotate(180deg)' : 'none', 
                transition: 'transform 0.2s' 
              }} 
            />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div {...drop} className="ui-profile-dropdown">
                <Link to="/dashboard/profile" onClick={() => setProfileOpen(false)} className="ui-dropdown-item">
                  <User size={15} /> {t('nav.profile')}
                </Link>
                <Link to="/dashboard/settings" onClick={() => setProfileOpen(false)} className="ui-dropdown-item">
                  <Settings size={15} /> {t('nav.settings')}
                </Link>
                <div className="ui-divider" style={{ margin: '4px 0' }} />
                <button onClick={() => { logout(); setProfileOpen(false); }} className="ui-dropdown-item ui-dropdown-item--danger">
                  <LogOut size={15} /> {t('nav.logout')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
