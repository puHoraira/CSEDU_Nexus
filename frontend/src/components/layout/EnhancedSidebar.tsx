import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, Calendar, Users, Vote, FileText, DollarSign,
  Award, Bell, Settings, ChevronLeft, ChevronRight, UserCircle, LogOut, BookOpen,
  Shield, GraduationCap, Gavel
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

interface Props { 
  collapsed: boolean; 
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}

type NavItem = {
  label: string;
  to: string;
  icon: React.ElementType;
  roles?: string[];
};

const NAV: NavItem[] = [
  { label: 'Dashboard',     to: '/dashboard/home',                icon: Home },
  { label: 'Profile',       to: '/dashboard/profile',             icon: UserCircle },
  { label: 'Events',        to: '/dashboard/events',              icon: Calendar },
  { label: 'Workshops',     to: '/dashboard/workshops',           icon: BookOpen },
  { label: 'Meetings',      to: '/dashboard/meetings',            icon: Users },
  { label: 'Elections',     to: '/dashboard/elections',           icon: Vote },
  { label: 'Governance',    to: '/dashboard/governance/ec-terms', icon: FileText,    roles: ['Moderator','Chief Patron','President','General Secretary'] },
  { label: 'Finance',       to: '/dashboard/finance',             icon: DollarSign,  roles: ['Treasurer','Moderator','Chief Patron'] },
  { label: 'Certificates',  to: '/dashboard/certificates',        icon: Award },
  { label: 'Rooms',         to: '/dashboard/admin/rooms',         icon: Settings,    roles: ['Moderator','Chief Patron'] },
  { label: 'Notifications', to: '/dashboard/notifications',       icon: Bell },
  // Role-specific dashboards — shown only to the relevant role
  { label: 'Moderator',     to: '/dashboard/moderator',           icon: Shield,      roles: ['Moderator'] },
  { label: 'Chief Patron',  to: '/dashboard/chief-patron',        icon: Gavel,       roles: ['Chief Patron'] },
  { label: 'EC Commission', to: '/dashboard/election-commission', icon: Vote,        roles: ['Election Commissioner'] },
  { label: 'Alumni Portal', to: '/dashboard/alumni',              icon: GraduationCap, roles: ['Alumni'] },
  { label: 'Admin',         to: '/dashboard/admin',               icon: Settings,    roles: ['System Admin'] },
];

export function EnhancedSidebar({ collapsed, mobileOpen, onToggle, onMobileClose }: Props) {
  const { user, logout } = useAuth();

  const items = NAV.filter(item => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.some(r => user.roles.includes(r));
  });

  // Handle keyboard navigation for mobile
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && mobileOpen) {
      onMobileClose();
    }
  };

  return (
    <motion.div
      className={`ui-sidebar ${collapsed ? 'ui-sidebar--collapsed' : 'ui-sidebar--expanded'} ${mobileOpen ? 'mobile-open' : ''}`}
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      onKeyDown={handleKeyDown}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="ui-sidebar__brand">
        <div className="ui-sidebar__logo" role="img" aria-label="CSEDU Nexus">CN</div>
        {!collapsed && (
          <>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div className="ui-sidebar__name">CSEDU Nexus</div>
              <div className="ui-sidebar__sub">Club Platform</div>
            </div>
            <button 
              className="ui-sidebar__toggle ui-touch-target" 
              onClick={onToggle} 
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={13} />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="ui-sidebar__nav" role="navigation">
        {/* Expand button when collapsed - shown as first nav item */}
        {collapsed && (
          <button
            className="ui-nav-item ui-nav-item--center ui-nav-item--expand ui-touch-target"
            onClick={onToggle}
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <span className="ui-nav-item__icon" aria-hidden="true">
              <ChevronRight size={18} />
            </span>
          </button>
        )}
        
        {items.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `ui-nav-item ui-touch-target ${collapsed ? 'ui-nav-item--center' : ''} ${isActive ? 'is-active' : ''}`
              }
              aria-label={item.label}
            >
              <span className="ui-nav-item__icon" aria-hidden="true"><Icon size={18} /></span>
              {!collapsed && <span className="ui-nav-item__label">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User */}
      <div className="ui-sidebar__user">
        {user && !collapsed && (
          <div className="ui-sidebar__user-card">
            <div className="ui-sidebar__avatar" role="img" aria-label={`${user.firstName} ${user.lastName}`}>
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
            <div className="ui-sidebar__avatar" role="img" aria-label={`${user.firstName} ${user.lastName}`}>
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user.firstName.charAt(0).toUpperCase()
              }
            </div>
          </div>
        )}
        {user && (
          <button
            onClick={logout}
            className={`ui-logout-btn ui-touch-target ${collapsed ? 'ui-logout-btn--center' : ''}`}
            title={collapsed ? 'Logout' : undefined}
            aria-label="Logout"
          >
            <LogOut size={17} />
            {!collapsed && <span>Logout</span>}
          </button>
        )}
      </div>
    </motion.div>
  );
}
