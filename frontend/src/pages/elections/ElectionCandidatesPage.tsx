import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, UserPlus, GraduationCap, Hash, Calendar } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import toast from 'react-hot-toast';

type CandidateRow = {
  _id: string;
  status: 'Submitted' | 'Under_Review' | 'Approved' | 'Rejected' | 'Withdrawn' | 'Pending';
  rejectionReason?: string;
  postId?: { title?: string } | null;
  memberId?: {
    studentId?: string;
    currentYear?: number;
    batch?: number;
    userId?: { firstName?: string; lastName?: string; email?: string; avatarUrl?: string };
  };
};

const STATUS_CFG: Record<string, { variant: 'warning' | 'success' | 'error' | 'neutral'; label: string }> = {
  Pending:      { variant: 'warning', label: 'Pending' },
  Submitted:    { variant: 'warning', label: 'Submitted' },
  Under_Review: { variant: 'warning', label: 'Under Review' },
  Approved:     { variant: 'success', label: 'Approved' },
  Rejected:     { variant: 'error',   label: 'Rejected' },
  Withdrawn:    { variant: 'neutral', label: 'Withdrawn' },
};

// Candidates that need review (can be approved/rejected)
const needsReview = (status: string) =>
  status === 'Pending' || status === 'Submitted' || status === 'Under_Review';

