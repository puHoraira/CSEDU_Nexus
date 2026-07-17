import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, Award, BookOpen, FileText, TrendingUp, MessageSquare, Settings } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatsCard } from '../../components/ui/StatsCard';
import { Spinner } from '../../components/ui/Spinner';

const TEACHER_QUICK_ACTIONS = [
  { label: 'Club Events', href: '/dashboard/events', icon: Calendar },
  { label: 'Student Members', href: '/dashboard/membership/roster', icon: Users },
  { label: 'Certificates', href: '/dashboard/certificates', icon: Award },
  { label: 'EC Members', href: '/ec-members', icon: Users },
];

type Event = {
  _id: string;
  title: string;
  eventDate: string;
  venue: string;
  stats?: { totalRegistrations: number };
};

export function TeacherDashboard() {
  const { user, token } = useAuth();

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: queryKeys.events.all(token!),
    queryFn: () => apiRequest<Event[]>('/events', { token }),
    enabled: Boolean(token),
  });

  const isLoading = eventsLoading;

  const upcomingEvents = events
    .filter(e => new Date(e.eventDate) > new Date())
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 5);

  const teacherStats = [
    { title: 'Upcoming Events', value: upcomingEvents.length.toString(), icon: Calendar, color: 'success' as const },
    { title: 'Active Students', value: '0', icon: Users, color: 'primary' as const },
    { title: 'Certificates Issued', value: '0', icon: Award, color: 'warning' as const },
    { title: 'Club Activities', value: events.length.toString(), icon: TrendingUp, color: 'info' as const },
  ];

  if (isLoading) {
    return (
      <div className="ui-page">
        <PageHeader title={`Welcome, ${user?.designation || 'Professor'} ${user?.firstName ?? ''}!`} description="Loading your dashboard..." />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Spinner size="lg" label="Loading dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page">
      <PageHeader
        title={`Welcome, ${user?.designation || 'Professor'} ${user?.firstName ?? ''}!`}
        description="Faculty Dashboard - Oversee club activities and student engagement"
      />

      {/* Role Information */}
      {user?.roles && user.roles.length > 0 && (
        <div className="ui-card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, rgba(107,163,255,0.1) 0%, rgba(138,119,255,0.1) 100%)', border: '1px solid rgba(107,163,255,0.3)' }}>
          <div className="ui-card__body">
            <div className="ui-flex ui-flex-gap-3" style={{ alignItems: 'center' }}>
              <div style={{ padding: 14, borderRadius: 14, background: 'var(--gradient-primary)' }}>
                <Award size={24} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 4 }}>Your Club Roles</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {user.roles.map(role => (
                    <span key={role} className="chip" style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="ui-grid-4">
        {teacherStats.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <StatsCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="ui-card">
        <div className="ui-card__header"><h3 className="ui-card__title">Quick Access</h3></div>
        <div className="ui-card__body">
          <div className="ui-grid-4">
            {TEACHER_QUICK_ACTIONS.map(q => {
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

      {/* Upcoming Club Events */}
      <div className="ui-card">
        <div className="ui-card__header">
          <h3 className="ui-card__title">Upcoming Club Events</h3>
          <a href="/dashboard/events" className="ui-link">View All Events</a>
        </div>
        <div className="ui-card__body">
          {upcomingEvents.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>
              <Calendar size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>No upcoming club events</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcomingEvents.map((ev, i) => {
                const d = new Date(ev.eventDate);
                return (
                  <motion.div
                    key={ev._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '14px 18px', borderRadius: 12,
                      border: '1px solid var(--border)',
                      transition: 'all 0.18s', cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                    }}
                    onClick={() => window.location.href = `/dashboard/events/${ev._id}`}
                  >
                    <div style={{
                      width: 60, height: 60, borderRadius: 14, flexShrink: 0,
                      background: 'var(--gradient-primary)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1 }}>{d.getDate()}</span>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.85 }}>
                        {d.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: 4 }}>{ev.title}</div>
                      <div className="ui-text-xs ui-text-muted">{ev.venue}</div>
                    </div>
                    <span className="chip" style={{ fontSize: '0.75rem' }}>
                      {ev.stats?.totalRegistrations || 0} students
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Faculty Resources */}
      <div className="ui-card">
        <div className="ui-card__header"><h3 className="ui-card__title">Faculty Resources</h3></div>
        <div className="ui-card__body">
          <div className="ui-grid-3">
            <motion.div whileHover={{ y: -3 }}
              style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(107,163,255,0.1)', border: '1px solid rgba(107,163,255,0.3)' }}>
              <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 8, alignItems: 'center' }}>
                <FileText size={19} color="var(--accent)" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Constitution</span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                View club constitution and governance documents
              </p>
              <a href="/constitution" style={{
                display: 'inline-block', padding: '7px 14px', borderRadius: 10,
                background: 'var(--accent)', color: '#fff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
              }}>
                View Constitution
              </a>
            </motion.div>

            <motion.div whileHover={{ y: -3 }}
              style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 8, alignItems: 'center' }}>
                <Users size={19} color="#10b981" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>EC Members</span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                View current executive committee members
              </p>
              <a href="/ec-members" style={{
                display: 'inline-block', padding: '7px 14px', borderRadius: 10,
                background: '#10b981', color: '#fff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
              }}>
                View EC
              </a>
            </motion.div>

            <motion.div whileHover={{ y: -3 }}
              style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 8, alignItems: 'center' }}>
                <MessageSquare size={19} color="#f59e0b" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Notices</span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                View important club notices and announcements
              </p>
              <a href="/notices" style={{
                display: 'inline-block', padding: '7px 14px', borderRadius: 10,
                background: '#f59e0b', color: '#fff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
              }}>
                View Notices
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
