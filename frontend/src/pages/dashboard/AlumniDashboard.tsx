import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, Award, Briefcase, GraduationCap, TrendingUp, MessageCircle, Heart } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatsCard } from '../../components/ui/StatsCard';
import { Spinner } from '../../components/ui/Spinner';

const ALUMNI_QUICK_ACTIONS = [
  { label: 'Alumni Portal', href: '/dashboard/alumni', icon: GraduationCap },
  { label: 'Club Events', href: '/dashboard/events', icon: Calendar },
  { label: 'Networking', href: '/dashboard/membership/roster', icon: Users },
  { label: 'My Profile', href: '/dashboard/profile', icon: Briefcase },
];

type Event = {
  _id: string;
  title: string;
  eventDate: string;
  venue: string;
  stats?: { totalRegistrations: number };
};

export function AlumniDashboard() {
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
    .slice(0, 4);

  const alumniStats = [
    { title: 'Upcoming Events', value: upcomingEvents.length.toString(), icon: Calendar, color: 'success' as const },
    { title: 'Network', value: '0', icon: Users, color: 'primary' as const },
    { title: 'Contributions', value: '0', icon: Heart, color: 'warning' as const },
    { title: 'Achievements', value: '0', icon: Award, color: 'info' as const },
  ];

  if (isLoading) {
    return (
      <div className="ui-page">
        <PageHeader title={`Welcome back, ${user?.firstName ?? 'Alumni'}!`} description="Loading your dashboard..." />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Spinner size="lg" label="Loading dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page">
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? 'Alumni'}!`}
        description="Alumni Dashboard - Stay connected with your alma mater"
      />

      {/* Alumni Welcome Banner */}
      <div className="ui-card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, rgba(138,119,255,0.1) 0%, rgba(107,163,255,0.1) 100%)', border: '1px solid rgba(138,119,255,0.3)' }}>
        <div className="ui-card__body">
          <div className="ui-flex ui-flex-gap-3" style={{ alignItems: 'center' }}>
            <div style={{ padding: 16, borderRadius: 16, background: 'var(--gradient-primary)' }}>
              <GraduationCap size={28} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                Welcome to the Alumni Network
              </div>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                Stay connected, mentor current students, and be part of shaping the future of CSEDU Club
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="ui-grid-4">
        {alumniStats.map((s, i) => (
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
            {ALUMNI_QUICK_ACTIONS.map(q => {
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

      {/* Engagement Opportunities */}
      <div className="ui-card">
        <div className="ui-card__header"><h3 className="ui-card__title">Get Involved</h3></div>
        <div className="ui-card__body">
          <div className="ui-grid-3">
            <motion.div whileHover={{ y: -3 }}
              style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(107,163,255,0.1)', border: '1px solid rgba(107,163,255,0.3)' }}>
              <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 8, alignItems: 'center' }}>
                <Users size={19} color="var(--accent)" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Mentorship</span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                Share your experience and guide current students
              </p>
              <a href="/dashboard/alumni" style={{
                display: 'inline-block', padding: '7px 14px', borderRadius: 10,
                background: 'var(--accent)', color: '#fff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
              }}>
                Become a Mentor
              </a>
            </motion.div>

            <motion.div whileHover={{ y: -3 }}
              style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 8, alignItems: 'center' }}>
                <MessageCircle size={19} color="#10b981" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Guest Speaking</span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                Share insights at club events and workshops
              </p>
              <a href="/dashboard/alumni" style={{
                display: 'inline-block', padding: '7px 14px', borderRadius: 10,
                background: '#10b981', color: '#fff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
              }}>
                Express Interest
              </a>
            </motion.div>

            <motion.div whileHover={{ y: -3 }}
              style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 8, alignItems: 'center' }}>
                <Briefcase size={19} color="#f59e0b" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Recruitment</span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                Connect students with career opportunities
              </p>
              <a href="/dashboard/alumni" style={{
                display: 'inline-block', padding: '7px 14px', borderRadius: 10,
                background: '#f59e0b', color: '#fff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
              }}>
                Post Opportunities
              </a>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Upcoming Club Events */}
      {upcomingEvents.length > 0 && (
        <div className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title">Upcoming Club Events</h3>
            <a href="/dashboard/events" className="ui-link">View All</a>
          </div>
          <div className="ui-card__body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {upcomingEvents.map((ev, i) => {
                const d = new Date(ev.eventDate);
                return (
                  <motion.div
                    key={ev._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      padding: '16px', borderRadius: 14,
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
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: 8 }}>{ev.title}</div>
                    <div className="ui-text-xs ui-text-muted" style={{ marginBottom: 8 }}>
                      {d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="ui-text-xs ui-text-muted">{ev.venue}</div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Complete Profile CTA */}
      <div className="ui-card">
        <div className="ui-card__body">
          <motion.div whileHover={{ y: -3 }}
            style={{ padding: '20px 24px', borderRadius: 16, background: 'linear-gradient(135deg, rgba(138,119,255,0.15) 0%, rgba(107,163,255,0.15) 100%)', border: '1px solid rgba(138,119,255,0.4)' }}>
            <div className="ui-flex" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 8, alignItems: 'center' }}>
                  <TrendingUp size={20} color="var(--accent)" />
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>Complete Your Alumni Profile</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                  Update your career information, achievements, and connect with fellow alumni
                </p>
              </div>
              <a href="/dashboard/profile" style={{
                display: 'inline-block', padding: '10px 20px', borderRadius: 12,
                background: 'var(--gradient-primary)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 4px 12px var(--accent-glow)',
              }}>
                Update Profile
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