export function ElectionCandidatesPage() {
  const { id } = useParams();
  const { token, loading } = useAuth();
  const qc = useQueryClient();
  const hasValidId = Boolean(id && /^[a-fA-F0-9]{24}$/.test(id));

  const [form, setForm] = useState({ memberId: '', postId: '', memberEcYears: 0 });
  const [showForm, setShowForm] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ['members-for-candidacy', token],
    queryFn: () => apiRequest<Array<{ 
      _id: string; 
      studentId: string; 
      batch: number; 
      currentYear: number; 
      status?: string;
      membershipStatus?: { status: string };
    }>>('/membership/members', { token }),
    enabled: Boolean(token),
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['ec-posts-for-candidacy', token],
    queryFn: () => apiRequest<Array<{ _id: string; title: string; isActive?: boolean }>>('/governance/ec-posts', { token }),
    enabled: Boolean(token),
  });

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['election-candidates', id, token],
    queryFn: () => apiRequest<CandidateRow[]>(`/elections/${id}/candidates`, { token }),
    enabled: Boolean(hasValidId && token),
  });

  // Fetch election to know current phase so we can hide postId for Phase 1
  const { data: election } = useQuery({
    queryKey: ['election-detail', id, token],
    queryFn: () => apiRequest<{ _id: string; currentPhase: number; name: string }>(`/elections/${id}`, { token }),
    enabled: Boolean(hasValidId && token),
  });

  const isPhase1 = (election?.currentPhase ?? 1) === 1;

  const addMut = useMutation({
    mutationFn: () => apiRequest('/elections/candidates', {
      method: 'POST', token,
      body: JSON.stringify({
        electionId: id,
        memberId: form.memberId,
        // Never send postId for Phase 1 — backend will reject it
        postId: isPhase1 ? null : (form.postId || null),
        memberEcYears: form.memberEcYears,
      }),
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['election-candidates', id, token] });
      setForm({ memberId: '', postId: '', memberEcYears: 0 });
      setShowForm(false);
      toast.success('Candidate added');
    },
    onError: e => toast.error(normalizeApiError(e)),
  });

  const validateMut = useMutation({
    mutationFn: ({ candidateId, action, reason }: { candidateId: string; action: 'Approved' | 'Rejected'; reason?: string }) =>
      apiRequest(`/elections/candidates/${candidateId}/validate`, {
        method: 'PATCH', token,
        body: JSON.stringify({ action, reason: reason || '' }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['election-candidates', id, token] });
      toast.success('Candidate updated');
    },
    onError: e => toast.error(normalizeApiError(e)),
  });

  // Group by post
  const byPost = candidates.reduce((acc, c) => {
    const key = c.postId?.title || 'Batch Representative';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, CandidateRow[]>);

  return (
    <div className="ui-page">
      <PageHeader
        title="Candidate Management"
        description="Review and manage candidacy eligibility"
        backButton
        breadcrumbs={[{ label: 'Elections', href: '/dashboard/elections' }, { label: 'Candidates' }]}
        actions={
          <Button leftIcon={UserPlus} onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Cancel' : 'Add Candidate'}
          </Button>
        }
      />

      {!hasValidId && <Alert variant="error">Invalid election link.</Alert>}

      {/* Eligibility guide */}
      <div className="ui-card">
        <div className="ui-card__body" style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { icon: GraduationCap, title: 'Phase 1', desc: 'Representatives — no post required. Any active member can apply.' },
            { icon: Hash,          title: 'Phase 2', desc: 'Office bearers — post assignment mandatory. Year & EC experience constraints apply.' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.title} style={{ display: 'flex', gap: 12, flex: 1, minWidth: 240 }}>
                <div style={{ padding: 10, borderRadius: 12, background: 'var(--gradient-primary)', color: '#fff', flexShrink: 0, alignSelf: 'flex-start' }}>
                  <Icon size={18} />
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>{item.title}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ overflow: 'hidden' }}>
          <div className="ui-card">
            <div className="ui-card__header"><h3 className="ui-card__title">Add Candidate</h3></div>
            <div className="ui-card__body">
              <form onSubmit={e => { e.preventDefault(); addMut.mutate(); }}>
                <div className="ui-grid-3" style={{ marginBottom: 16 }}>
                  <div className="ui-input-wrap">
                    <label className="ui-input-label">Member *</label>
                    <select className="ui-select" value={form.memberId} onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))} required>
                      <option value="">Select member…</option>
                      {members
                        .filter(m => {
                          const status = m.membershipStatus?.status || m.status;
                          return status === 'Active';
                        })
                        .map(m => (
                          <option key={m._id} value={m._id}>{m.studentId} · Batch {m.batch} · Year {m.currentYear}</option>
                        ))}
                    </select>
                  </div>

                  {/* Post selector — always shown so admin can assign any role */}
                  <div className="ui-input-wrap">
                    <label className="ui-input-label">
                      Post {isPhase1 ? '(leave empty for Phase 1)' : '* required for Phase 2'}
                    </label>
                    <select
                      className="ui-select"
                      value={form.postId}
                      onChange={e => setForm(f => ({ ...f, postId: e.target.value }))}
                      required={!isPhase1}
                    >
                      <option value="">— No post (Batch Representative) —</option>
                      {posts.filter(p => p.isActive !== false).map(p => (
                        <option key={p._id} value={p._id}>{p.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="ui-input-wrap">
                    <label className="ui-input-label">EC Years Experience</label>
                    <input type="number" min={0} className="ui-input" value={form.memberEcYears}
                      onChange={e => setForm(f => ({ ...f, memberEcYears: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="ui-flex ui-flex-gap-2" style={{ justifyContent: 'flex-end' }}>
                  <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button type="submit" isLoading={addMut.isPending}>Add Candidate</Button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}><Spinner size="lg" /></div>}

      {/* Empty */}
      {!isLoading && candidates.length === 0 && (
        <div className="ui-card">
          <EmptyState icon={UserPlus} title="No candidates yet" description="Add candidates using the button above" />
        </div>
      )}

      {/* Candidate cards grouped by post */}
      {!isLoading && Object.entries(byPost).map(([postTitle, list]) => (
        <div key={postTitle} className="ui-card" style={{ padding: 0 }}>
          <div className="ui-card__header">
            <h3 className="ui-card__title">{postTitle}</h3>
            <Badge variant="neutral">{list.length} candidates</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, padding: 20 }}>
            {list.map((c, i) => {
              const u = c.memberId?.userId;
              const name = `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || u?.email || 'Unknown';
              const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.Pending;

              return (
                <motion.div key={c._id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  style={{
                    borderRadius: 18, border: '1px solid var(--border)', background: 'var(--panel-strong)',
                    overflow: 'hidden', transition: 'box-shadow 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  {/* Card header with gradient */}
                  <div style={{ height: 80, background: 'var(--gradient-primary)', position: 'relative' }} />

                  {/* Avatar */}
                  <div style={{ padding: '0 20px', marginTop: -36 }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
                      border: '3px solid var(--panel-strong)',
                      background: 'var(--gradient-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: '1.5rem',
                    }}>
                      {u?.avatarUrl
                        ? <img src={u.avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : name.charAt(0).toUpperCase()
                      }
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: '10px 20px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{name}</h4>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                      {c.memberId?.studentId && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--muted)' }}>
                          <Hash size={12} /> {c.memberId.studentId}
                        </div>
                      )}
                      {c.memberId?.batch && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--muted)' }}>
                          <Calendar size={12} /> Batch {c.memberId.batch} · Year {c.memberId.currentYear}
                        </div>
                      )}
                    </div>

                    {c.status === 'Rejected' && c.rejectionReason && (
                      <p style={{ margin: '0 0 10px', fontSize: '0.75rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '6px 10px', borderRadius: 8 }}>
                        {c.rejectionReason}
                      </p>
                    )}

                    {needsReview(c.status) && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="success" size="sm" leftIcon={CheckCircle} isLoading={validateMut.isPending}
                          onClick={() => validateMut.mutate({ candidateId: c._id, action: 'Approved' })}>
                          Approve
                        </Button>
                        <Button variant="danger" size="sm" leftIcon={XCircle} isLoading={validateMut.isPending}
                          onClick={() => {
                            const reason = window.prompt('Rejection reason', 'Eligibility criteria not met') || 'Rejected';
                            validateMut.mutate({ candidateId: c._id, action: 'Rejected', reason });
                          }}>
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
