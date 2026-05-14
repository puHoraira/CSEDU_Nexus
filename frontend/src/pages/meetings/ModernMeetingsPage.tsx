import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Video, Clock, Plus, CheckCircle, XCircle, Search, List, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatsCard } from '../../components/ui/StatsCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { formatDateTime } from '../../lib/utils';

type Meeting = {
  _id: string; roomId?: string; meetingMode: string; title: string;
  agenda: string; meetingDate: string; venue: string; status: string;
  participants?: Array<{ userId: string; name: string }>;
};

type StatusCfg = { label: string; variant: 'success' | 'warning' | 'error' | 'neutral'; icon: any; color: string };
const STATUS: Record<string, StatusCfg> = {
  Scheduled: { label: 'Scheduled', variant: 'warning',  icon: Clock,        color: '#f59e0b' },
  Ongoing:   { label: 'Ongoing',   variant: 'success',  icon: Video,        color: '#10b981' },
  Completed: { label: 'Completed', variant: 'neutral',  icon: CheckCircle,  color: '#94a3b8' },
  Cancelled: { label: 'Cancelled', variant: 'error',    icon: XCircle,      color: '#ef4444' },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function CalendarView({ meetings }: { meetings: Meeting[] }) {
  const today = new Date();
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year  = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map meetings to day numbers
  const meetingsByDay = useMemo(() => {
    const map: Record<number, Meeting[]> = {};
    meetings.forEach(m => {
      const d = new Date(m.meetingDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(m);
      }
    });
    return map;
  }, [meetings, year, month]);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="ui-card" style={{ padding: 0 }}>
      {/* Calendar header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setCurrent(new Date(year, month - 1, 1))}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={16} />
        </button>
        <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
          {MONTHS[month]} {year}
        </h3>
        <button
          onClick={() => setCurrent(new Date(year, month + 1, 1))}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
        {DAYS.map(d => (
          <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((day, i) => {
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const dayMeetings = day ? (meetingsByDay[day] ?? []) : [];
          return (
            <div key={i} style={{
              minHeight: 80, padding: '6px 8px',
              borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
              borderBottom: i < cells.length - 7 ? '1px solid var(--border)' : 'none',
              background: isToday ? 'rgba(107,163,255,0.06)' : 'transparent',
            }}>
              {day && (
                <>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.82rem', fontWeight: isToday ? 800 : 500,
                    background: isToday ? 'var(--gradient-primary)' : 'transparent',
                    color: isToday ? '#fff' : 'var(--text)',
                    marginBottom: 4,
                  }}>
                    {day}
                  </div>
                  {dayMeetings.slice(0, 2).map(m => {
                    const cfg = STATUS[m.status] ?? STATUS.Scheduled;
                    return (
                      <a key={m._id} href={`/dashboard/meetings/${m._id}`} style={{ textDecoration: 'none', display: 'block' }}>
                        <div style={{
                          fontSize: '0.68rem', fontWeight: 600, padding: '2px 6px', borderRadius: 6, marginBottom: 2,
                          background: `${cfg.color}22`, color: cfg.color,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {m.title}
                        </div>
                      </a>
                    );
                  })}
                  {dayMeetings.length > 2 && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', paddingLeft: 6 }}>+{dayMeetings.length - 2} more</div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ModernMeetingsPage() {
  const { token, user, loading } = useAuth();
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [modeFilter, setMode]       = useState('all');
  const [view, setView]             = useState<'list' | 'calendar'>('list');

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: queryKeys.meetings.all(token!),
    queryFn: () => apiRequest<Meeting[]>('/meetings', { token }),
    enabled: Boolean(token),
  });

  const canCreate = user?.roles.some(r => ['President', 'General Secretary'].includes(r));

  const filtered = useMemo(() => {
    let list = meetings;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m => m.title.toLowerCase().includes(q) || m.agenda?.toLowerCase().includes(q) || m.venue.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') list = list.filter(m => m.status === statusFilter);
    if (modeFilter !== 'all') {
      list = list.filter(m => (m.meetingMode || (m.roomId ? 'Online' : 'Offline')) === modeFilter);
    }
    return list.sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime());
  }, [meetings, search, statusFilter, modeFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total:     meetings.length,
      upcoming:  meetings.filter(m => new Date(m.meetingDate) > now && m.status === 'Scheduled').length,
      ongoing:   meetings.filter(m => m.status === 'Ongoing').length,
      completed: meetings.filter(m => m.status === 'Completed').length,
    };
  }, [meetings]);

  return (
    <div className="ui-page">
      <PageHeader
        title="Meetings"
        description="Schedule, manage, and join committee meetings"
        actions={canCreate && <Button href="/dashboard/meetings/create" leftIcon={Plus}>Schedule Meeting</Button>}
      />

      {/* Stats */}
      <div className="ui-grid-4">
        <StatsCard title="Total Meetings" value={stats.total}     icon={Calendar}    color="primary" />
        <StatsCard title="Upcoming"       value={stats.upcoming}  icon={Clock}       color="warning" />
        <StatsCard title="Ongoing"        value={stats.ongoing}   icon={Video}       color="success" />
        <StatsCard title="Completed"      value={stats.completed} icon={CheckCircle} color="info"    />
      </div>

      {/* Filters */}
      <div className="ui-card">
        <div className="ui-card__body">
          <div className="ui-flex ui-flex-gap-3" style={{ flexWrap: 'wrap' }}>
            <div className="ui-input-row" style={{ flex: 2, minWidth: 200 }}>
              <span className="ui-input-icon"><Search size={15} /></span>
              <input className="ui-input ui-input--icon" placeholder="Search meetings…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="ui-select" style={{ flex: 1, minWidth: 140 }} value={statusFilter} onChange={e => setStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <select className="ui-select" style={{ flex: 1, minWidth: 130 }} value={modeFilter} onChange={e => setMode(e.target.value)}>
              <option value="all">All Modes</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
            {/* View toggle */}
            <div className="ui-flex ui-flex-gap-2">
              <button className={`ui-btn ui-btn--sm ${view === 'list' ? 'ui-btn--primary' : 'ui-btn--outline'}`} onClick={() => setView('list')} title="List view">
                <List size={15} />
              </button>
              <button className={`ui-btn ui-btn--sm ${view === 'calendar' ? 'ui-btn--primary' : 'ui-btn--outline'}`} onClick={() => setView('calendar')} title="Calendar view">
                <CalendarDays size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Spinner size="lg" label="Loading meetings…" />
        </div>
      )}

      {/* Calendar view */}
      {!isLoading && view === 'calendar' && (
        <CalendarView meetings={meetings} />
      )}

      {/* Empty */}
      {!isLoading && view === 'list' && filtered.length === 0 && (
        <div className="ui-card">
          <EmptyState
            icon={Calendar}
            title="No meetings found"
            description={search || statusFilter !== 'all' || modeFilter !== 'all' ? 'Try adjusting your filters' : 'Schedule your first meeting to get started'}
            action={canCreate ? <Button href="/dashboard/meetings/create" leftIcon={Plus}>Schedule Meeting</Button> : undefined}
          />
        </div>
      )}

      {/* List */}
      {!isLoading && view === 'list' && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map((m, i) => {
            const mode = m.meetingMode || (m.roomId ? 'Online' : 'Offline');
            const cfg  = STATUS[m.status] ?? STATUS.Scheduled;
            const StatusIcon = cfg.icon;
            const d = new Date(m.meetingDate);

            return (
              <motion.div key={m._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="ui-card" style={{ padding: 0 }}>
                  <div style={{ display: 'flex', gap: 20, padding: '18px 22px', flexWrap: 'wrap' }}>
                    {/* Date badge */}
                    <div style={{
                      width: 64, height: 64, borderRadius: 16, flexShrink: 0,
                      background: 'var(--gradient-primary)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>{d.getDate()}</span>
                      <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', opacity: 0.85 }}>
                        {d.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ui-flex ui-flex-between" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{m.title}</h3>
                        <div className="ui-flex ui-flex-gap-2">
                          <Badge variant={cfg.variant} icon={StatusIcon}>{cfg.label}</Badge>
                          <Badge variant={mode === 'Online' ? 'primary' : 'neutral'}>{mode}</Badge>
                          {m.roomId && <Badge variant="neutral">Room: {m.roomId}</Badge>}
                        </div>
                      </div>

                      {m.agenda && (
                        <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {m.agenda}
                        </p>
                      )}

                      <div className="ui-flex ui-flex-gap-4 ui-text-xs ui-text-muted" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                        <span className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
                          <Clock size={12} style={{ color: 'var(--accent)' }} /> {formatDateTime(m.meetingDate)}
                        </span>
                        <span className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
                          <MapPin size={12} style={{ color: 'var(--accent)' }} /> {m.venue}
                        </span>
                        {m.participants && m.participants.length > 0 && (
                          <span className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
                            <Users size={12} style={{ color: 'var(--accent)' }} /> {m.participants.length} participants
                          </span>
                        )}
                      </div>

                      <div className="ui-flex ui-flex-gap-2" style={{ flexWrap: 'wrap' }}>
                        <Button variant="outline" size="sm" href={`/dashboard/meetings/${m._id}`}>View Details</Button>
                        {mode === 'Online' && m.roomId && m.status !== 'Completed' && (
                          <Button variant="primary" size="sm" href={`/dashboard/meetings/${m._id}/room`} leftIcon={Video}>Join Room</Button>
                        )}
                        {canCreate && m.status === 'Scheduled' && (
                          <Button variant="ghost" size="sm" href={`/dashboard/meetings/${m._id}/attendance`}>Manage Attendance</Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          <p className="ui-text-xs ui-text-muted" style={{ textAlign: 'center', padding: '4px 0' }}>
            Showing {filtered.length} of {meetings.length} meetings
          </p>
        </div>
      )}
    </div>
  );
}
