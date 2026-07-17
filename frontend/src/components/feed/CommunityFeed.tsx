import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, MessageCircle, Send, Plus, X, ImagePlus, Loader2 } from 'lucide-react';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import { formatRelativeTime } from '../../lib/utils';
import { ImageLightbox } from './ImageLightbox';
import toast from 'react-hot-toast';

type Author = { _id: string; firstName: string; lastName: string; avatarUrl?: string };
export type FeedPost = {
  _id: string;
  content: string;
  images?: string[];
  isAnnouncement: boolean;
  authorId: Author;
  createdAt: string;
  stats: { totalComments: number };
  comments: Array<{ _id: string; content: string; images?: string[]; createdAt: string; authorId: Author }>;
};

type Props = {
  /** REST base for this entity, e.g. `/events/123` or `/workshops/123`. */
  baseUrl: string;
  /** React-query key prefix so caches stay isolated per entity. */
  queryKey: (string | undefined)[];
  token: string | null;
  user: any;
  /** May the current user post announcements? */
  canAnnounce: boolean;
  /** May the current user post to general discussion? */
  canDiscuss: boolean;
  /** Label shown for the community section subtitle. */
  discussionHint?: string;
};

const MAX_IMAGES = 6;

function Avatar({ src, name, size = 34 }: { src?: string; name: string; size?: number }) {
  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
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

/** Responsive image grid inside a post; click opens the lightbox. */
function ImageGrid({ images, onOpen }: { images: string[]; onOpen: (i: number) => void }) {
  if (!images.length) return null;
  const n = images.length;
  const cols = n === 1 ? 1 : n === 2 ? 2 : n === 4 ? 2 : 3;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6, marginBottom: 10, borderRadius: 12, overflow: 'hidden' }}>
      {images.slice(0, 6).map((src, i) => {
        const isLastVisible = i === 5 && n > 6;
        return (
          <div key={i} onClick={() => onOpen(i)} style={{
            position: 'relative', cursor: 'pointer', aspectRatio: n === 1 ? '16 / 10' : '1 / 1',
            background: 'var(--surface)', overflow: 'hidden',
          }}>
            <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {isLastVisible && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 800 }}>
                +{n - 6}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Composer with text + inline image upload (base64 → MongoDB via /upload). */
function Composer({
  baseUrl, token, user, isAnnouncement, onPosted, placeholder,
}: {
  baseUrl: string; token: string | null; user: any; isAnnouncement: boolean;
  onPosted: () => void; placeholder: string;
}) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const postMut = useMutation({
    mutationFn: () => apiRequest(`${baseUrl}/posts`, {
      method: 'POST', token,
      body: JSON.stringify({ content, images, isAnnouncement }),
    }),
    onSuccess: () => { setContent(''); setImages([]); onPosted(); toast.success('Posted'); },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    const picked = Array.from(files).slice(0, remaining);
    if (Array.from(files).length > remaining) toast.error(`Max ${MAX_IMAGES} images`);

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of picked) {
        if (!file.type.startsWith('image/')) { toast.error('Only images allowed'); continue; }
        if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} exceeds 5MB`); continue; }
        const fd = new FormData();
        fd.append('file', file);
        const res = await apiRequest<{ url: string }>('/upload', { method: 'POST', token, body: fd, isFormData: true });
        if (res?.url) uploaded.push(res.url);
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (e) {
      toast.error(normalizeApiError(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 16 }}>
      <div className="ui-flex ui-flex-gap-3" style={{ marginBottom: 10, alignItems: 'center' }}>
        <Avatar src={user?.avatarUrl} name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} size={32} />
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{user?.firstName} {user?.lastName}</p>
          <p className="ui-text-xs ui-text-muted">{isAnnouncement ? 'Posting as organizer' : 'Joining the discussion'}</p>
        </div>
      </div>

      <textarea className="ui-textarea" rows={3} maxLength={2000} placeholder={placeholder}
        value={content} onChange={(e) => setContent(e.target.value)} />

      {/* Image previews */}
      {images.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {images.map((src, i) => (
            <div key={i} style={{ position: 'relative', width: 74, height: 74, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.65)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />

      <div className="ui-flex ui-flex-between" style={{ marginTop: 12, alignItems: 'center' }}>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || images.length >= MAX_IMAGES}
          className="ui-btn ui-btn--ghost ui-btn--sm"
          style={{ opacity: images.length >= MAX_IMAGES ? 0.5 : 1 }}
        >
          {uploading ? <Loader2 size={15} className="ui-spin" /> : <ImagePlus size={15} />}
          {uploading ? 'Uploading…' : `Photos (${images.length}/${MAX_IMAGES})`}
        </button>
        <Button size="sm" leftIcon={Send} isLoading={postMut.isPending} disabled={uploading}
          onClick={() => { if (content.trim() || images.length) postMut.mutate(); else toast.error('Write something or add a photo'); }}>
          Post
        </Button>
      </div>
    </div>
  );
}

function PostCard({ post, baseUrl, token, user, onChanged }: {
  post: FeedPost; baseUrl: string; token: string | null; user: any; onChanged: () => void;
}) {
  const [comment, setComment] = useState('');
  const [commentImages, setCommentImages] = useState<string[]>([]);
  const [uploadingComment, setUploadingComment] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const commentFileRef = useRef<HTMLInputElement>(null);

  const commentMut = useMutation({
    mutationFn: () => apiRequest(`${baseUrl}/posts/${post._id}/comments`, {
      method: 'POST', token, body: JSON.stringify({ content: comment, images: commentImages }),
    }),
    onSuccess: () => { setComment(''); setCommentImages([]); onChanged(); },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  async function handleCommentImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = 4 - commentImages.length;
    const picked = Array.from(files).slice(0, remaining);
    if (Array.from(files).length > remaining) toast.error(`Max 4 images per comment`);

    setUploadingComment(true);
    try {
      const uploaded: string[] = [];
      for (const file of picked) {
        if (!file.type.startsWith('image/')) { toast.error('Only images allowed'); continue; }
        if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} exceeds 5MB`); continue; }
        const fd = new FormData();
        fd.append('file', file);
        const res = await apiRequest<{ url: string }>('/upload', { method: 'POST', token, body: fd, isFormData: true });
        if (res?.url) uploaded.push(res.url);
      }
      setCommentImages((prev) => [...prev, ...uploaded]);
    } catch (e) {
      toast.error(normalizeApiError(e));
    } finally {
      setUploadingComment(false);
      if (commentFileRef.current) commentFileRef.current.value = '';
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
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
            <Avatar src={post.authorId?.avatarUrl} name={post.authorId ? `${post.authorId.firstName || ''} ${post.authorId.lastName || ''}`.trim() : 'Deleted User'} size={32} />
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{post.authorId ? `${post.authorId.firstName || ''} ${post.authorId.lastName || ''}`.trim() : 'Deleted User'}</p>
              <p className="ui-text-xs ui-text-muted">{formatRelativeTime(post.createdAt)}</p>
            </div>
          </div>

          {post.content && (
            <p style={{ margin: '0 0 10px', fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{post.content}</p>
          )}

          {post.images && post.images.length > 0 && (
            <ImageGrid images={post.images} onOpen={setLightbox} />
          )}

          <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <MessageCircle size={12} /> {post.stats.totalComments} comments
          </p>

          {post.comments.length > 0 && (
            <div style={{ paddingLeft: 14, borderLeft: '2px solid var(--border)', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {post.comments.map((c) => {
                const authorName = c.authorId ? `${c.authorId.firstName || ''} ${c.authorId.lastName || ''}`.trim() : 'Deleted User';
                const authorAvatar = c.authorId?.avatarUrl;
                return (
                  <div key={c._id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Avatar src={authorAvatar} name={authorName} size={26} />
                    <div style={{ flex: 1, padding: '7px 10px', borderRadius: 10, background: 'var(--panel-strong)', border: '1px solid var(--border)' }}>
                      <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text)' }}>{authorName}</p>
                      {c.content && <p style={{ margin: '0 0 6px', fontSize: '0.78rem', color: 'var(--muted)' }}>{c.content}</p>}
                      {c.images && c.images.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                          {c.images.map((img, idx) => (
                            <img key={idx} src={img} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border)' }} onClick={() => setLightbox(0)} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Comment image previews */}
          {commentImages.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, paddingLeft: 34 }}>
              {commentImages.map((src, i) => (
                <div key={i} style={{ position: 'relative', width: 50, height: 50, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => setCommentImages((prev) => prev.filter((_, idx) => idx !== i))}
                    style={{ position: 'absolute', top: 1, right: 1, width: 16, height: 16, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.7)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input ref={commentFileRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleCommentImages(e.target.files)} />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Avatar src={user?.avatarUrl} name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} size={26} />
            <input
              style={{ flex: 1, padding: '7px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit' }}
              placeholder="Write a comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && (comment.trim() || commentImages.length)) { e.preventDefault(); commentMut.mutate(); } }}
            />
            <button
              onClick={() => commentFileRef.current?.click()}
              disabled={uploadingComment || commentImages.length >= 4}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, display: 'flex', opacity: commentImages.length >= 4 ? 0.35 : 1 }}
              title="Add image"
            >
              {uploadingComment ? <Loader2 size={15} className="ui-spin" /> : <ImagePlus size={15} />}
            </button>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 4, display: 'flex', opacity: (comment.trim() || commentImages.length) ? 1 : 0.35 }}
              disabled={!comment.trim() && commentImages.length === 0} onClick={() => commentMut.mutate()}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </motion.div>

      {lightbox !== null && post.images && (
        <ImageLightbox images={post.images} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />
      )}
    </>
  );
}

export function CommunityFeed({ baseUrl, queryKey, token, user, canAnnounce, canDiscuss, discussionHint }: Props) {
  const qc = useQueryClient();
  const [showAnn, setShowAnn] = useState(false);
  const [showDisc, setShowDisc] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => apiRequest<FeedPost[]>(`${baseUrl}/feed`, { token }),
    enabled: Boolean(token),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey });
    setShowAnn(false); setShowDisc(false);
  };

  const announcements = posts.filter((p) => p.isAnnouncement);
  const discussions = posts.filter((p) => !p.isAnnouncement);

  return (
    <>
      {/* Announcements */}
      <div className="ui-card">
        <div className="ui-card__header">
          <div>
            <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Megaphone size={17} style={{ color: '#f59e0b' }} /> Updates &amp; Announcements
            </h3>
            <p className="ui-text-xs ui-text-muted" style={{ marginTop: 3 }}>Posted by organizers</p>
          </div>
          {canAnnounce && (
            <Button variant="outline" size="sm" leftIcon={showAnn ? X : Plus} onClick={() => setShowAnn((v) => !v)}>
              {showAnn ? 'Cancel' : 'Post Update'}
            </Button>
          )}
        </div>
        <div className="ui-card__body">
          <AnimatePresence>
            {showAnn && canAnnounce && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <Composer baseUrl={baseUrl} token={token} user={user} isAnnouncement onPosted={refresh} placeholder="Share an update or announcement…" />
              </motion.div>
            )}
          </AnimatePresence>

          {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>}
          {!isLoading && announcements.length === 0 && (
            <EmptyState icon={Megaphone} title="No announcements yet" size="sm"
              description={canAnnounce ? 'Post an update to notify participants' : 'Organizers will post updates here'} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {announcements.map((post) => (
              <PostCard key={post._id} post={post} baseUrl={baseUrl} token={token} user={user} onChanged={() => qc.invalidateQueries({ queryKey })} />
            ))}
          </div>
        </div>
      </div>

      {/* Discussion */}
      <div className="ui-card">
        <div className="ui-card__header">
          <div>
            <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={17} style={{ color: 'var(--accent)' }} /> Community Discussion
            </h3>
            <p className="ui-text-xs ui-text-muted" style={{ marginTop: 3 }}>{discussionHint || 'Open to all participants'}</p>
          </div>
          {canDiscuss && (
            <Button variant="outline" size="sm" leftIcon={showDisc ? X : Plus} onClick={() => setShowDisc((v) => !v)}>
              {showDisc ? 'Cancel' : 'Start Discussion'}
            </Button>
          )}
        </div>
        <div className="ui-card__body">
          <AnimatePresence>
            {showDisc && canDiscuss && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <Composer baseUrl={baseUrl} token={token} user={user} isAnnouncement={false} onPosted={refresh} placeholder="Ask a question or share your thoughts…" />
              </motion.div>
            )}
          </AnimatePresence>

          {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>}
          {!isLoading && discussions.length === 0 && (
            <EmptyState icon={MessageCircle} title="No discussions yet" size="sm"
              description={canDiscuss ? 'Be the first to start a conversation!' : 'Register to join the discussion'} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {discussions.map((post) => (
              <PostCard key={post._id} post={post} baseUrl={baseUrl} token={token} user={user} onChanged={() => qc.invalidateQueries({ queryKey })} />
            ))}
          </div>
        </div>
      </div>

      <style>{`.ui-spin { animation: uiSpin 0.9s linear infinite; } @keyframes uiSpin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
