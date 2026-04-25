import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Users, DollarSign, Star, Bell, BellOff, MessageCircle, Send, Megaphone, Clock, Heart, Plus, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Countdown } from '../../components/ui/Countdown';
import { formatDateTime, formatRelativeTime } from '../../lib/utils';
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
type Post = {
  _id: string; content: string; isAnnouncement: boolean;
  authorId: { _id: string; firstName: string; lastName: string; avatarUrl?: string };
  createdAt: string; stats: { totalComments: number };
  comments: Array<{ _id: string; content: string; createdAt: string; authorId: { _id: string; firstName: string; lastName: string; avatarUrl?: string } }>;
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

type PostCardProps = {
  post: Post;
  index: number;
  user: any;
  comments: Record<string, string>;
  setComments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  commentMut: any;
};

function PostCard({ post, index, user, comments, setComments, commentMut }: PostCardProps) {
  return (
    <motion.div key={post._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <div style={{
        borderRadius: 14,
        border: `1px solid ${post.isAnnouncement ? 'rgba(245,158,11,0.35)' : 'var(--border)'}`,
        background: post.isAnnouncement ? 'rgba(245,158,11,0.07)' : 'var(--surface)',
        padding: '14px 16px',
      }}>
        {post.isAnnouncement && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', marginBottom: 10 }}>
            <Megaphone size={13} /> Important Announcement
          </div>
        )}
        <div className="ui-flex ui-flex-gap-3" style={{ marginBottom: 10, alignItems: 'center' }}>
          <Avatar src={post.authorId.avatarUrl} name={`${post.authorId.firstName} ${post.authorId.lastName}`} size={32} />
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{post.authorId.firstName} {post.authorId.lastName}</p>
            <p className="ui-text-xs ui-text-muted">{formatRelativeTime(post.createdAt)}</p>
          </div>
        </div>
        <p style={{ margin: '0 0 10px', fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{post.content}</p>
        <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
          <MessageCircle size={12} /> {post.stats.totalComments} comments
        </p>
        {post.comments.length > 0 && (
          <div style={{ paddingLeft: 14, borderLeft: '2px solid var(--border)', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {post.comments.map(c => (
              <div key={c._id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Avatar src={c.authorId.avatarUrl} name={`${c.authorId.firstName} ${c.authorId.lastName}`} size={26} />
                <div style={{ flex: 1, padding: '7px 10px', borderRadius: 10, background: 'var(--panel-strong)', border: '1px solid var(--border)' }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text)' }}>{c.authorId.firstName} {c.authorId.lastName}</p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)' }}>{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Avatar src={user?.avatarUrl} name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} size={26} />
          <input
            style={{ flex: 1, padding: '7px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit' }}
            placeholder="Write a comment…"
            value={comments[post._id] ?? ''}
            onChange={e => setComments(c => ({ ...c, [post._id]: e.target.value }))}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && comments[post._id]?.trim()) {
                e.preventDefault();
                commentMut.mutate({ postId: post._id, content: comments[post._id] });
              }
            }}
          />
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 4, display: 'flex', opacity: comments[post._id]?.trim() ? 1 : 0.35 }}
            disabled={!comments[post._id]?.trim()}
            onClick={() => commentMut.mutate({ postId: post._id, content: comments[post._id] })}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function ModernEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token, loading } = useAuth();
  const qc = useQueryClient();

  const [showPostForm, setShowPostForm] = useState(false);
  const [showVolForm, setShowVolForm]   = useState(false);
  const [showDiscussForm, setShowDiscussForm] = useState(false);
  const [postContent, setPostContent]   = useState('');
  const [discussContent, setDiscussContent] = useState('');
  const [isAnnouncement, setIsAnn]      = useState(false);
  const [volForm, setVolForm]           = useState({ preferredPositions: [] as string[], availability: '', message: '' });
  const [comments, setComments]         = useState<Record<string, string>>({});

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id, token],
    queryFn: () => apiRequest<Event>(`/events/${id}`, { token }),
    enabled: Boolean(id && token) && !loading,
  });
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['event-feed', id, token],
    queryFn: () => apiRequest<Post[]>(`/events/${id}/feed`, { token }),
    enabled: Boolean(id && token) && !loading,
  });
  const { data: eligibility } = useQuery({
    queryKey: ['vol-eligibility', id, token],
    queryFn: () => apiRequest<VolEligibility>(`/events/${id}/volunteer-eligibility`, { token }),
    enabled: Boolean(id && token) && !loading,
  });

  const followMut = useMutation({
    mutationFn: (following: boolean) => apiRequest(`/events/${id}/follow`, { method: following ? 'DELETE' : 'POST', token }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event', id] }); toast.success('Updated'); },
    onError: e => toast.error(normalizeApiError(e)),
  });
  const postMut = useMutation({
    mutationFn: () => apiRequest(`/events/${id}/posts`, { method: 'POST', token, body: JSON.stringify({ content: postContent, images: [], isAnnouncement }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event-feed', id] }); setPostContent(''); setShowPostForm(false); toast.success('Posted'); },
    onError: e => toast.error(normalizeApiError(e)),
  });
  // General discussion — always isAnnouncement: false, open to all
  const discussMut = useMutation({
    mutationFn: () => apiRequest(`/events/${id}/posts`, { method: 'POST', token, body: JSON.stringify({ content: discussContent, images: [], isAnnouncement: false }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event-feed', id] }); setDiscussContent(''); setShowDiscussForm(false); toast.success('Discussion posted'); },
    onError: e => toast.error(normalizeApiError(e)),
  });
  const commentMut = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      apiRequest(`/events/${id}/posts/${postId}/comments`, { method: 'POST', token, body: JSON.stringify({ content }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event-feed', id] }); setComments({}); },
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
  const regPct  = event.registrationSettings?.maxParticipants
    ? Math.min(100, ((event.stats?.totalRegistrations ?? 0) / event.registrationSettings.maxParticipants) * 100) : 0;

  return (
    <div className="ui-page">
      <PageHeader
        title={event.title}
        description={event.shortDescription}
        backButton
        breadcrumbs={[{ label: 'Events', href: '/dashboard/events' }, { label: event.title }]}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(280px,1fr)', gap: 20, alignItems: 'start' }}>
        {/* ── Main ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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

          {/* ── Updates & Announcements (organizers only) ── */}
          <div className="ui-card">
            <div className="ui-card__header">
              <div>
                <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Megaphone size={17} style={{ color: '#f59e0b' }} />
                  Updates & Announcements
                </h3>
                <p className="ui-text-xs ui-text-muted" style={{ marginTop: 3 }}>
                  Posted by organizers only
                </p>
              </div>
              {canPost && (
                <Button variant="outline" size="sm" leftIcon={showPostForm ? X : Plus}
                  onClick={() => setShowPostForm(v => !v)}>
                  {showPostForm ? 'Cancel' : 'Post Update'}
                </Button>
              )}
            </div>
            <div className="ui-card__body">
              {/* Post form — organizers only */}
              <AnimatePresence>
                {showPostForm && canPost && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                      <div className="ui-flex ui-flex-gap-3" style={{ marginBottom: 10, alignItems: 'center' }}>
                        <Avatar src={user?.avatarUrl} name={`${user?.firstName} ${user?.lastName}`} size={32} />
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{user?.firstName} {user?.lastName}</p>
                          <p className="ui-text-xs ui-text-muted">Posting as organizer</p>
                        </div>
                      </div>
                      <textarea className="ui-textarea" rows={3} maxLength={2000}
                        placeholder="Share an update or announcement…"
                        value={postContent} onChange={e => setPostContent(e.target.value)} />
                      <div className="ui-flex ui-flex-between" style={{ marginTop: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.82rem', color: 'var(--muted)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={isAnnouncement} onChange={e => setIsAnn(e.target.checked)} />
                          <Megaphone size={13} /> Mark as important announcement
                        </label>
                        <Button size="sm" leftIcon={Send} isLoading={postMut.isPending}
                          onClick={() => { if (postContent.trim()) postMut.mutate(); }}>
                          Post
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Announcements list — only isAnnouncement posts */}
              {postsLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>}
              {!postsLoading && posts.filter(p => p.isAnnouncement).length === 0 && (
                <EmptyState icon={Megaphone} title="No announcements yet" size="sm"
                  description={canPost ? 'Post an update to notify all followers' : 'Organizers will post updates here'} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {posts.filter(p => p.isAnnouncement).map((post, i) => (
                  <PostCard key={post._id} post={post} index={i} user={user}
                    comments={comments} setComments={setComments} commentMut={commentMut} />
                ))}
              </div>
            </div>
          </div>

          {/* ── General Discussion (everyone) ── */}
          <div className="ui-card">
            <div className="ui-card__header">
              <div>
                <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageCircle size={17} style={{ color: 'var(--accent)' }} />
                  General Discussion
                </h3>
                <p className="ui-text-xs ui-text-muted" style={{ marginTop: 3 }}>
                  Open to all participants
                </p>
              </div>
              <Button variant="outline" size="sm" leftIcon={showDiscussForm ? X : Plus}
                onClick={() => setShowDiscussForm(v => !v)}>
                {showDiscussForm ? 'Cancel' : 'Start Discussion'}
              </Button>
            </div>
            <div className="ui-card__body">
              {/* Discussion form — everyone */}
              <AnimatePresence>
                {showDiscussForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                      <div className="ui-flex ui-flex-gap-3" style={{ marginBottom: 10, alignItems: 'center' }}>
                        <Avatar src={user?.avatarUrl} name={`${user?.firstName} ${user?.lastName}`} size={32} />
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{user?.firstName} {user?.lastName}</p>
                          <p className="ui-text-xs ui-text-muted">Joining the discussion</p>
                        </div>
                      </div>
                      <textarea className="ui-textarea" rows={3} maxLength={2000}
                        placeholder="Ask a question or share your thoughts…"
                        value={discussContent} onChange={e => setDiscussContent(e.target.value)} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                        <Button size="sm" leftIcon={Send} isLoading={discussMut.isPending}
                          onClick={() => { if (discussContent.trim()) discussMut.mutate(); }}>
                          Post
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Discussion list — only non-announcement posts */}
              {postsLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>}
              {!postsLoading && posts.filter(p => !p.isAnnouncement).length === 0 && (
                <EmptyState icon={MessageCircle} title="No discussions yet" size="sm"
                  description="Be the first to start a conversation!" />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {posts.filter(p => !p.isAnnouncement).map((post, i) => (
                  <PostCard key={post._id} post={post} index={i} user={user}
                    comments={comments} setComments={setComments} commentMut={commentMut} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
    </div>
  );
}