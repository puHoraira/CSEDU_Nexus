import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, CalendarClock, ListChecks, ClipboardList, Check, X,
  UserCheck, Award, Video, MapPin, FileText, ExternalLink, Download, Trophy, Medal,
} from 'lucide-react';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import { formatDateTime } from '../../lib/utils';
import toast from 'react-hot-toast';

type Props = { workshopId: string; token: string | null };

/* ── Sessions editor ── */
export function SessionsEditor({ workshopId, token }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', startTime: '', location: '', isOnline: false, speaker: '' });
  const [show, setShow] = useState(false);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['ws-sessions', workshopId, token],
    queryFn: () => apiRequest<any[]>(`/workshops/${workshopId}/sessions`, { token }),
    enabled: Boolean(token),
  });

  const addMut = useMutation({
    mutationFn: () => apiRequest(`/workshops/${workshopId}/sessions`, {
      method: 'POST', token,
      body: JSON.stringify({ ...form, startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined }),
    }),
    onSuccess: () => { toast.success('Session added'); setForm({ title: '', description: '', startTime: '', location: '', isOnline: false, speaker: '' }); setShow(false); qc.invalidateQueries({ queryKey: ['ws-sessions', workshopId, token] }); },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  const delMut = useMutation({
    mutationFn: (sid: string) => apiRequest(`/workshops/${workshopId}/sessions/${sid}`, { method: 'DELETE', token }),
    onSuccess: () => { toast.success('Removed'); qc.invalidateQueries({ queryKey: ['ws-sessions', workshopId, token] }); },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CalendarClock size={17} style={{ color: 'var(--accent)' }} /> Sessions / Agenda</h3>
        <Button size="sm" leftIcon={show ? X : Plus} variant="outline" onClick={() => setShow((v) => !v)}>{show ? 'Cancel' : 'Add Session'}</Button>
      </div>
      <div className="ui-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {show && (
          <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="ui-input" placeholder="Session title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <textarea className="ui-textarea" rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input className="ui-input" type="datetime-local" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
              <input className="ui-input" placeholder="Speaker" value={form.speaker} onChange={(e) => setForm((f) => ({ ...f, speaker: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
              <input className="ui-input" placeholder={form.isOnline ? 'Meeting link' : 'Room / location'} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              <label className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center', fontSize: '0.82rem', color: 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={form.isOnline} onChange={(e) => setForm((f) => ({ ...f, isOnline: e.target.checked }))} /> Online
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button size="sm" isLoading={addMut.isPending} disabled={!form.title.trim()} onClick={() => addMut.mutate()}>Add</Button>
            </div>
          </div>
        )}
        {isLoading ? <Spinner /> : sessions.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No sessions" size="sm" description="Build the agenda so attendance can be tracked per session." />
        ) : (
          sessions.map((s) => (
            <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>{s.title}</p>
                <div className="ui-flex ui-flex-gap-2" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                  {s.startTime && <span className="ui-text-xs ui-text-muted">{formatDateTime(s.startTime)}</span>}
                  {s.location && <Badge variant="neutral" icon={s.isOnline ? Video : MapPin}>{s.location}</Badge>}
                </div>
              </div>
              <Button size="sm" variant="danger" leftIcon={Trash2} onClick={() => { if (confirm('Remove session?')) delMut.mutate(s._id); }} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Attendance grid ── */
export function AttendanceGrid({ workshopId, token }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['ws-attendance', workshopId, token],
    queryFn: () => apiRequest<any>(`/workshops/${workshopId}/attendance`, { token }),
    enabled: Boolean(token),
  });

  const markMut = useMutation({
    mutationFn: ({ sessionId, userId, attended }: { sessionId: string; userId: string; attended: boolean }) => {
      console.log('[Attendance] Sending:', { sessionId, userId, attended });
      return apiRequest(`/workshops/${workshopId}/sessions/${sessionId}/attendance`, { method: 'POST', token, body: JSON.stringify({ userId, attended }) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ws-attendance', workshopId, token] }),
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  const issueMut = useMutation({
    mutationFn: () => apiRequest(`/workshops/${workshopId}/certificates/issue`, { method: 'POST', token }),
    onSuccess: (d: any) => { toast.success(`${d?.issued ?? 0} certificate(s) issued`); qc.invalidateQueries({ queryKey: ['ws-attendance', workshopId, token] }); },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  if (isLoading) return <div className="ui-card"><div className="ui-card__body"><Spinner label="Loading attendance…" /></div></div>;
  const sessions = data?.sessions || [];
  const participants = data?.participants || [];

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UserCheck size={17} style={{ color: 'var(--accent)' }} /> Attendance & Completion</h3>
        <Button size="sm" leftIcon={Award} isLoading={issueMut.isPending} onClick={() => issueMut.mutate()}>Issue Certificates</Button>
      </div>
      <div className="ui-card__body ui-card__body--flush">
        {participants.length === 0 ? (
          <EmptyState icon={UserCheck} title="No approved participants yet" />
        ) : sessions.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Add sessions first" description="Attendance is tracked per session." />
        ) : (
          <div className="ui-table--scroll">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Participant</th>
                  {sessions.map((s: any) => <th key={s._id} style={{ textAlign: 'center' }}>{s.title}</th>)}
                  <th style={{ textAlign: 'center' }}>Completion</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p: any) => (
                  <tr key={p.registrationId}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div className="ui-text-xs ui-text-muted">{p.email}</div>
                    </td>
                    {sessions.map((s: any) => {
                      const att = p.attendance.find((a: any) => a.sessionId === s._id);
                      const on = att?.attended;
                      return (
                        <td key={s._id} style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => markMut.mutate({ sessionId: s._id, userId: p.userId, attended: !on })}
                            style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${on ? '#10b981' : 'var(--border)'}`, background: on ? 'rgba(16,185,129,0.15)' : 'transparent', color: on ? '#10b981' : 'var(--muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {on ? <Check size={15} /> : ''}
                          </button>
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center' }}>
                      <Badge variant={p.isCompleted ? 'success' : 'neutral'}>{p.completionPercentage}%</Badge>
                      {p.certificateIssued && <div className="ui-text-xs" style={{ color: '#10b981', marginTop: 2 }}>🎓 Issued</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Prework + Assignments editor (compact) ── */
export function ContentEditor({ workshopId, token }: Props) {
  const qc = useQueryClient();
  const { data: workshop } = useQuery({
    queryKey: ['ws-content', workshopId, token],
    queryFn: () => apiRequest<any>(`/workshops/${workshopId}`, { token }),
    enabled: Boolean(token),
  });
  const [pw, setPw] = useState('');
  const [asg, setAsg] = useState('');

  const addPw = useMutation({
    mutationFn: () => apiRequest(`/workshops/${workshopId}/prework`, { method: 'POST', token, body: JSON.stringify({ title: pw }) }),
    onSuccess: () => { setPw(''); qc.invalidateQueries({ queryKey: ['ws-content', workshopId, token] }); toast.success('Added'); },
    onError: (e) => toast.error(normalizeApiError(e)),
  });
  const delPw = useMutation({
    mutationFn: (pid: string) => apiRequest(`/workshops/${workshopId}/prework/${pid}`, { method: 'DELETE', token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ws-content', workshopId, token] }),
  });
  const addAsg = useMutation({
    mutationFn: () => apiRequest(`/workshops/${workshopId}/assignments`, { method: 'POST', token, body: JSON.stringify({ title: asg }) }),
    onSuccess: () => { setAsg(''); qc.invalidateQueries({ queryKey: ['ws-content', workshopId, token] }); toast.success('Added'); },
    onError: (e) => toast.error(normalizeApiError(e)),
  });
  const delAsg = useMutation({
    mutationFn: (aid: string) => apiRequest(`/workshops/${workshopId}/assignments/${aid}`, { method: 'DELETE', token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ws-content', workshopId, token] }),
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
      {/* Prework */}
      <div className="ui-card">
        <div className="ui-card__header"><h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ListChecks size={16} style={{ color: 'var(--accent)' }} /> Pre-work</h3></div>
        <div className="ui-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="ui-flex ui-flex-gap-2">
            <input className="ui-input" placeholder="Add pre-work item…" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && pw.trim()) addPw.mutate(); }} />
            <Button size="sm" leftIcon={Plus} disabled={!pw.trim()} isLoading={addPw.isPending} onClick={() => addPw.mutate()} />
          </div>
          {(workshop?.prework || []).map((p: any) => (
            <div key={p._id} className="ui-flex ui-flex-between" style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.85rem' }}>{p.title}</span>
              <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => delPw.mutate(p._id)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
      {/* Assignments */}
      <div className="ui-card">
        <div className="ui-card__header"><h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList size={16} style={{ color: 'var(--accent)' }} /> Assignments</h3></div>
        <div className="ui-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="ui-flex ui-flex-gap-2">
            <input className="ui-input" placeholder="Add assignment…" value={asg} onChange={(e) => setAsg(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && asg.trim()) addAsg.mutate(); }} />
            <Button size="sm" leftIcon={Plus} disabled={!asg.trim()} isLoading={addAsg.isPending} onClick={() => addAsg.mutate()} />
          </div>
          {(workshop?.assignments || []).map((a: any) => (
            <div key={a._id} className="ui-flex ui-flex-between" style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.85rem' }}>{a.title}</span>
              <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => delAsg.mutate(a._id)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Submissions review (view + grade) ── */
type SubSummary = { assignmentId: string; title: string; maxPoints: number; submitted: number; graded: number; pending: number; totalParticipants: number };
type SubRow = {
  _id: string; assignmentId: string; assignmentTitle: string; maxPoints: number;
  participantName: string; participantEmail?: string; avatarUrl?: string;
  content?: string; fileUrl?: string; fileName?: string; linkUrl?: string;
  status: string; grade?: number; feedback?: string; submittedAt: string;
};

export function SubmissionsReview({ workshopId, token }: Props) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['ws-submissions', workshopId, token],
    queryFn: () => apiRequest<{ summary: SubSummary[]; submissions: SubRow[]; totalParticipants: number }>(`/workshops/${workshopId}/submissions`, { token }),
    enabled: Boolean(token),
  });

  const summary = data?.summary || [];
  const submissions = data?.submissions || [];
  const filtered = filter === 'all' ? submissions : submissions.filter((s) => s.assignmentId.toString() === filter);

  if (isLoading) return <div className="ui-card"><div className="ui-card__body"><Spinner label="Loading submissions…" /></div></div>;

  return (
    <div className="ui-flex-col" style={{ gap: 16 }}>
      {/* Per-assignment summary */}
      <div className="ui-card">
        <div className="ui-card__header">
          <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList size={17} style={{ color: 'var(--accent)' }} /> Assignment Submissions</h3>
        </div>
        <div className="ui-card__body">
          {summary.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No assignments" size="sm" description="Add assignments in the Tasks tab first." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              <button
                onClick={() => setFilter('all')}
                style={{ textAlign: 'left', padding: 14, borderRadius: 12, cursor: 'pointer', border: `1px solid ${filter === 'all' ? 'var(--accent)' : 'var(--border)'}`, background: filter === 'all' ? 'var(--accent-glow, rgba(107,163,255,0.08))' : 'var(--surface)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text)' }}>All assignments</div>
                <div className="ui-text-xs ui-text-muted" style={{ marginTop: 4 }}>{submissions.length} submissions</div>
              </button>
              {summary.map((s) => (
                <button key={s.assignmentId}
                  onClick={() => setFilter(s.assignmentId)}
                  style={{ textAlign: 'left', padding: 14, borderRadius: 12, cursor: 'pointer', border: `1px solid ${filter === s.assignmentId ? 'var(--accent)' : 'var(--border)'}`, background: filter === s.assignmentId ? 'var(--accent-glow, rgba(107,163,255,0.08))' : 'var(--surface)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                  <div className="ui-flex ui-flex-gap-2" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                    <Badge variant="primary">{s.submitted}/{s.totalParticipants} submitted</Badge>
                    {s.pending > 0 ? <Badge variant="warning">{s.pending} to grade</Badge> : <Badge variant="success">All graded</Badge>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submissions list */}
      {filtered.length > 0 && (
        <div className="ui-card">
          <div className="ui-card__body ui-flex-col" style={{ gap: 12 }}>
            {filtered.map((sub) => (
              <SubmissionCard key={sub._id} sub={sub} token={token} onGraded={() => qc.invalidateQueries({ queryKey: ['ws-submissions', workshopId, token] })} />
            ))}
          </div>
        </div>
      )}
      {filtered.length === 0 && summary.length > 0 && (
        <div className="ui-card"><EmptyState icon={FileText} title="No submissions yet" size="sm" /></div>
      )}
    </div>
  );
}

function SubmissionCard({ sub, token, onGraded }: { sub: SubRow; token: string | null; onGraded: () => void }) {
  const [grade, setGrade] = useState<string>(sub.grade != null ? String(sub.grade) : '');
  const [feedback, setFeedback] = useState(sub.feedback || '');
  const [open, setOpen] = useState(false);

  const gradeMut = useMutation({
    mutationFn: () => apiRequest(`/workshops/submissions/${sub._id}/grade`, {
      method: 'POST', token, body: JSON.stringify({ grade: Number(grade), feedback }),
    }),
    onSuccess: () => { toast.success('Graded'); setOpen(false); onGraded(); },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  const initials = sub.participantName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="ui-flex ui-flex-between ui-flex-wrap" style={{ gap: 10, alignItems: 'flex-start' }}>
        <div className="ui-flex ui-flex-gap-3" style={{ alignItems: 'center', minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>
            {sub.avatarUrl ? <img src={sub.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{sub.participantName}</div>
            <div className="ui-text-xs ui-text-muted">{sub.assignmentTitle} · {formatDateTime(sub.submittedAt)}</div>
          </div>
        </div>
        <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
          {typeof sub.grade === 'number'
            ? <Badge variant="success">{sub.grade}/{sub.maxPoints}</Badge>
            : <Badge variant="warning">Ungraded</Badge>}
          <Button size="sm" variant={open ? 'outline' : 'primary'} onClick={() => setOpen((v) => !v)}>{open ? 'Close' : (sub.grade != null ? 'Edit grade' : 'Grade')}</Button>
        </div>
      </div>

      {/* Submission content */}
      {(sub.content || sub.linkUrl || sub.fileUrl) && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'var(--surface-soft)' }}>
          {sub.content && <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--muted)', whiteSpace: 'pre-line' }}>{sub.content}</p>}
          <div className="ui-flex ui-flex-gap-2 ui-flex-wrap">
            {sub.linkUrl && <a href={sub.linkUrl} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn--outline ui-btn--sm"><ExternalLink size={13} /> Open link</a>}
            {sub.fileUrl && (
              <button className="ui-btn ui-btn--outline ui-btn--sm" onClick={() => { const a = document.createElement('a'); a.href = sub.fileUrl!; a.download = sub.fileName || 'submission'; a.click(); }}>
                <Download size={13} /> {sub.fileName || 'Download file'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grade form */}
      {open && (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, alignItems: 'end' }}>
          <label className="ui-input-wrap"><span className="ui-input-label">Grade (/{sub.maxPoints})</span>
            <input className="ui-input" type="number" min={0} max={sub.maxPoints} value={grade} onChange={(e) => setGrade(e.target.value)} /></label>
          <label className="ui-input-wrap"><span className="ui-input-label">Feedback</span>
            <input className="ui-input" value={feedback} placeholder="Optional feedback…" onChange={(e) => setFeedback(e.target.value)} /></label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="sm" isLoading={gradeMut.isPending} disabled={grade === ''} onClick={() => gradeMut.mutate()}>Save Grade</Button>
          </div>
        </div>
      )}

      {sub.feedback && !open && <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>Feedback: {sub.feedback}</p>}
    </div>
  );
}

/* ── Leaderboard ── */
type LeaderRow = { userId: string; name: string; email?: string; avatarUrl?: string; rank: number; submitted: number; graded: number; assignmentCount: number; totalPoints: number; maxTotal: number; completionPercentage: number; scorePercentage: number };

export function Leaderboard({ workshopId, token }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['ws-leaderboard', workshopId, token],
    queryFn: () => apiRequest<{ assignmentCount: number; maxTotal: number; leaderboard: LeaderRow[] }>(`/workshops/${workshopId}/leaderboard`, { token }),
    enabled: Boolean(token),
  });

  if (isLoading) return <div className="ui-card"><div className="ui-card__body"><Spinner label="Loading leaderboard…" /></div></div>;
  const rows = data?.leaderboard || [];
  const medalColor = (rank: number) => rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b45309' : 'var(--muted)';

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={17} style={{ color: '#f59e0b' }} /> Leaderboard</h3>
        <Badge variant="neutral">{data?.assignmentCount ?? 0} assignments · {data?.maxTotal ?? 0} pts</Badge>
      </div>
      <div className="ui-card__body ui-card__body--flush">
        {rows.length === 0 ? (
          <EmptyState icon={Trophy} title="No participants yet" description="The leaderboard ranks approved participants by graded assignment points." />
        ) : (
          <div className="ui-table--scroll">
            <table className="ui-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Rank</th>
                  <th>Participant</th>
                  <th style={{ textAlign: 'center' }}>Submitted</th>
                  <th style={{ textAlign: 'center' }}>Points</th>
                  <th style={{ textAlign: 'center' }}>Score</th>
                  <th style={{ textAlign: 'center' }}>Completion</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.registrationId || r.userId}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 800, color: medalColor(r.rank) }}>
                        {r.rank <= 3 ? <Medal size={16} style={{ color: medalColor(r.rank) }} /> : null}#{r.rank}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div className="ui-text-xs ui-text-muted">{r.email}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{r.submitted}/{r.assignmentCount}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.totalPoints}/{r.maxTotal}</td>
                    <td style={{ textAlign: 'center' }}><Badge variant={r.scorePercentage >= 60 ? 'success' : 'neutral'}>{r.scorePercentage}%</Badge></td>
                    <td style={{ textAlign: 'center' }}><Badge variant={r.completionPercentage >= 75 ? 'success' : 'warning'}>{r.completionPercentage}%</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
