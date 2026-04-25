import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Clock, Search, Plus, Star, TrendingUp, DollarSign, Filter, Grid3x3, List } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatsCard } from '../../components/ui/StatsCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/utils';

type Event = {
  _id: string; title: string; description: string; shortDescription?: string;
  eventDate: string; endDate?: string; venue: string; category: string;
  tags: string[]; coverImage?: string; status: string; isFeatured: boolean;
  registrationRequired: boolean;
  registrationSettings?: { maxParticipants: number; registrationFee: number };
  stats?: { totalRegistrations: number };
  speakers?: Array<{ name: string; designation: string }>;
};

const CATS = ['Workshop','Seminar','Competition','Social','Cultural','Sports','Academic','Networking'];

function getStatusVariant(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'Ongoing') return 'success';
  if (status === 'Registration_Open') return 'warning';
  if (status === 'Cancelled') return 'error';
  return 'neutral';
}

export function ModernEventsPage() {
  const { user, token, loading } = useAuth();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', token],
    queryFn: () => apiRequest<Event[]>('/events', { token }),
    enabled: !loading,
  });

  const filtered = useMemo(() => {
    let list = events;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.title.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q) || e.tags?.some(t => t.toLowerCase().includes(q)));
    }
    if (category !== 'all') list = list.filter(e => e.category === category);
    if (statusFilter !== 'all') list = list.filter(e => e.status === statusFilter);
    const now = new Date();
    if (timeFilter === 'upcoming') list = list.filter(e => new Date(e.eventDate) > now);
    if (timeFilter === 'past')     list = list.filter(e => new Date(e.endDate || e.eventDate) < now);
    if (timeFilter === 'today')    list = list.filter(e => new Date(e.eventDate).toDateString() === now.toDateString());
    return list.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
    });
  }, [events, search, category, statusFilter, timeFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total:     events.length,
      upcoming:  events.filter(e => new Date(e.eventDate) > now).length,
      ongoing:   events.filter(e => e.status === 'Ongoing').length,
      completed: events.filter(e => e.status === 'Completed').length,
    };
  }, [events]);

  const canCreate = user?.roles.some(r => ['President','Vice President','General Secretary','AGS (Organization)','Moderator'].includes(r));

  return (
    <div className="ui-page">
      <PageHeader
        title="Events"
        description="Discover, register, and participate in club events, workshops, and competitions"
        actions={canCreate && <Button href="/dashboard/events/create" leftIcon={Plus}>Create Event</Button>}
      />

      {/* Stats */}
      <div className="ui-grid-4">
        <StatsCard title="Total Events" value={stats.total}     icon={Calendar}    color="primary" />
        <StatsCard title="Upcoming"     value={stats.upcoming}  icon={Clock}       color="warning" />
        <StatsCard title="Ongoing"      value={stats.ongoing}   icon={TrendingUp}  color="success" />
        <StatsCard title="Completed"    value={stats.completed} icon={Star}        color="info"    />
      </div>

      {/* Filters */}
      <div className="ui-card">
        <div className="ui-card__body">
          <div className="ui-flex ui-flex-gap-3" style={{ flexWrap: 'wrap' }}>
            {/* Search */}
            <div className="ui-input-row" style={{ flex: 1, minWidth: 200 }}>
              <span className="ui-input-icon"><Search size={15} /></span>
              <input
                className="ui-input ui-input--icon"
                placeholder="Search events…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" leftIcon={Filter} onClick={() => setShowFilters(v => !v)}>
              Filters
            </Button>
            <div className="ui-flex ui-flex-gap-2">
              <button
                className={`ui-btn ui-btn--sm ${view === 'grid' ? 'ui-btn--primary' : 'ui-btn--outline'}`}
                onClick={() => setView('grid')} title="Grid"
              >
                <Grid3x3 size={15} />
              </button>
              <button
                className={`ui-btn ui-btn--sm ${view === 'list' ? 'ui-btn--primary' : 'ui-btn--outline'}`}
                onClick={() => setView('list')} title="List"
              >
                <List size={15} />
              </button>
            </div>
          </div>

          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="ui-divider" />
              <div className="ui-grid-3">
                <div className="ui-input-wrap">
                  <label className="ui-input-label">Category</label>
                  <select className="ui-select" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="all">All Categories</option>
                    {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="ui-input-wrap">
                  <label className="ui-input-label">Time</label>
                  <select className="ui-select" value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
                    <option value="all">All Time</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="today">Today</option>
                    <option value="past">Past</option>
                  </select>
                </div>
                <div className="ui-input-wrap">
                  <label className="ui-input-label">Status</label>
                  <select className="ui-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="Planned">Planned</option>
                    <option value="Registration_Open">Registration Open</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Spinner size="lg" label="Loading events…" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="ui-card">
          <EmptyState
            icon={Calendar}
            title="No events found"
            description="Try adjusting your filters or search query"
            action={canCreate ? <Button href="/dashboard/events/create" leftIcon={Plus}>Create First Event</Button> : undefined}
          />
        </div>
      )}

      {/* Grid / List */}
      {!isLoading && filtered.length > 0 && (
        <>
          <div className={view === 'grid' ? 'ui-grid-3' : ''} style={view === 'list' ? { display: 'flex', flexDirection: 'column', gap: 14 } : {}}>
            {filtered.map((ev, i) => {
              const regPct = ev.registrationSettings?.maxParticipants
                ? Math.min(100, ((ev.stats?.totalRegistrations ?? 0) / ev.registrationSettings.maxParticipants) * 100)
                : 0;

              return (
                <motion.div
                  key={ev._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link to={`/dashboard/events/${ev._id}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div className="ui-card" style={{ padding: 0, cursor: 'pointer' }}>
                      {/* Cover */}
                      {ev.coverImage && (
                        <div style={{ position: 'relative', height: 160, overflow: 'hidden', borderRadius: '20px 20px 0 0' }}>
                          <img src={ev.coverImage} alt={ev.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} />
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />
                          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
                            {ev.isFeatured && <Badge variant="warning" icon={Star}>Featured</Badge>}
                          </div>
                          <div style={{ position: 'absolute', top: 10, right: 10 }}>
                            <Badge variant={getStatusVariant(ev.status)}>{ev.status.replace('_', ' ')}</Badge>
                          </div>
                        </div>
                      )}

                      <div style={{ padding: '16px 18px' }}>
                        {/* Category */}
                        <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
                          <Badge variant="primary">{ev.category}</Badge>
                          {ev.tags?.slice(0, 2).map(t => <Badge key={t} variant="neutral">#{t}</Badge>)}
                        </div>

                        {/* Title */}
                        <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}
                          className="ui-truncate">
                          {ev.title}
                        </h3>

                        {/* Desc */}
                        <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {ev.shortDescription || ev.description}
                        </p>

                        {/* Meta */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                          <div className="ui-flex ui-flex-gap-2 ui-text-xs ui-text-muted" style={{ alignItems: 'center' }}>
                            <Calendar size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            <span>{formatDate(ev.eventDate)}</span>
                          </div>
                          <div className="ui-flex ui-flex-gap-2 ui-text-xs ui-text-muted" style={{ alignItems: 'center' }}>
                            <MapPin size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            <span className="ui-truncate">{ev.venue}</span>
                          </div>
                          {ev.registrationRequired && (
                            <div className="ui-flex ui-flex-gap-2 ui-text-xs ui-text-muted" style={{ alignItems: 'center' }}>
                              <Users size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                              <span>
                                {ev.stats?.totalRegistrations ?? 0}
                                {ev.registrationSettings?.maxParticipants ? `/${ev.registrationSettings.maxParticipants}` : ''} registered
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Progress */}
                        {ev.registrationRequired && ev.registrationSettings?.maxParticipants && (
                          <div style={{ height: 4, background: 'var(--surface)', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
                            <div style={{ height: '100%', width: `${regPct}%`, background: 'var(--gradient-primary)', borderRadius: 999, transition: 'width 0.6s' }} />
                          </div>
                        )}

                        {/* Footer */}
                        <div className="ui-flex ui-flex-between">
                          {ev.registrationRequired && ev.registrationSettings?.registrationFee ? (
                            <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center', color: 'var(--accent)', fontWeight: 700, fontSize: '0.95rem' }}>
                              <DollarSign size={14} />৳{ev.registrationSettings.registrationFee}
                            </div>
                          ) : (
                            <Badge variant="success">Free</Badge>
                          )}
                          <span className="ui-link">View Details →</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <p className="ui-text-xs ui-text-muted" style={{ textAlign: 'center', padding: '8px 0' }}>
            Showing {filtered.length} of {events.length} events
          </p>
        </>
      )}
    </div>
  );
}
