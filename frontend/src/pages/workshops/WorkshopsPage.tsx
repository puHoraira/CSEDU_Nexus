import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BookOpen, Calendar, MapPin, Users, DollarSign,
  Clock, Search, Plus, Star, Filter, Video, Tag
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatsCard } from '../../components/ui/StatsCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/utils';
import { Link } from 'react-router-dom';

type Workshop = {
  _id: string; title: string; shortDescription?: string; description: string;
  startDate: string; endDate: string; venue: string; isOnline: boolean;
  category: string; level: string; tags: string[];
  capacity: number; isFree: boolean; fee: number; coverImage?: string;
  status: string; speakers: Array<{ name: string; designation?: string; avatarUrl?: string }>;
  stats: { totalRegistrations: number; totalApproved: number };
  createdBy: { firstName: string; lastName: string };
};

const CATEGORIES = ['Technical', 'Soft Skills', 'Research', 'Career', 'Creative', 'Other'];
const LEVELS     = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'neutral' | 'primary'> = {
  Published:            'primary',
  Registration_Open:    'success',
  Registration_Closed:  'warning',
  Ongoing:              'success',
  Completed:            'neutral',
  Cancelled:            'error',
  Draft:                'neutral',
};

const canManage = (roles: string[]) =>
  roles.some(r => ['President', 'Vice President', 'General Secretary', 'AGS (Organization)', 'Moderator'].includes(r));

