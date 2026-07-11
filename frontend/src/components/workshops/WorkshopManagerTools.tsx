import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, CalendarClock, ListChecks, ClipboardList, Check, X,
  UserCheck, Award, Video, MapPin,
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
    mutationFn: ({ sessionId, userId, attended }: { sessionId: string; userId: string; attended: boolean }) =>
      apiRequest(`/workshops/${workshopId}/sessions/${sessionId}/attendance`, { method: 'POST', token, body: JSON.stringify({ userId, attended }) }),
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
