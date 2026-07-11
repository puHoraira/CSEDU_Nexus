import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock, MapPin, Video, CheckCircle2, Circle, ListChecks, ClipboardList,
  Upload, Star, Award, Download, Send, ExternalLink,
} from 'lucide-react';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { formatDateTime } from '../../lib/utils';
import toast from 'react-hot-toast';

type Session = { _id: string; title: string; description?: string; startTime?: string; endTime?: string; location?: string; isOnline?: boolean; speaker?: string; order?: number };
type Prework = { _id: string; title: string; description?: string; url?: string; required?: boolean };
type Assignment = { _id: string; title: string; description?: string; dueDate?: string; maxPoints?: number; allowFile?: boolean; allowLink?: boolean };
type Submission = { _id: string; assignmentId: string; content?: string; fileUrl?: string; linkUrl?: string; status: string; grade?: number; feedback?: string };
type MyReg = { status: string; completionPercentage?: number; isCompleted?: boolean; preworkCompleted?: string[]; certificateIssued?: boolean } | null;

type Props = {
  workshopId: string;
  token: string | null;
  sessions: Session[];
  prework: Prework[];
  assignments: Assignment[];
  myReg: MyReg;
  isParticipant: boolean;
  feedbackEnabled: boolean;
  workshopStatus: string;
};