export function WorkshopsPage() {
  const { user, token, loading } = useAuth();
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: workshops = [], isLoading } = useQuery({
    queryKey: ['workshops', token],
    queryFn: () => apiRequest<Workshop[]>('/workshops', { token }),
    enabled: Boolean(token),
  });

  const filtered = useMemo(() => {
    let list = workshops;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(w => w.title.toLowerCase().includes(q) || w.description.toLowerCase().includes(q));
    }
    if (category !== 'all') list = list.filter(w => w.category === category);
    return list;
  }, [workshops, search, category]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total:    workshops.length,
      upcoming: workshops.filter(w => new Date(w.startDate) > now).length,
      open:     workshops.filter(w => w.status === 'Registration_Open').length,
      free:     workshops.filter(w => w.isFree).length,
    };
  }, [workshops]);

  const isManager = user ? canManage(user.roles) : false;

  return (
    <div className="ui-page">
      <PageHeader
        title="Workshops"
        description="Skill-building workshops, seminars, and hands-on training sessions"
        actions={isManager && <Button href="/dashboard/workshops/create" leftIcon={Plus}>Create Workshop</Button>}
      />

      {/* Stats */}
      <div className="ui-grid-4">
        <StatsCard title="Total Workshops" value={stats.total}    icon={BookOpen}  color="primary" />
        <StatsCard title="Upcoming"         value={stats.upcoming} icon={Calendar}  color="warning" />
        <StatsCard title="Open Registration" value={stats.open}   icon={Users}     color="success" />
        <StatsCard title="Free Workshops"   value={stats.free}    icon={Star}      color="info"    />
      </div>

      {/* Filters */}
      <div className="ui-card">
        <div className="ui-card__body">
          <div className="ui-flex ui-flex-gap-3" style={{ flexWrap: 'wrap' }}>
            <div className="ui-input-row" style={{ flex: 1, minWidth: 200 }}>
              <span className="ui-input-icon"><Search size={15} /></span>
              <input className="ui-input ui-input--icon" placeholder="Search workshops…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" leftIcon={Filter} onClick={() => setShowFilters(v => !v)}>
              Filters
            </Button>
          </div>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ overflow: 'hidden' }}>
              <div className="ui-divider" />
              <div className="ui-grid-2">
                <div className="ui-input-wrap">
                  <label className="ui-input-label">Category</label>
                  <select className="ui-select" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="all">All Categories</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}><Spinner size="lg" /></div>}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="ui-card">
          <EmptyState icon={BookOpen} title="No workshops found"
            description="Check back later or adjust your filters"
            action={isManager ? <Button href="/dashboard/workshops/create" leftIcon={Plus}>Create Workshop</Button> : undefined} />
        </div>
      )}

      {/* Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="ui-grid-3">
          {filtered.map((w, i) => {
            const spotsLeft = w.capacity - w.stats.totalRegistrations;
            const isFull    = spotsLeft <= 0;
            return (
              <motion.div key={w._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/dashboard/workshops/${w._id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="ui-card" style={{ padding: 0, cursor: 'pointer', height: '100%' }}>
                    {/* Cover */}
                    <div style={{
                      height: 160, overflow: 'hidden', borderRadius: '20px 20px 0 0',
                      background: w.coverImage ? 'transparent' : 'var(--gradient-primary)',
                      position: 'relative',
                    }}>
                      {w.coverImage
                        ? <img src={w.coverImage} alt={w.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <BookOpen size={48} color="rgba(255,255,255,0.6)" />
                          </div>
                        )
                      }
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />
                      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
                        <Badge variant={STATUS_VARIANT[w.status] ?? 'neutral'}>{w.status.replace('_', ' ')}</Badge>
                        {w.isOnline && <Badge variant="primary" icon={Video}>Online</Badge>}
                      </div>
                      <div style={{ position: 'absolute', top: 12, right: 12 }}>
                        {w.isFree
                          ? <Badge variant="success">Free</Badge>
                          : <Badge variant="warning">৳{w.fee}</Badge>
                        }
                      </div>
                    </div>

                    <div style={{ padding: '16px 18px' }}>
                      {/* Category + Level */}
                      <div className="ui-flex ui-flex-gap-2" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
                        <Badge variant="primary">{w.category}</Badge>
                        <Badge variant="neutral">{w.level}</Badge>
                      </div>

                      {/* Title */}
                      <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}
                        className="ui-truncate">
                        {w.title}
                      </h3>

                      {/* Description */}
                      <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {w.shortDescription || w.description}
                      </p>

                      {/* Meta */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                        <div className="ui-flex ui-flex-gap-2 ui-text-xs ui-text-muted" style={{ alignItems: 'center' }}>
                          <Calendar size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                          <span>{formatDate(w.startDate)}</span>
                        </div>
                        <div className="ui-flex ui-flex-gap-2 ui-text-xs ui-text-muted" style={{ alignItems: 'center' }}>
                          <MapPin size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                          <span className="ui-truncate">{w.isOnline ? 'Online' : w.venue}</span>
                        </div>
                        <div className="ui-flex ui-flex-gap-2 ui-text-xs ui-text-muted" style={{ alignItems: 'center' }}>
                          <Users size={12} style={{ color: isFull ? '#ef4444' : 'var(--accent)', flexShrink: 0 }} />
                          <span style={{ color: isFull ? '#ef4444' : 'inherit' }}>
                            {isFull ? 'Full' : `${spotsLeft} spots left`} / {w.capacity}
                          </span>
                        </div>
                      </div>

                      {/* Capacity bar */}
                      <div style={{ height: 4, background: 'var(--surface)', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
                        <div style={{
                          height: '100%', borderRadius: 999,
                          width: `${Math.min(100, (w.stats.totalRegistrations / w.capacity) * 100)}%`,
                          background: isFull ? '#ef4444' : 'var(--gradient-primary)',
                          transition: 'width 0.6s',
                        }} />
                      </div>

                      {/* Speakers */}
                      {w.speakers.length > 0 && (
                        <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center', marginBottom: 12 }}>
                          <div style={{ display: 'flex' }}>
                            {w.speakers.slice(0, 3).map((s, si) => (
                              <div key={si} style={{
                                width: 26, height: 26, borderRadius: '50%', overflow: 'hidden',
                                border: '2px solid var(--panel-strong)',
                                background: 'var(--gradient-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: '0.65rem', fontWeight: 700,
                                marginLeft: si > 0 ? -8 : 0,
                              }}>
                                {s.avatarUrl ? <img src={s.avatarUrl} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.name.charAt(0)}
                              </div>
                            ))}
                          </div>
                          <span className="ui-text-xs ui-text-muted">
                            {w.speakers[0].name}{w.speakers.length > 1 ? ` +${w.speakers.length - 1}` : ''}
                          </span>
                        </div>
                      )}

                      <div className="ui-flex ui-flex-between">
                        <span className="ui-text-xs ui-text-muted">By {w.createdBy.firstName} {w.createdBy.lastName}</span>
                        <span className="ui-link">View Details →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
