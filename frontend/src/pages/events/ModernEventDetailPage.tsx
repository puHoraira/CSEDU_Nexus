import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Users, DollarSign, Star, Bell, BellOff, MessageCircle, Clock, Heart, Plus, Image, Edit2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Countdown } from '../../components/ui/Countdown';
import { CommunityFeed } from '../../components/feed/CommunityFeed';
import { formatDateTime } from '../../lib/utils';
import { usePosterGenerator } from '../../hooks/usePosterGenerator';
import toast from 'react-hot-toast';

type Event = {
  _id: string; title: string; description: string; shortDescription?: string;
  eventDate: string; endDate?: string; venue: string; category: string;
  tags: string[]; coverImage?: string; status: string; isFeatured: boolean;
  registrationRequired: boolean;
  registrationSettings?: { maxParticipants: number; registrationFee: number };
  stats?: { totalRegistrations: number; totalAttendees: number; totalVolunteers: number; totalPosts: number; totalFollowers: number };
  speakers?: Array<{ name: string; designation: string; organization?: string }>;
  followers: string[];
  createdBy: { _id: string; firstName: string; lastName: string; avatarUrl?: string };
  volunteerProgram?: { positions: Array<{ name: string; slots: number; description: string }> };
};
type VolEligibility = {
  isEligible: boolean;
  existingApplication?: { status: string };
  availablePositions?: Array<{ name: string; slots: number; description: string }>;
};

function Avatar({ src, name, size = 36 }: { src?: string; name: string; size?: number }) {
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.33,
    }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  );
}

