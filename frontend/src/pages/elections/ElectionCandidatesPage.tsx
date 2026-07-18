import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, UserPlus, Hash, Calendar } from 'lucide-react';
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
  phase?: number;
  votingResults?: {
    totalVotes?: number;
    votePercentage?: number;
    rank?: number;
    isWinner?: boolean;
    isRunnerUp?: boolean;
  };
  memberId?: {
    studentId?: string;
    currentYear?: number;
    batch?: number;
    userId?: { firstName?: string; lastName?: string; email?: string; avatarUrl?: string };
  };
};

type PostEligibility = {
  post: {
    _id: string;
    code: string;
    title: string;
    minYear?: number;
    minEcYears?: number;
    displayOrder?: number;
  };
  isEligible: boolean;
  reason: string | null;
  memberYear: number;
  memberEcYears: number;
};

type EligibilityResponse = {
  member: {
    _id: string;
    studentId: string;
    currentYear: number;
    ecYears: number;
    ecExperience?: Array<{
      postName: string;
      startDate: string;
      endDate?: string;
      isCurrent?: boolean;
    }>;
  };
  eligibility: PostEligibility[];
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

  const [form, setForm] = useState({ memberId: '', postId: '' });
  const [showForm, setShowForm] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [processingCandidateId, setProcessingCandidateId] = useState<string | null>(null);
  const [selectedMemberForEligibility, setSelectedMemberForEligibility] = useState<string>('');

  const { data: members = [] } = useQuery({
    queryKey: ['members-for-candidacy', token],
    queryFn: () => apiRequest<Array<{ 
      _id: string; 
      studentId: string; 
      batch: number; 
      currentYear: number; 
      status?: string;
      membershipStatus?: { status: string };
      userId?: { firstName?: string; lastName?: string };
    }>>('/membership/members', { token }),
    enabled: Boolean(token),
  });

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['election-candidates', id, token],
    queryFn: () => apiRequest<CandidateRow[]>(`/enhanced-elections/${id}/candidates`, { token }),
    enabled: Boolean(hasValidId && token),
  });

  const { data: election } = useQuery({
    queryKey: ['election-detail', id, token],
    queryFn: () => apiRequest<{ _id: string; currentPhase: number; name: string }>(`/enhanced-elections/${id}`, { token }),
    enabled: Boolean(hasValidId && token),
  });

  const isPhase1 = (election?.currentPhase ?? 1) === 1;

  // Fetch eligible posts for selected member (Phase 2 only)
  const { data: eligibility, isLoading: eligibilityLoading, error: eligibilityError } = useQuery({
    queryKey: ['member-eligibility', id, selectedMemberForEligibility || form.memberId, token],
    queryFn: async () => {
      const result = await apiRequest<EligibilityResponse>(
        `/enhanced-elections/${id}/eligible-posts?memberId=${selectedMemberForEligibility || form.memberId}`, 
        { token }
      );
      console.log('✅ Eligibility API Response:', result);
      return result;
    },
    enabled: Boolean(hasValidId && token && !isPhase1 && (selectedMemberForEligibility || form.memberId)),
    retry: false, // Don't retry on error
    onError: (error) => {
      console.error('❌ Eligibility API Error:', error);
    },
  });

  const addMut = useMutation({
    mutationFn: () => apiRequest('/enhanced-elections/candidates', {
      method: 'POST', token,
      body: JSON.stringify({
        electionId: id,
        memberId: form.memberId,
        // Never send postId for Phase 1 — backend will reject it
        postId: isPhase1 ? null : (form.postId || null),
        phase: isPhase1 ? 1 : 2,
        // EC years are calculated on the backend from member's ecExperience
      }),
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['election-candidates', id, token] });
      setForm({ memberId: '', postId: '' });
      setShowForm(false);
      toast.success('Candidate added');
    },
    onError: e => toast.error(normalizeApiError(e)),
  });

  const validateMut = useMutation({
    mutationFn: ({ candidateId, action, reason }: { candidateId: string; action: 'Approved' | 'Rejected'; reason?: string }) => {
      setProcessingCandidateId(candidateId);
      return apiRequest(`/enhanced-elections/candidates/${candidateId}/review`, {
        method: 'POST', token,
        body: JSON.stringify({ action, reason: reason || '' }),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['election-candidates', id, token] });
      toast.success('Candidate updated');
      setProcessingCandidateId(null);
    },
    onError: e => {
      toast.error(normalizeApiError(e));
      setProcessingCandidateId(null);
    },
  });

  // Filter members by search
  const filteredMembers = members
    .filter(m => {
      const status = m.membershipStatus?.status || m.status;
      return status === 'Active';
    })
    .filter(m => {
      if (!memberSearch) return true;
      const searchLower = memberSearch.toLowerCase();
      const fullName = `${m.userId?.firstName || ''} ${m.userId?.lastName || ''}`.toLowerCase();
      return (
        m.studentId.toLowerCase().includes(searchLower) ||
        fullName.includes(searchLower) ||
        `batch ${m.batch}`.includes(searchLower)
      );
    });
  // Group candidates by phase-appropriate context
  // Note: Check individual candidate's phase, not just election phase
  // Some elections in Phase 2 may still have Phase 1 candidates (batch reps)
  const grouped = candidates.reduce((acc, c) => {
    // Determine grouping based on candidate's actual phase or post assignment
    const candidateIsPhase1 = !c.postId; // Phase 1 candidates don't have postId
    const key = candidateIsPhase1
      ? `Batch ${c.memberId?.batch || 'Unknown'}`
      : (c.postId?.title || 'Unassigned Post');
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, CandidateRow[]>);

  return (
    <div className="ui-page">
      <PageHeader
        title={isPhase1 ? 'Phase 1 — Batch Representative Candidates' : 'Phase 2 — Office Bearer Candidates'}
        description={isPhase1
          ? 'Add and review batch representative candidates. Top 5 per batch become Executive Members.'
          : 'Manage office bearer candidates for EC posts 1-11. Only Phase 1 winners are eligible.'
        }
        backButton
        breadcrumbs={[{ label: 'Elections', href: '/dashboard/elections' }, { label: isPhase1 ? 'Phase 1 Candidates' : 'Phase 2 Candidates' }]}
        actions={
          <Button leftIcon={UserPlus} onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Cancel' : 'Add Candidate'}
          </Button>
        }
      />

      {!hasValidId && <Alert variant="error">Invalid election link.</Alert>}

      {/* Phase indicator banner */}
      <div style={{
        padding: '16px 20px',
        borderRadius: 12,
        background: isPhase1 ? 'rgba(59,130,246,0.08)' : 'rgba(147,51,234,0.08)',
        border: `1px solid ${isPhase1 ? 'rgba(59,130,246,0.2)' : 'rgba(147,51,234,0.2)'}`,
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: isPhase1 ? 'rgba(59,130,246,0.15)' : 'rgba(147,51,234,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1.1rem',
            color: isPhase1 ? '#2563eb' : '#7c3aed',
          }}>
            {election?.currentPhase ?? 1}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
              {isPhase1 ? 'Phase 1 — Batch Representatives' : 'Phase 2 — Office Bearers'}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
              {isPhase1
                ? 'Candidates compete within their own batch. No post assignment — each batch elects up to 5 representatives.'
                : 'Phase 1 winners compete for specific EC posts. Each post has minimum year and EC experience requirements.'}
            </p>
          </div>
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
                    <label className="ui-input-label">Search Member</label>
                    <input 
                      type="text"
                      className="ui-input" 
                      placeholder="Search by name, student ID, or batch..."
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="ui-grid-3" style={{ marginBottom: 16 }}>
                  <div className="ui-input-wrap">
                    <label className="ui-input-label">Member *</label>
                    <select 
                      className="ui-select" 
                      value={form.memberId} 
                      onChange={e => {
                        setForm(f => ({ ...f, memberId: e.target.value, postId: '' }));
                        setSelectedMemberForEligibility(e.target.value);
                      }} 
                      required
                    >
                      <option value="">Select member…</option>
                      {filteredMembers.map(m => {
                        const fullName = `${m.userId?.firstName || ''} ${m.userId?.lastName || ''}`.trim();
                        const displayName = fullName || 'No name';
                        return (
                          <option key={m._id} value={m._id}>
                            {m.studentId} · {displayName} · Batch {m.batch} · Year {m.currentYear}
                          </option>
                        );
                      })}
                    </select>
                    {memberSearch && <p className="ui-text-xs ui-text-muted" style={{ marginTop: 4 }}>Showing {filteredMembers.length} members</p>}
                  </div>

                  {/* Post selector — only shown for Phase 2 */}
                  {!isPhase1 && (
                  <div className="ui-input-wrap">
                    <label className="ui-input-label">
                      Post * (required for Phase 2)
                    </label>
                    {eligibilityLoading && form.memberId && (
                      <div style={{ padding: 12, textAlign: 'center', fontSize: '0.85rem', color: 'var(--muted)' }}>
                        <Spinner size="sm" /> Checking eligibility...
                      </div>
                    )}
                    {eligibilityError && form.memberId && (
                      <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: 12 }}>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#dc2626', fontWeight: 600 }}>
                          ⚠️ Cannot load eligibility data
                        </p>
                        <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#dc2626', fontFamily: 'monospace', background: 'rgba(255,255,255,0.5)', padding: '6px 8px', borderRadius: 4 }}>
                          Error: {normalizeApiError(eligibilityError)}
                        </p>
                        <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#dc2626' }}>
                          <strong>Possible causes:</strong>
                        </p>
                        <ul style={{ margin: '4px 0 0 20px', fontSize: '0.75rem', color: '#dc2626', paddingLeft: 0, lineHeight: 1.6 }}>
                          <li>Member record not found in database</li>
                          <li>Election ID is invalid or election not found</li>
                          <li>Backend API error (check console for details)</li>
                        </ul>
                      </div>
                    )}
                    {!eligibilityLoading && !eligibilityError && form.memberId && eligibility && eligibility.member && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ padding: 12, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)' }}>
                          <p style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                            Member Qualifications
                          </p>
                          <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: 'var(--muted)' }}>
                            <span>Year: <strong style={{ color: 'var(--text)' }}>{eligibility.member?.currentYear || 'N/A'}</strong></span>
                            <span>EC Experience: <strong style={{ color: 'var(--text)' }}>
                              {eligibility.member?.ecYears ?? 0} {eligibility.member?.ecYears === 1 ? 'year' : 'years'}
                            </strong></span>
                          </div>
                          <div style={{ marginTop: 12 }}>
                            <p style={{ margin: '0 0 6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>
                              {eligibility.eligibility?.filter(e => e.isEligible).length || 0} eligible posts:
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {eligibility.eligibility?.filter(e => e.isEligible).map(e => (
                                <Badge key={e.post._id} variant="success" style={{ fontSize: '0.75rem' }}>
                                  {e.post.title}
                                </Badge>
                              )) || null}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <select
                      className="ui-select"
                      value={form.postId}
                      onChange={e => setForm(f => ({ ...f, postId: e.target.value }))}
                      required
                      disabled={!form.memberId || !eligibility?.eligibility || eligibilityError}
                    >
                      <option value="">
                        {!form.memberId ? "— Select a member first —" : eligibilityError ? "— Error loading posts —" : !eligibility ? "— Loading posts... —" : "— Select a post —"}
                      </option>
                      {eligibility?.eligibility?.map(e => {
                        const label = e.isEligible
                          ? `✓ ${e.post.title}`
                          : `✗ ${e.post.title} (${e.reason})`;
                        return (
                          <option key={e.post._id} value={e.post._id} disabled={!e.isEligible}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                    {form.postId && eligibility && (
                      (() => {
                        const selected = eligibility.eligibility?.find(e => e.post._id === form.postId);
                        if (!selected) return null;
                        return selected.isEligible ? (
                          <div style={{ marginTop: 8, padding: 10, background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <CheckCircle size={14} /> Eligible for {selected.post.title}
                            </p>
                          </div>
                        ) : (
                          <div style={{ marginTop: 8, padding: 10, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <XCircle size={14} /> Not eligible: {selected.reason}
                            </p>
                          </div>
                        );
                      })()
                    )}
                  </div>
                  )}
                  {/* Phase 1 info — no post needed */}
                  {isPhase1 && (
                    <div className="ui-input-wrap">
                      <label className="ui-input-label">Post</label>
                      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                        Not applicable — Phase 1 candidates are Batch Representatives
                      </div>
                    </div>
                  )}
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

      {/* Candidate cards grouped by batch (Phase 1) or post (Phase 2) */}
      {!isLoading && Object.entries(grouped).map(([groupTitle, list]) => (
        <div key={groupTitle} className="ui-card" style={{ padding: 0 }}>
          <div className="ui-card__header">
            <h3 className="ui-card__title">{groupTitle}</h3>
            <Badge variant="neutral">{list.length} candidate{list.length !== 1 ? 's' : ''}</Badge>
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

                    {/* Phase 1 Winner Badge (for Phase 1 candidates shown in Phase 2 election) */}
                    {!isPhase1 && !c.postId && c.votingResults?.isWinner && (
                      <div style={{ 
                        marginBottom: 10, 
                        padding: '8px 12px', 
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.08) 100%)', 
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <div style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: 'rgba(34, 197, 94, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.9rem'
                        }}>
                          🏆
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#16a34a' }}>
                            Phase 1 Winner
                          </p>
                          {c.votingResults?.totalVotes !== undefined && (
                            <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#16a34a', opacity: 0.8 }}>
                              {c.votingResults.totalVotes} votes · Rank #{c.votingResults.rank || 'N/A'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Show Phase 1 results for non-winners too (when in Phase 2) */}
                    {!isPhase1 && !c.postId && !c.votingResults?.isWinner && c.votingResults?.totalVotes !== undefined && c.votingResults.totalVotes > 0 && (
                      <div style={{ 
                        marginBottom: 10, 
                        padding: '6px 10px', 
                        background: 'rgba(100, 116, 139, 0.08)', 
                        border: '1px solid rgba(100, 116, 139, 0.2)',
                        borderRadius: 8,
                        fontSize: '0.75rem',
                        color: 'var(--muted)'
                      }}>
                        Phase 1: {c.votingResults.totalVotes} votes · Rank #{c.votingResults.rank || 'N/A'} (Did not advance)
                      </div>
                    )}

                    {c.status === 'Rejected' && c.rejectionReason && (
                      <p style={{ margin: '0 0 10px', fontSize: '0.75rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '6px 10px', borderRadius: 8 }}>
                        {c.rejectionReason}
                      </p>
                    )}

                    {needsReview(c.status) && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="success" size="sm" leftIcon={CheckCircle} 
                          isLoading={processingCandidateId === c._id}
                          disabled={processingCandidateId !== null && processingCandidateId !== c._id}
                          onClick={() => validateMut.mutate({ candidateId: c._id, action: 'Approved' })}>
                          Approve
                        </Button>
                        <Button variant="danger" size="sm" leftIcon={XCircle} 
                          isLoading={processingCandidateId === c._id}
                          disabled={processingCandidateId !== null && processingCandidateId !== c._id}
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