/* ── Agenda / Sessions (read-only for participants) ── */
export function WorkshopAgenda({ sessions }: { sessions: Session[] }) {
  if (!sessions.length) return null;
  const sorted = [...sessions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarClock size={17} style={{ color: 'var(--accent)' }} /> Agenda
        </h3>
        <Badge variant="neutral">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</Badge>
      </div>
      <div className="ui-card__body" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {sorted.map((s, i) => (
            <div key={s._id} style={{ display: 'flex', gap: 14 }}>
              {/* Timeline rail */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--accent)', border: '3px solid var(--surface)', flexShrink: 0, marginTop: 4 }} />
                {i < sorted.length - 1 && <div style={{ flex: 1, width: 2, background: 'var(--border)', margin: '2px 0' }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: i < sorted.length - 1 ? 20 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{s.title}</h4>
                  {s.startTime && <span className="ui-text-xs ui-text-muted">{formatDateTime(s.startTime)}</span>}
                </div>
                {s.description && <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.5 }}>{s.description}</p>}
                <div className="ui-flex ui-flex-gap-2" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                  {s.speaker && <Badge variant="primary">{s.speaker}</Badge>}
                  {s.location && <Badge variant="neutral" icon={s.isOnline ? Video : MapPin}>{s.location}</Badge>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Pre-work checklist (participant toggles) ── */
export function WorkshopPrework({ workshopId, token, prework, myReg, isParticipant }: Pick<Props, 'workshopId' | 'token' | 'prework' | 'myReg' | 'isParticipant'>) {
  const qc = useQueryClient();
  const completed = new Set(myReg?.preworkCompleted || []);

  const toggleMut = useMutation({
    mutationFn: ({ preworkId, done }: { preworkId: string; done: boolean }) =>
      apiRequest(`/workshops/${workshopId}/prework/${preworkId}/toggle`, { method: 'POST', token, body: JSON.stringify({ done }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-workshop-reg', workshopId, token ?? ''] }),
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  if (!prework.length) return null;
  const doneCount = prework.filter((p) => completed.has(p._id)).length;
  const pct = Math.round((doneCount / prework.length) * 100);

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ListChecks size={17} style={{ color: 'var(--accent)' }} /> Pre-work Checklist
        </h3>
        <Badge variant={pct === 100 ? 'success' : 'warning'}>{doneCount}/{prework.length} done</Badge>
      </div>
      <div className="ui-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isParticipant && (
          <div style={{ height: 6, background: 'var(--surface)', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gradient-primary)', borderRadius: 999, transition: 'width 0.4s' }} />
          </div>
        )}
        {prework.map((p) => {
          const done = completed.has(p._id);
          return (
            <div key={p._id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: done ? 'rgba(16,185,129,0.06)' : 'var(--surface)' }}>
              <button
                disabled={!isParticipant || toggleMut.isPending}
                onClick={() => toggleMut.mutate({ preworkId: p._id, done: !done })}
                style={{ background: 'none', border: 'none', cursor: isParticipant ? 'pointer' : 'default', padding: 0, color: done ? '#10b981' : 'var(--muted)', flexShrink: 0, marginTop: 1 }}
              >
                {done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>
                  {p.title} {p.required === false && <span className="ui-text-xs ui-text-muted">(optional)</span>}
                </p>
                {p.description && <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>{p.description}</p>}
                {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="ui-text-xs" style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}><ExternalLink size={12} /> Setup link</a>}
              </div>
            </div>
          );
        })}
        {!isParticipant && <p className="ui-text-xs ui-text-muted">Register to track your pre-work.</p>}
      </div>
    </div>
  );
}

/* ── Assignments + submission ── */
export function WorkshopAssignments({ workshopId, token, assignments, isParticipant }: Pick<Props, 'workshopId' | 'token' | 'assignments' | 'isParticipant'>) {
  const qc = useQueryClient();
  const { data: submissions = [] } = useQuery({
    queryKey: ['workshop-my-submissions', workshopId, token],
    queryFn: () => apiRequest<Submission[]>(`/workshops/${workshopId}/my-submissions`, { token }),
    enabled: Boolean(token && isParticipant),
  });

  if (!assignments.length) return null;
  const byAssignment = new Map(submissions.map((s) => [s.assignmentId, s]));

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardList size={17} style={{ color: 'var(--accent)' }} /> Assignments
        </h3>
        <Badge variant="neutral">{assignments.length}</Badge>
      </div>
      <div className="ui-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {assignments.map((a) => (
          <AssignmentItem key={a._id} workshopId={workshopId} token={token} assignment={a} submission={byAssignment.get(a._id)} isParticipant={isParticipant} onDone={() => qc.invalidateQueries({ queryKey: ['workshop-my-submissions', workshopId, token] })} />
        ))}
      </div>
    </div>
  );
}

function AssignmentItem({ workshopId, token, assignment, submission, isParticipant, onDone }: {
  workshopId: string; token: string | null; assignment: Assignment; submission?: Submission; isParticipant: boolean; onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(submission?.content || '');
  const [linkUrl, setLinkUrl] = useState(submission?.linkUrl || '');
  const [fileUrl, setFileUrl] = useState(submission?.fileUrl || '');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  const submitMut = useMutation({
    mutationFn: () => apiRequest(`/workshops/${workshopId}/assignments/${assignment._id}/submit`, {
      method: 'POST', token, body: JSON.stringify({ content, linkUrl, fileUrl, fileName }),
    }),
    onSuccess: () => { toast.success('Submitted'); setOpen(false); onDone(); },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  async function handleFile(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiRequest<{ url: string }>('/upload', { method: 'POST', token, body: fd, isFormData: true });
      setFileUrl(res.url); setFileName(file.name);
      toast.success('File attached');
    } catch (e) { toast.error(normalizeApiError(e)); } finally { setUploading(false); }
  }

  const submitted = Boolean(submission);
  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{assignment.title}</h4>
          {assignment.description && <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>{assignment.description}</p>}
          <div className="ui-flex ui-flex-gap-2" style={{ marginTop: 6, flexWrap: 'wrap' }}>
            {assignment.dueDate && <Badge variant="warning">Due {formatDateTime(assignment.dueDate)}</Badge>}
            {typeof submission?.grade === 'number' && <Badge variant="success">Grade: {submission.grade}/{assignment.maxPoints ?? 100}</Badge>}
            {submitted && <Badge variant={submission!.status === 'Reviewed' ? 'success' : 'primary'}>{submission!.status}</Badge>}
          </div>
          {submission?.feedback && <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>Feedback: {submission.feedback}</p>}
        </div>
        {isParticipant && (
          <Button size="sm" variant={submitted ? 'outline' : 'primary'} leftIcon={Upload} onClick={() => setOpen((v) => !v)}>
            {submitted ? 'Update' : 'Submit'}
          </Button>
        )}
      </div>
      {open && isParticipant && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {assignment.allowLink !== false && (
            <input className="ui-input" placeholder="Link (GitHub, Drive, etc.)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          )}
          <textarea className="ui-textarea" rows={2} placeholder="Notes / answer…" value={content} onChange={(e) => setContent(e.target.value)} />
          {assignment.allowFile !== false && (
            <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
              <label className="ui-btn ui-btn--outline ui-btn--sm" style={{ cursor: 'pointer' }}>
                <Upload size={14} /> {uploading ? 'Uploading…' : fileName || (fileUrl ? 'File attached' : 'Attach file')}
                <input type="file" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
              </label>
            </div>
          )}
          <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: 'flex-end' }}>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" leftIcon={Send} isLoading={submitMut.isPending} disabled={uploading} onClick={() => submitMut.mutate()}>Submit</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Feedback & rating ── */
export function WorkshopFeedback({ workshopId, token, isParticipant, workshopStatus }: Pick<Props, 'workshopId' | 'token' | 'isParticipant' | 'workshopStatus'>) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [recommend, setRecommend] = useState<boolean | undefined>(undefined);

  const { data } = useQuery({
    queryKey: ['workshop-feedback', workshopId, token],
    queryFn: () => apiRequest<any>(`/workshops/${workshopId}/feedback`, { token }),
    enabled: Boolean(token),
  });

  const submitMut = useMutation({
    mutationFn: () => apiRequest(`/workshops/${workshopId}/feedback`, { method: 'POST', token, body: JSON.stringify({ rating, comment, wouldRecommend: recommend }) }),
    onSuccess: () => { toast.success('Thanks for your feedback!'); qc.invalidateQueries({ queryKey: ['workshop-feedback', workshopId, token] }); },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  const stats = data?.stats;
  const myFeedback = data?.myFeedback;
  const list = data?.feedback || [];
  const canReview = isParticipant && ['Completed', 'Ongoing'].includes(workshopStatus);

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Star size={17} style={{ color: '#f59e0b' }} /> Feedback & Ratings
        </h3>
        {stats?.totalRatings > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star size={16} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>{stats.averageRating}</span>
            <span className="ui-text-xs ui-text-muted">({stats.totalRatings})</span>
          </div>
        )}
      </div>
      <div className="ui-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Submit / edit form */}
        {canReview && !myFeedback && (
          <div style={{ padding: '14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>Rate this workshop</p>
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <Star size={28} style={{ color: '#f59e0b', fill: (hover || rating) >= n ? '#f59e0b' : 'transparent' }} />
                </button>
              ))}
            </div>
            <textarea className="ui-textarea" rows={2} placeholder="Share your experience…" value={comment} onChange={(e) => setComment(e.target.value)} />
            <div className="ui-flex ui-flex-between" style={{ marginTop: 10, alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div className="ui-flex ui-flex-gap-2">
                <button className={`ui-btn ui-btn--sm ${recommend === true ? 'ui-btn--primary' : 'ui-btn--outline'}`} onClick={() => setRecommend(true)}>👍 Recommend</button>
                <button className={`ui-btn ui-btn--sm ${recommend === false ? 'ui-btn--primary' : 'ui-btn--outline'}`} onClick={() => setRecommend(false)}>👎</button>
              </div>
              <Button size="sm" isLoading={submitMut.isPending} disabled={rating === 0} onClick={() => submitMut.mutate()}>Submit</Button>
            </div>
          </div>
        )}
        {myFeedback && (
          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <p className="ui-text-sm" style={{ margin: 0, color: 'var(--text)' }}>
              You rated this <strong>{myFeedback.rating}★</strong>. Thank you!
            </p>
          </div>
        )}

        {/* Reviews list */}
        {list.length === 0 ? (
          <EmptyState icon={Star} title="No reviews yet" size="sm" description={canReview ? 'Be the first to review!' : undefined} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map((f: any) => (
              <div key={f._id} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div className="ui-flex ui-flex-between" style={{ alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text)' }}>{f.author?.name || 'Participant'}</span>
                  <div style={{ display: 'flex', gap: 1 }}>
                    {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} style={{ color: '#f59e0b', fill: f.rating >= n ? '#f59e0b' : 'transparent' }} />)}
                  </div>
                </div>
                {f.comment && <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>{f.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Completion + certificate (sidebar widget) ── */
export function WorkshopCompletion({ workshopId, token, myReg }: Pick<Props, 'workshopId' | 'token' | 'myReg'>) {
  const [downloading, setDownloading] = useState(false);
  const { data: cert } = useQuery({
    queryKey: ['workshop-my-certificate', workshopId, token],
    queryFn: () => apiRequest<any>(`/workshops/${workshopId}/my-certificate`, { token }),
    enabled: Boolean(token && myReg),
  });

  if (!myReg) return null;
  const pct = myReg.completionPercentage ?? 0;

  async function download() {
    if (!cert?._id) return;
    setDownloading(true);
    try {
      const res = await apiRequest<{ pdfData: string; certificateNo: string }>(`/workshops/certificates/${cert._id}/download`, { token });
      if (res.pdfData) {
        const a = document.createElement('a');
        a.href = res.pdfData;
        a.download = `${res.certificateNo}.pdf`;
        a.click();
      } else toast.error('Certificate PDF not ready');
    } catch (e) { toast.error(normalizeApiError(e)); } finally { setDownloading(false); }
  }

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={17} style={{ color: 'var(--accent)' }} /> My Progress
        </h3>
      </div>
      <div className="ui-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div className="ui-flex ui-flex-between ui-text-xs ui-text-muted" style={{ marginBottom: 5 }}>
            <span>Completion</span>
            <span style={{ fontWeight: 700, color: myReg.isCompleted ? '#10b981' : 'var(--text)' }}>{pct}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--surface)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: myReg.isCompleted ? '#10b981' : 'var(--gradient-primary)', borderRadius: 999, transition: 'width 0.5s' }} />
          </div>
        </div>
        {myReg.isCompleted ? (
          cert ? (
            <Button fullWidth leftIcon={Download} isLoading={downloading} onClick={download}>Download Certificate</Button>
          ) : (
            <div style={{ padding: 10, borderRadius: 10, background: 'rgba(16,185,129,0.06)', textAlign: 'center' }}>
              <p className="ui-text-sm" style={{ margin: 0, color: '#10b981', fontWeight: 600 }}>✓ Completed!</p>
              <p className="ui-text-xs ui-text-muted" style={{ marginTop: 2 }}>Your certificate will be issued shortly.</p>
            </div>
          )
        ) : (
          <p className="ui-text-xs ui-text-muted" style={{ margin: 0 }}>
            Attend sessions to reach the completion threshold and earn your certificate.
          </p>
        )}
      </div>
    </div>
  );
}