export function ModernEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token, loading } = useAuth();
  const qc = useQueryClient();
  const { openPosterGenerator, PosterModal } = usePosterGenerator();

  const [showVolForm, setShowVolForm]   = useState(false);
  const [volForm, setVolForm]           = useState({ preferredPositions: [] as string[], availability: '', message: '' });

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id, token],
    queryFn: () => apiRequest<Event>(`/events/${id}`, { token }),
    enabled: Boolean(id && token),
  });
  const { data: eligibility } = useQuery({
    queryKey: ['vol-eligibility', id, token],
    queryFn: () => apiRequest<VolEligibility>(`/events/${id}/volunteer-eligibility`, { token }),
    enabled: Boolean(id && token),
  });

  const followMut = useMutation({
    mutationFn: (following: boolean) => apiRequest(`/events/${id}/follow`, { method: following ? 'DELETE' : 'POST', token }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event', id] }); toast.success('Updated'); },
    onError: e => toast.error(normalizeApiError(e)),
  });
  const volMut = useMutation({
    mutationFn: () => apiRequest(`/events/${id}/volunteer-applications`, { method: 'POST', token, body: JSON.stringify(volForm) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vol-eligibility', id] }); setShowVolForm(false); toast.success('Application submitted'); },
    onError: e => toast.error(normalizeApiError(e)),
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '72px 0' }}><Spinner size="xl" label="Loading event…" /></div>;
  if (!event)   return <EmptyState icon={Calendar} title="Event not found" action={<Button href="/dashboard/events">Back to Events</Button>} />;

  const isFollowing = event.followers?.includes(user?.id ?? '');
  const canPost = user?.roles.some(r => ['President','Vice President','General Secretary','AGS (Organization)','Moderator'].includes(r)) || event.createdBy._id === user?.id;
  const canEdit = user?.roles.some(r => ['President','Vice President','General Secretary','AGS (Organization)','Moderator'].includes(r)) || event.createdBy._id === user?.id;
  const regPct  = event.registrationSettings?.maxParticipants
    ? Math.min(100, ((event.stats?.totalRegistrations ?? 0) / event.registrationSettings.maxParticipants) * 100) : 0;

  return (
    <div className="ui-page">
      <PageHeader
        title={event.title}
        description={event.shortDescription}
        backButton
        breadcrumbs={[{ label: 'Events', href: '/dashboard/events' }, { label: event.title }]}
        actions={canEdit && (
          <Button variant="outline" leftIcon={Edit2} href={`/dashboard/events/${id}/edit`}>
            Edit Event
          </Button>
        )}
      />

      {/* Hero */}
      {event.coverImage && (
        <div style={{ position: 'relative', height: 280, borderRadius: 20, overflow: 'hidden' }}>
          <img src={event.coverImage} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }} />
          <div style={{ position: 'absolute', bottom: 18, left: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge variant="neutral" style={{ backdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
              {event.category}
            </Badge>
            {event.isFeatured && <Badge variant="warning" icon={Star}>Featured</Badge>}
            {event.tags?.slice(0, 3).map(t => (
              <Badge key={t} variant="neutral" style={{ backdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
                #{t}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Countdown timer — only for upcoming events */}
      {new Date(event.eventDate) > new Date() && (
        <Countdown targetDate={event.eventDate} label="Event starts in" />
      )}

      {/* Two-column layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'minmax(0,1.6fr) minmax(280px,1fr)', 
        gap: 20, 
        alignItems: 'start' 
      }} 
      className="event-detail-layout">
        {/* ── Main ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          {/* About */}
          <div className="ui-card">
            <div className="ui-card__header"><h3 className="ui-card__title">About This Event</h3></div>
            <div className="ui-card__body">
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{event.description}</p>
            </div>
          </div>

          {/* Speakers */}
          {event.speakers && event.speakers.length > 0 && (
            <div className="ui-card">
              <div className="ui-card__header"><h3 className="ui-card__title">Speakers</h3></div>
              <div className="ui-card__body">
                <div className="ui-grid-2">
                  {event.speakers.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                        {s.name.charAt(0)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }} className="ui-truncate">{s.name}</p>
                        <p className="ui-text-xs ui-text-muted ui-truncate">{s.designation}</p>
                        {s.organization && <p className="ui-text-xs ui-text-muted ui-truncate">{s.organization}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Community: announcements + discussion (with images) ── */}
          <CommunityFeed
            baseUrl={`/events/${id}`}
            queryKey={['event-feed', id, token ?? undefined]}
            token={token}
            user={user}
            canAnnounce={canPost}
            canDiscuss={true}
            discussionHint="Open to all participants"
          />
        </div>

        {/* ── Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {/* Event Details */}
          <div className="ui-card">
            <div className="ui-card__header"><h3 className="ui-card__title">Event Details</h3></div>
            <div className="ui-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: Calendar, label: 'Date & Time', value: formatDateTime(event.eventDate) },
                { icon: MapPin,   label: 'Venue',       value: event.venue },
                ...(event.registrationRequired ? [{ icon: DollarSign, label: 'Registration Fee', value: event.registrationSettings?.registrationFee ? `৳${event.registrationSettings.registrationFee}` : 'Free' }] : []),
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ padding: 8, borderRadius: 10, background: 'var(--surface)', color: 'var(--accent)', flexShrink: 0 }}>
                      <Icon size={15} />
                    </div>
                    <div>
                      <p className="ui-text-xs ui-text-muted" style={{ margin: '0 0 2px' }}>{item.label}</p>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{item.value}</p>
                    </div>
                  </div>
                );
              })}

              {/* Progress */}
              {event.registrationRequired && event.registrationSettings?.maxParticipants && (
                <div>
                  <div className="ui-flex ui-flex-between ui-text-xs ui-text-muted" style={{ marginBottom: 5 }}>
                    <span>{event.stats?.totalRegistrations ?? 0} registered</span>
                    <span>{event.registrationSettings.maxParticipants} max</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--surface)', borderRadius: 999, overflow: 'hidden' }}>
                    <motion.div style={{ height: '100%', background: 'var(--gradient-primary)', borderRadius: 999 }}
                      initial={{ width: 0 }} animate={{ width: `${regPct}%` }} transition={{ duration: 0.8 }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="ui-card">
            <div className="ui-card__header"><h3 className="ui-card__title">Statistics</h3></div>
            <div className="ui-card__body">
              <div className="ui-grid-2">
                {[
                  { label: 'Followers',     value: event.stats?.totalFollowers ?? 0,     icon: Heart },
                  { label: 'Registrations', value: event.stats?.totalRegistrations ?? 0, icon: Users },
                  { label: 'Volunteers',    value: event.stats?.totalVolunteers ?? 0,    icon: Clock },
                  { label: 'Posts',         value: event.stats?.totalPosts ?? 0,         icon: MessageCircle },
                ].map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} style={{ padding: '12px 10px', borderRadius: 12, background: 'var(--surface)', textAlign: 'center' }}>
                      <Icon size={17} style={{ color: 'var(--accent)', marginBottom: 4 }} />
                      <p style={{ margin: '0 0 2px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{s.value}</p>
                      <p className="ui-text-xs ui-text-muted">{s.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="ui-card">
            <div className="ui-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {event.registrationRequired && (
                <Button fullWidth href={`/dashboard/events/${event._id}/register`} leftIcon={Users}>Register for Event</Button>
              )}
              <Button
                fullWidth
                variant={isFollowing ? 'outline' : 'secondary'}
                leftIcon={isFollowing ? BellOff : Bell}
                isLoading={followMut.isPending}
                onClick={() => followMut.mutate(isFollowing)}
              >
                {isFollowing ? 'Unfollow' : 'Follow Event'}
              </Button>
              {canPost && (
                <Button fullWidth variant="outline" leftIcon={Image}
                  onClick={() => openPosterGenerator({
                    type: 'event',
                    title: event.title,
                    subtitle: event.shortDescription,
                    date: event.eventDate,
                    endDate: event.endDate,
                    time: new Date(event.eventDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
                    location: event.venue,
                    category: event.category,
                    fee: event.registrationRequired
                      ? (event.registrationSettings?.registrationFee ? `৳${event.registrationSettings.registrationFee}` : 'Free')
                      : undefined,
                    capacity: event.registrationSettings?.maxParticipants
                      ? `${event.registrationSettings.maxParticipants} seats`
                      : undefined,
                    description: event.description.substring(0, 160),
                    cta: event.registrationRequired ? 'Register now!' : undefined,
                    theme: 'gold',
                  })}>
                  Generate Poster
                </Button>
              )}
              {eligibility?.isEligible && !eligibility.existingApplication && (
                <Button fullWidth variant="success" leftIcon={Plus} onClick={() => setShowVolForm(v => !v)}>
                  Apply as Volunteer
                </Button>
              )}
              {eligibility?.existingApplication && (
                <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--surface)', textAlign: 'center' }}>
                  <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 4 }}>Your volunteer application</p>
                  <Badge variant="warning">{eligibility.existingApplication.status}</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Volunteer Form */}
          <AnimatePresence>
            {showVolForm && eligibility?.isEligible && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div className="ui-card">
                  <div className="ui-card__header"><h3 className="ui-card__title">Volunteer Application</h3></div>
                  <div className="ui-card__body">
                    {(!eligibility.availablePositions || eligibility.availablePositions.length === 0) ? (
                      <p className="ui-text-sm ui-text-muted">No positions available yet.</p>
                    ) : (
                      <>
                        <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>Preferred Positions *</p>
                        {eligibility.availablePositions.map(pos => (
                          <label key={pos.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                            <input type="checkbox"
                              checked={volForm.preferredPositions.includes(pos.name)}
                              onChange={e => setVolForm(f => ({
                                ...f,
                                preferredPositions: e.target.checked ? [...f.preferredPositions, pos.name] : f.preferredPositions.filter(p => p !== pos.name),
                              }))}
                              style={{ marginTop: 2 }}
                            />
                            <div>
                              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{pos.name} ({pos.slots} slots)</p>
                              {pos.description && <p className="ui-text-xs ui-text-muted">{pos.description}</p>}
                            </div>
                          </label>
                        ))}
                        <div className="ui-input-wrap ui-mt-3">
                          <label className="ui-input-label">Availability</label>
                          <textarea className="ui-textarea" rows={2} value={volForm.availability} onChange={e => setVolForm(f => ({ ...f, availability: e.target.value }))} />
                        </div>
                        <div className="ui-input-wrap ui-mt-2">
                          <label className="ui-input-label">Message (Optional)</label>
                          <textarea className="ui-textarea" rows={2} value={volForm.message} onChange={e => setVolForm(f => ({ ...f, message: e.target.value }))} />
                        </div>
                        <div className="ui-flex ui-flex-gap-2 ui-mt-3">
                          <Button variant="outline" size="sm" onClick={() => setShowVolForm(false)}>Cancel</Button>
                          <Button size="sm" isLoading={volMut.isPending}
                            onClick={() => { if (volForm.preferredPositions.length > 0) volMut.mutate(); else toast.error('Select at least one position'); }}>
                            Submit
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Organizer */}
          <div className="ui-card">
            <div className="ui-card__header"><h3 className="ui-card__title">Organized By</h3></div>
            <div className="ui-card__body">
              <div className="ui-flex ui-flex-gap-3" style={{ alignItems: 'center' }}>
                <Avatar src={event.createdBy.avatarUrl} name={`${event.createdBy.firstName} ${event.createdBy.lastName}`} size={40} />
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>{event.createdBy.firstName} {event.createdBy.lastName}</p>
                  <p className="ui-text-xs ui-text-muted">Event Organizer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Poster Generator Modal */}
      {PosterModal}
    </div>
  );
}