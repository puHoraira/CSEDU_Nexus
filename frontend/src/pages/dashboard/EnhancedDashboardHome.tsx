import { motion } from 'framer-motion';
import { Users, Calendar, Vote, Award, Clock, Bell, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatsCard } from '../../components/ui/StatsCard';
import { formatRelativeTime } from '../../lib/utils';

const STATS = [
  { title: 'Total Members',       value: '1,234', icon: Users,    trend: { value: 12, label: 'vs last month' }, color: 'primary' as const },
  { title: 'Upcoming Events',     value: '8',     icon: Calendar, trend: { value: 3,  label: 'this month'   }, color: 'success' as const },
  { title: 'Active Elections',    value: '2',     icon: Vote,     color: 'warning' as const },
  { title: 'Certificates Issued', value: '456',   icon: Award,    trend: { value: 8,  label: 'this week'    }, color: 'info'    as const },
];

const EVENTS = [
  { id: '1', title: 'Annual General Meeting 2026', date: '2026-05-01T10:00:00', location: 'Main Auditorium', attendees: 45 },
  { id: '2', title: 'Tech Workshop: React Advanced', date: '2026-04-28T14:00:00', location: 'Lab 301', attendees: 32 },
  { id: '3', title: 'Sports Day 2026', date: '2026-05-05T09:00:00', location: 'University Ground', attendees: 120 },
];

const ACTIVITY = [
  { id: '1', title: 'New event created',      desc: 'Tech Workshop: React Advanced', time: '2026-04-24T10:30:00', init: 'JD' },
  { id: '2', title: 'Election voting started', desc: 'EC Election 2026',              time: '2026-04-24T09:00:00', init: 'JS' },
  { id: '3', title: 'New member joined',       desc: 'Alice Johnson',                 time: '2026-04-23T16:45:00', init: 'AJ' },
];

const QUICK = [
  { label: 'Create Event',   href: '/dashboard/events/create', icon: Calendar },
  { label: 'View Elections', href: '/dashboard/elections',     icon: Vote },
  { label: 'Certificates',   href: '/dashboard/certificates',  icon: Award },
  { label: 'Notifications',  href: '/dashboard/notifications', icon: Bell },
];

const PENDING = [
  { icon: AlertCircle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', title: 'Profile Incomplete', desc: 'Complete your profile to participate in elections', href: '/dashboard/profile', label: 'Complete Now' },
  { icon: Vote,        color: 'var(--accent)', bg: 'rgba(107,163,255,0.1)', border: 'rgba(107,163,255,0.3)', title: 'Active Voting', desc: '2 elections are waiting for your vote', href: '/dashboard/elections', label: 'Vote Now' },
  { icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', title: 'All Caught Up!', desc: 'No pending tasks at the moment', href: '#', label: 'Great Job!' },
];

export function EnhancedDashboardHome() {
  const { user } = useAuth();

  return (
    <div className="ui-page">
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? 'there'}!`}
        description="Here's what's happening with your club today."
      />

      {/* Stats */}
      <div className="ui-grid-4">
        {STATS.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <StatsCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="ui-card">
        <div className="ui-card__header"><h3 className="ui-card__title">Quick Actions</h3></div>
        <div className="ui-card__body">
          <div className="ui-grid-4">
            {QUICK.map(q => {
              const Icon = q.icon;
              return (
                <motion.a
                  key={q.label}
                  href={q.href}
                  whileHover={{ y: -3 }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    padding: '20px 12px', borderRadius: 16, textDecoration: 'none',
                    border: '1px solid var(--border)', background: 'var(--surface)',
                    transition: 'border-color 0.18s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                >
                  <div style={{ padding: 12, borderRadius: 14, background: 'var(--gradient-primary)', boxShadow: '0 4px 12px var(--accent-glow)' }}>
                    <Icon size={22} color="#fff" />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', textAlign: 'center' }}>{q.label}</span>
                </motion.a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Events + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(260px,1fr)', gap: 20 }}>
        {/* Upcoming Events */}
        <div className="ui-card" style={{ padding: 0 }}>
          <div className="ui-card__header">
            <h3 className="ui-card__title">Upcoming Events</h3>
            <a href="/dashboard/events" className="ui-link">View All</a>
          </div>
          {EVENTS.map((ev, i) => {
            const d = new Date(ev.date);
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 22px',
                  borderBottom: i < EVENTS.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.18s', cursor: 'pointer',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{
                  width: 50, height: 50, borderRadius: 14, flexShrink: 0,
                  background: 'var(--gradient-primary)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff',
                }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1 }}>{d.getDate()}</span>
                  <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', opacity: 0.85 }}>
                    {d.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 3 }} className="ui-truncate">{ev.title}</div>
                  <div className="ui-flex ui-flex-gap-3 ui-text-xs ui-text-muted">
                    <span className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
                      <Clock size={11} /> {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="ui-truncate">{ev.location}</span>
                  </div>
                </div>
                <span className="chip" style={{ fontSize: '0.7rem', flexShrink: 0 }}>{ev.attendees} attending</span>
              </motion.div>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="ui-card" style={{ padding: 0 }}>
          <div className="ui-card__header"><h3 className="ui-card__title">Recent Activity</h3></div>
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {ACTIVITY.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="ui-flex ui-flex-gap-3">
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--gradient-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: '0.75rem',
                }}>
                  {a.init}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{a.title}</div>
                  <div className="ui-text-xs ui-text-muted ui-truncate">{a.desc}</div>
                  <div className="ui-text-xs ui-text-muted" style={{ marginTop: 2, opacity: 0.7 }}>{formatRelativeTime(a.time)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Actions */}
      <div className="ui-card">
        <div className="ui-card__header"><h3 className="ui-card__title">Pending Actions</h3></div>
        <div className="ui-card__body">
          <div className="ui-grid-3">
            {PENDING.map(p => {
              const Icon = p.icon;
              return (
                <motion.div key={p.title} whileHover={{ y: -3 }}
                  style={{ padding: '18px 20px', borderRadius: 16, background: p.bg, border: `1px solid ${p.border}` }}>
                  <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 8, alignItems: 'center' }}>
                    <Icon size={19} color={p.color} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{p.title}</span>
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>{p.desc}</p>
                  <a href={p.href} style={{
                    display: 'inline-block', padding: '7px 14px', borderRadius: 10,
                    background: p.color, color: '#fff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
                  }}>
                    {p.label}
                  </a>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
