import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, Calendar, Users, Vote, FileText, DollarSign,
  Award, Bell, Settings, ChevronLeft, ChevronRight, UserCircle, LogOut, BookOpen
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

interface Props { collapsed: boolean; onToggle: () => void; }

const NAV = [
  { label: 'Dashboard',     to: '/dashboard/home',                icon: Home },
  { label: 'Profile',       to: '/dashboard/profile',             icon: UserCircle },
  { label: 'Events',        to: '/dashboard/events',              icon: Calendar },
  { label: 'Workshops',     to: '/dashboard/workshops',           icon: BookOpen },
  { label: 'Meetings',      to: '/dashboard/meetings',            icon: Users },
  { label: 'Elections',     to: '/dashboard/elections',           icon: Vote },
  { label: 'Governance',    to: '/dashboard/governance/ec-terms', icon: FileText, roles: ['Moderator','Chief Patron','President','General Secretary'] },
  { label: 'Finance',       to: '/dashboard/finance',             icon: DollarSign, roles: ['Treasurer','Moderator','Chief Patron'] },
  { label: 'Certificates',  to: '/dashboard/certificates',        icon: Award },
  { label: 'Notifications', to: '/dashboard/notifications',       icon: Bell },
  { label: 'Admin',         to: '/dashboard/admin',               icon: Settings, roles: ['System Admin'] },
];

export function EnhancedSidebar({ collapsed, onToggle }: Props) {
  const { user, logout } = useAuth();

  const items = NAV.filter(item => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.some(r => user.roles.includes(r));
  });

  return (
    <motion.div
      className={`ui-sidebar ${collapsed ? 'ui-sidebar--collapsed' : 'ui-sidebar--expanded'}`}
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {/* Brand */}
      <div className="ui-sidebar__brand">
        <div className="ui-sidebar__logo">CN</div>
        {!collapsed && (
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div className="ui-sidebar__name">CSEDU Nexus</div>
            <div className="ui-sidebar__sub">Club Platform</div>
          </div>
        )}
        <button className="ui-sidebar__toggle" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="ui-sidebar__nav">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `ui-nav-item ${collapsed ? 'ui-nav-item--center' : ''} ${isActive ? 'is-active' : ''}`
              }
            >
              <span className="ui-nav-item__icon"><Icon size={18} /></span>
              {!collapsed && <span className="ui-nav-item__label">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User */}
      <div className="ui-sidebar__user">
        {user && !collapsed && (
          <div className="ui-sidebar__user-card">
            <div className="ui-sidebar__avatar">
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user.firstName.charAt(0).toUpperCase()
              }
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div className="ui-sidebar__user-name ui-truncate">{user.firstName} {user.lastName}</div>
              <div className="ui-sidebar__user-role ui-truncate">{user.roles[0] ?? 'Member'}</div>
            </div>
          </div>
        )}
        {user && collapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
            <div className="ui-sidebar__avatar">
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user.firstName.charAt(0).toUpperCase()
              }
            </div>
          </div>
        )}
        {user && (
          <button
            onClick={logout}
            className={`ui-logout-btn ${collapsed ? 'ui-logout-btn--center' : ''}`}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut size={17} />
            {!collapsed && <span>Logout</span>}
          </button>
        )}
      </div>
    </motion.div>
  );
}
