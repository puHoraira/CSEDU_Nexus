import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Vote, Award, BookOpen, Users, Clock, Bell, TrendingUp } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatsCard } from '../../components/ui/StatsCard';
import { Spinner } from '../../components/ui/Spinner';
import { formatRelativeTime } from '../../lib/utils';

const STUDENT_QUICK_ACTIONS = [
  { label: 'View Events', href: '/dashboard/events', icon: Calendar },
  { label: 'Vote in Elections', href: '/dashboard/elections', icon: Vote },
  { label: 'My Certificates', href: '/dashboard/certificates', icon: Award },
  { label: 'Browse Workshops', href: '/dashboard/workshops', icon: BookOpen },
];

type Event = {
  _id: string;
  title: string;
  eventDate: string;
  venue: string;
  stats?: { totalRegistrations: number };
};

type Election = {
  _id: string;
  name: string;
  status: string;
  startsOn: string;
  endsOn: string;
};

export function StudentDashboard() {
  const { user, token } = useAuth();

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: queryKeys.events.all(token!),
    queryFn: () => apiRequest<Event[]>('/events', { token }),
    enabled: Boolean(token),
  });

  const { data: elections = [], isLoading: electionsLoading } = useQuery({
    queryKey: queryKeys.elections.all(token!),
    queryFn: () => apiRequest<Election[]>('/elections', { token }),
    enabled: Boolean(token),
  });

  const isLoading = eventsLoading && electionsLoading;

  const upcomingEvents = events
    .filter(e => new Date(e.eventDate) > new Date())
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 3);

  const activeElections = elections.filter(e => e.status === 'Active');

  const studentStats = [
    { title: 'Upcoming Events', value: upcomingEvents.length.toString(), icon: Calendar, color: 'success' as const },
    { title: 'Active Elections', value: activeElections.length.toString(), icon: Vote, color: 'warning' as const },
    { title: 'My Certificates', value: '0', icon: Award, color: 'primary' as const },
    { title: 'Workshops', value: '0', icon: BookOpen, color: 'info' as const },
  ];

  if (isLoading) {
    return (
      <div className="ui-page">
        <PageHeader title={`Welcome back, ${user?.firstName ?? 'Student'}!`} description="Loading your dashboard..." />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Spinner size="lg" label="Loading dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page">
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? 'Student'}!`}
        description={user?.membership?.studentId ? `Student ID: ${user.membership.studentId} | Batch: ${user.membership.batch}` : "Your student dashboard"}
      />

      {/* Stats */}
      <div className="ui-grid-4">
        {studentStats.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <StatsCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* Academic Info */}
      {user?.membership && (
        <div className="ui-card">
          <div className="ui-card__header"><h3 className="ui-card__title">Academic Information</h3></div>
          <div className="ui-card__body">
            <div className="ui-grid-3">
              <div style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center', marginBottom: 6 }}>
                  <Users size={16} color="var(--accent)" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Current Year</span>
                </div>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>Year {user.membership.currentYear}</span>
              </div>
              <div style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center', marginBottom: 6 }}>
                  <TrendingUp size={16} color="#10b981" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Membership Status</span>
                </div>
                <span style={{ fontSize: '1.15rem', fontWeight: 700, color: user.membership.status === 'Active' ? '#10b981' : 'var(--text)' }}>
                  {user.membership.status}
                </span>
              </div>
              <div style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center', marginBottom: 6 }}>
                  <Vote size={16} color="#f59e0b" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Voting Eligibility</span>
                </div>
                <span style={{ fontSize: '1.15rem', fontWeight: 700, color: user.membership.isEligibleForVoting ? '#10b981' : '#ef4444' }}>
                  {user.membership.isEligibleForVoting ? 'Eligible' : 'Not Eligible'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="ui-card">
        <div className="ui-card__header"><h3 className="ui-card__title">Quick Actions</h3></div>
        <div className="ui-card__body">
          <div className="ui-grid-4">
            {STUDENT_QUICK_ACTIONS.map(q => {
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

      {/* Upcoming Events */}
      <div className="ui-card" style={{ padding: 0 }}>
        <div className="ui-card__header">
          <h3 className="ui-card__title">Upcoming Events</h3>
          <a href="/dashboard/events" className="ui-link">View All</a>
        </div>
        {upcomingEvents.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>
            <Calendar size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>No upcoming events</p>
          </div>
        ) : (
          upcomingEvents.map((ev, i) => {
            const d = new Date(ev.eventDate);
            return (
              <motion.div
                key={ev._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 22px',
                  borderBottom: i < upcomingEvents.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.18s', cursor: 'pointer',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                onClick={() => window.location.href = `/dashboard/events/${ev._id}`}
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
                    <span className="ui-truncate">{ev.venue}</span>
                  </div>
                </div>
                <span className="chip" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                  {ev.stats?.totalRegistrations || 0} registered
                </span>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Active Elections Alert */}
      {activeElections.length > 0 && (
        <div className="ui-card">
          <div className="ui-card__body">
            <motion.div whileHover={{ y: -3 }}
              style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 8, alignItems: 'center' }}>
                <Vote size={19} color="#f59e0b" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Active Elections</span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                {activeElections.length} election{activeElections.length > 1 ? 's are' : ' is'} currently active. Cast your vote now!
              </p>
              <a href="/dashboard/elections" style={{
                display: 'inline-block', padding: '7px 14px', borderRadius: 10,
                background: '#f59e0b', color: '#fff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
              }}>
                Vote Now
              </a>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
