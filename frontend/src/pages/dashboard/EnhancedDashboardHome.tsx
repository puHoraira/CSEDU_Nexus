import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Users, Calendar, Vote, Award, Clock, Bell, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatsCard } from '../../components/ui/StatsCard';
import { Spinner } from '../../components/ui/Spinner';
import { formatRelativeTime } from '../../lib/utils';

const QUICK = [
  { label: 'Create Event',   href: '/dashboard/events/create', icon: Calendar },
  { label: 'View Elections', href: '/dashboard/elections',     icon: Vote },
  { label: 'Certificates',   href: '/dashboard/certificates',  icon: Award },
  { label: 'Notifications',  href: '/dashboard/notifications', icon: Bell },
];

type DashboardStats = {
  totalMembers: number;
  upcomingEvents: number;
  activeElections: number;
  certificatesIssued: number;
};

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

export function EnhancedDashboardHome() {
  const { user, token, loading } = useAuth();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', token],
    queryFn: async () => {
      // Fetch multiple endpoints in parallel, with error handling
      const [eventsResult, electionsResult, membersResult] = await Promise.allSettled([
        apiRequest<Event[]>('/events', { token }),
        apiRequest<Election[]>('/elections', { token }),
        // Only fetch members if user has permission (handle 403 gracefully)
        user?.roles.some(r => ['President', 'Vice President', 'General Secretary', 'Moderator', 'Chief Patron'].includes(r))
          ? apiRequest<any[]>('/membership/members', { token })
          : Promise.resolve([]),
      ]);

      const events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
      const elections = electionsResult.status === 'fulfilled' ? electionsResult.value : [];
      const members = membersResult.status === 'fulfilled' ? membersResult.value : [];

      const now = new Date();
      const upcomingEvents = events.filter(e => new Date(e.eventDate) > now).length;
      const activeElections = elections.filter(e => e.status === 'Active').length;

      return {
        totalMembers: members.length,
        upcomingEvents,
        activeElections,
        certificatesIssued: 0, // This would need a certificates endpoint
      } as DashboardStats;
    },
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch recent events
  const { data: events = [], isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: queryKeys.events.all(token!),
    queryFn: () => apiRequest<Event[]>('/events', { token }),
    enabled: Boolean(token),
    retry: 1, // Only retry once for faster loading
  });

  // Fetch recent elections for activity
  const { data: elections = [], isLoading: electionsLoading, error: electionsError } = useQuery({
    queryKey: queryKeys.elections.all(token!),
    queryFn: () => apiRequest<Election[]>('/elections', { token }),
    enabled: Boolean(token),
    retry: 1, // Only retry once for faster loading
  });

  const isLoading = (statsLoading || eventsLoading || electionsLoading) && events.length === 0 && elections.length === 0;

  // Process data for display
  const upcomingEvents = events
    .filter(e => new Date(e.eventDate) > new Date())
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 3);

  const recentActivity = [
    ...events.slice(0, 2).map(e => ({
      id: e._id,
      title: 'New event created',
      desc: e.title,
      time: new Date().toISOString(), // Would need createdAt from API
      init: 'EV',
    })),
    ...elections.slice(0, 1).map(e => ({
      id: e._id,
      title: e.status === 'Active' ? 'Election voting started' : 'New election created',
      desc: e.name,
      time: e.startsOn,
      init: 'EC',
    })),
  ].slice(0, 3);

  const dashboardStats = stats ? [
    { title: 'Upcoming Events', value: stats.upcomingEvents.toString(), icon: Calendar, color: 'success' as const },
    { title: 'Active Elections', value: stats.activeElections.toString(), icon: Vote, color: 'warning' as const },
    ...(stats.totalMembers > 0 ? [{ title: 'Total Members', value: stats.totalMembers.toString(), icon: Users, color: 'primary' as const }] : []),
    { title: 'My Activities', value: (upcomingEvents.length + recentActivity.length).toString(), icon: Award, color: 'info' as const },
  ] : [
    // Fallback stats if main query fails
    { title: 'Upcoming Events', value: upcomingEvents.length.toString(), icon: Calendar, color: 'success' as const },
    { title: 'Active Elections', value: elections.filter(e => e.status === 'Active').length.toString(), icon: Vote, color: 'warning' as const },
    { title: 'My Activities', value: (upcomingEvents.length + recentActivity.length).toString(), icon: Award, color: 'info' as const },
  ];

  if (isLoading) {
    return (
      <div className="ui-page">
        <PageHeader
          title={`Welcome back, ${user?.firstName ?? 'there'}!`}
          description="Loading your dashboard..."
        />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Spinner size="lg" label="Loading dashboard data..." />
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page">
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? 'there'}!`}
        description="Here's what's happening with your club today."
      />

      {/* Show error message if some data failed to load, but continue showing dashboard */}
      {(eventsError || electionsError) && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', color: '#f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Some data couldn't be loaded. You may need additional permissions to view all dashboard information.
            </span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="ui-grid-4">
        {dashboardStats.map((s, i) => (
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

        {/* Recent Activity */}
        <div className="ui-card" style={{ padding: 0 }}>
          <div className="ui-card__header"><h3 className="ui-card__title">Recent Activity</h3></div>
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {recentActivity.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
                <Bell size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <p style={{ fontSize: '0.85rem' }}>No recent activity</p>
              </div>
            ) : (
              recentActivity.map((a, i) => (
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
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pending Actions */}
      <div className="ui-card">
        <div className="ui-card__header"><h3 className="ui-card__title">Quick Actions</h3></div>
        <div className="ui-card__body">
          <div className="ui-grid-3">
            <motion.div whileHover={{ y: -3 }}
              style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 8, alignItems: 'center' }}>
                <CheckCircle size={19} color="#10b981" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>All Set!</span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                Your dashboard is ready. Explore events, elections, and more!
              </p>
              <a href="/dashboard/events" style={{
                display: 'inline-block', padding: '7px 14px', borderRadius: 10,
                background: '#10b981', color: '#fff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
              }}>
                Explore Events
              </a>
            </motion.div>

            {stats && stats.activeElections > 0 && (
              <motion.div whileHover={{ y: -3 }}
                style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 8, alignItems: 'center' }}>
                  <Vote size={19} color="#f59e0b" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Active Voting</span>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                  {stats.activeElections} election{stats.activeElections > 1 ? 's are' : ' is'} waiting for your vote
                </p>
                <a href="/dashboard/elections" style={{
                  display: 'inline-block', padding: '7px 14px', borderRadius: 10,
                  background: '#f59e0b', color: '#fff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
                }}>
                  Vote Now
                </a>
              </motion.div>
            )}

            <motion.div whileHover={{ y: -3 }}
              style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(107,163,255,0.1)', border: '1px solid rgba(107,163,255,0.3)' }}>
              <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 8, alignItems: 'center' }}>
                <Award size={19} color="var(--accent)" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Certificates</span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                Request certificates for your participation and achievements
              </p>
              <a href="/dashboard/certificates" style={{
                display: 'inline-block', padding: '7px 14px', borderRadius: 10,
                background: 'var(--accent)', color: '#fff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
              }}>
                View Certificates
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
