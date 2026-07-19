import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Vote, Calendar, Clock, Users, BarChart2, Play, Square, CheckCircle, AlertCircle, ArrowLeft, Image, UserPlus, RotateCcw, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { StatsCard } from '../../components/ui/StatsCard';
import { formatDateTime } from '../../lib/utils';
import { usePosterGenerator } from '../../hooks/usePosterGenerator';
import toast from 'react-hot-toast';

type ElectionDetail = {
  _id: string;
  name: string;
  currentPhase: number;
  startsOn: string;
  endsOn: string;
  status: 'Draft' | 'Setup' | 'Phase1_Active' | 'Phase1_Completed' | 'Phase2_Active' | 'Phase2_Completed' | 'Completed' | 'Cancelled';
  termId?: { name?: string; _id?: string };
  phase1EndsOn?: string;
  phase2StartsOn?: string;
  createdAt?: string;
  electionType?: 'full' | 'phase2_only' | 'single_post';
  targetPost?: { _id: string; title: string } | null;
};

type CandidateStats = {
  phase1: { total: number; approved: number; pending: number; rejected: number };
  phase2: { total: number; approved: number; pending: number; rejected: number };
};

type VotingStats = {
  phase1: { totalVotes: number; eligibleVoters: number; turnoutPercentage: number };
  phase2: { totalVotes: number; eligibleVoters: number; turnoutPercentage: number };
};

const STATUS_CFG: Record<string, { label: string; variant: 'success' | 'warning' | 'neutral' | 'error'; icon: any }> = {
  Draft: { label: 'Draft', variant: 'neutral', icon: Clock },
  Setup: { label: 'Setup', variant: 'warning', icon: Clock },
  Phase1_Active: { label: 'Phase 1 Active', variant: 'success', icon: Play },
  Phase1_Completed: { label: 'Phase 1 Completed', variant: 'neutral', icon: CheckCircle },
  Phase2_Active: { label: 'Phase 2 Active', variant: 'success', icon: Play },
  Phase2_Completed: { label: 'Phase 2 Completed', variant: 'neutral', icon: CheckCircle },
  Completed: { label: 'Completed', variant: 'neutral', icon: CheckCircle },
  Cancelled: { label: 'Cancelled', variant: 'error', icon: AlertCircle },
};

const isElectionActive = (status: string) => {
  return status === 'Phase1_Active' || status === 'Phase2_Active';
};

const phaseLabel = (p: number) => p === 1 ? 'Phase 1 — Batch Representatives' : 'Phase 2 — Office Bearers';

export function ElectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const qc = useQueryClient();
  const { openPosterGenerator, PosterModal } = usePosterGenerator();

  // State for Phase 2 post selection modal
  const [showPostSelectionModal, setShowPostSelectionModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const hasValidId = Boolean(id && /^[a-fA-F0-9]{24}$/.test(id));
  const canManage = Boolean(user?.roles.some(r => ['Election Commissioner', 'Moderator'].includes(r)));

  const { data: election, isLoading } = useQuery({
    queryKey: ['election-detail', id, token],
    queryFn: () => apiRequest<ElectionDetail>(`/elections/${id}`, { token }),
    enabled: Boolean(hasValidId && token),
  });

  // Check if current user has already applied
  const { data: myApplication, isLoading: isLoadingApplication } = useQuery({
    queryKey: ['my-election-application', id, token],
    queryFn: async () => {
      try {
        const candidates = await apiRequest<Array<{ 
          _id: string;
          memberId?: { _id?: string; userId?: { _id?: string } }; 
          status: string;
        }>>(`/elections/${id}/candidates`, { token });
        
        // Compare string versions of IDs to ensure match
        const userIdStr = user?._id?.toString();
        
        // Try to find by userId comparison
        const app = candidates.find(c => {
          const candidateUserId = c.memberId?.userId?._id?.toString();
          return candidateUserId === userIdStr;
        });
        
        console.log('[Election Detail] Current user ID:', userIdStr);
        console.log('[Election Detail] All candidates:', candidates.map(c => ({
          id: c._id,
          memberUserId: c.memberId?.userId?._id?.toString(),
          status: c.status
        })));
        console.log('[Election Detail] Found application:', app);
        
        return app || null; // Return null instead of undefined if not found
      } catch (error) {
        console.error('[Election Detail] Error fetching candidates:', error);
        return null;
      }
    },
    enabled: Boolean(hasValidId && token && user),
    staleTime: 0, // Always refetch to ensure fresh data
    refetchOnMount: true,
  });

  // Check user's eligibility from profile
  const { data: profile } = useQuery({
    queryKey: ['my-profile', token],
    queryFn: () => apiRequest<{
      membership: {
        status: string;
        academicRecord?: { currentCgpa?: number };
        attendanceRecord?: { overallAttendancePercentage?: number };
        electionEligibility?: { isEligibleForCandidacy?: boolean };
      } | null;
    }>('/auth/me', { token }),
    enabled: Boolean(token && user),
  });

  const { data: candidateStats } = useQuery({
    queryKey: ['election-candidate-stats', id, token],
    queryFn: async () => {
      // Fetch all candidates and compute stats
      const candidates = await apiRequest<Array<{ status: string; phase?: number }>>(`/elections/${id}/candidates`, { token });
      const phase1 = candidates.filter(c => !c.phase || c.phase === 1);
      const phase2 = candidates.filter(c => c.phase === 2);
      return {
        phase1: {
          total: phase1.length,
          approved: phase1.filter(c => c.status === 'Approved').length,
          pending: phase1.filter(c => c.status === 'Submitted' || c.status === 'Under_Review' || c.status === 'Pending').length,
          rejected: phase1.filter(c => c.status === 'Rejected').length,
        },
        phase2: {
          total: phase2.length,
          approved: phase2.filter(c => c.status === 'Approved').length,
          pending: phase2.filter(c => c.status === 'Submitted' || c.status === 'Under_Review' || c.status === 'Pending').length,
          rejected: phase2.filter(c => c.status === 'Rejected').length,
        },
      };
    },
    enabled: Boolean(hasValidId && token),
  });

  const { data: votingStats } = useQuery({
    queryKey: ['election-voting-stats', id, token],
    queryFn: async () => {
      // Fetch voting statistics from backend
      try {
        const stats = await apiRequest<VotingStats>(`/elections/${id}/voting-stats`, { token });
        return stats;
      } catch (e) {
        // Fallback to default stats if endpoint doesn't exist
        return {
          phase1: { totalVotes: 0, eligibleVoters: 0, turnoutPercentage: 0 },
          phase2: { totalVotes: 0, eligibleVoters: 0, turnoutPercentage: 0 },
        };
      }
    },
    enabled: Boolean(hasValidId && token),
  });

  // Fetch eligible posts for Phase 2 application
  const { data: eligiblePosts = [] } = useQuery({
    queryKey: ['eligible-posts', id, token, user?._id],
    queryFn: async () => {
      try {
        // Get member ID first
        const memberRes = await apiRequest<{ _id: string }>('/membership/members/me', { token });
        const memberId = memberRes._id;
        
        // Fetch eligible posts for this member
        const response = await apiRequest<{ eligiblePosts: Array<{ _id: string; title: string; code: string; requiredEcYears?: number }> }>(
          `/enhanced-elections/${id}/eligible-posts?memberId=${memberId}`,
          { token }
        );
        return response.eligiblePosts || [];
      } catch (e) {
        console.error('Failed to fetch eligible posts:', e);
        return [];
      }
    },
    enabled: Boolean(hasValidId && token && user && (election?.currentPhase ?? 1) === 2),
  });

  const statusMut = useMutation({
    mutationFn: ({ status, phase }: { status: string; phase?: number }) =>
      apiRequest(`/elections/${id}/phase`, { 
        method: 'PATCH', 
        token, 
        body: JSON.stringify({ status, ...(phase && { phase }) }) 
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['election-detail', id, token] });
      toast.success('Election status updated');
    },
    onError: e => toast.error(normalizeApiError(e)),
  });

  const applyMut = useMutation({
    mutationFn: (postId?: string) => {
      const payload: any = {};
      
      // Only include postId if provided (for Phase 2 candidates)
      if (postId) {
        payload.postId = postId;
      }
      
      return apiRequest(`/elections/${id}/self-nominate`, {
        method: 'POST', 
        token,
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['my-election-application', id, token] });
      setShowPostSelectionModal(false);
      setSelectedPostId(null);
      toast.success('Application submitted! Your candidacy is pending Election Commission review.');
    },
    onError: e => {
      toast.error(normalizeApiError(e));
      setShowPostSelectionModal(false);
    },
  });

  if (!hasValidId) {
    return (
      <div className="ui-page">
        <Alert variant="error">Invalid election ID</Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="ui-page">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="ui-page">
        <EmptyState icon={AlertCircle} title="Election not found" description="This election may have been deleted or you don't have permission to view it." />
      </div>
    );
  }

  const cfg = STATUS_CFG[election.status] ?? STATUS_CFG.Draft;
  const StatusIcon = cfg.icon;
  const now = new Date();
  const starts = election.startsOn ? new Date(election.startsOn) : now;
  const ends = election.endsOn ? new Date(election.endsOn) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const isActive = isElectionActive(election.status);
  const pct = isActive ? Math.min(100, ((now.getTime() - starts.getTime()) / (ends.getTime() - starts.getTime())) * 100) : 0;
  const daysLeft = Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / 86400000));

  // Determine if user can apply as candidate
  const currentPhase = election.currentPhase ?? 1;
  const isPhase1 = currentPhase === 1;
  const isPhase2 = currentPhase === 2;
  const isNonFull = election.electionType === 'phase2_only' || election.electionType === 'single_post';
  
  // Allow nominations during:
  // - Phase 1: Draft, Setup, Phase1_Active
  // - Phase 2: Draft, Setup, Phase1_Completed, Phase2_Active
  const canAcceptNominations = isPhase1
    ? ['Draft', 'Setup', 'Phase1_Active'].includes(election.status)
    : isPhase2
    ? ['Draft', 'Setup', 'Phase1_Completed', 'Phase2_Active'].includes(election.status)
    : false;
    
  const isEligible = profile?.membership?.electionEligibility?.isEligibleForCandidacy ?? false;
  const hasApplied = Boolean(myApplication);
  const wasRejected = myApplication?.status === 'Rejected';

  // Don't show Apply button while checking application status
  // Allow reapplication if previous application was rejected
  const canApply = !isLoadingApplication && canAcceptNominations && isEligible && (!hasApplied || wasRejected) && !canManage;

  return (
    <div className="ui-page">
      <PageHeader
        title={election.name}
        description={phaseLabel(election.currentPhase)}
        backButton
        breadcrumbs={[
          { label: 'Elections', href: '/dashboard/elections' },
          { label: election.name },
        ]}
        actions={
          <div className="ui-flex ui-flex-gap-2">
            {canApply && (
              <Button variant="success" size="sm" leftIcon={UserPlus}
                isLoading={applyMut.isPending}
                onClick={() => {
                  if (isPhase2) {
                    // Show post selection modal for Phase 2
                    setShowPostSelectionModal(true);
                  } else {
                    // Phase 1: Direct application
                    const message = wasRejected
                      ? 'Reapply as a candidate for this election?\n\nYour previous application was rejected. This will submit a new application for Election Commission review.'
                      : 'Apply as a candidate for this election?\n\nYour application will be reviewed by the Election Commission.';
                    if (window.confirm(message)) {
                      applyMut.mutate(election.electionType === 'single_post' ? election.targetPost?._id : undefined);
                    }
                  }
                }}>
                {wasRejected ? 'Reapply as Candidate' : isPhase2 ? 'Apply for Phase 2 Post' : 'Apply as Candidate'}
              </Button>
            )}
            {hasApplied && myApplication && !wasRejected && (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Already Applied
                </span>
                <Badge variant={
                  myApplication.status === 'Approved' ? 'success' :
                  myApplication.status === 'Rejected' ? 'error' : 'warning'
                } style={{ width: 'fit-content' }}>
                  Status: {myApplication.status}
                </Badge>
              </div>
            )}
            {canManage && (
              <Button variant="outline" size="sm" leftIcon={Image}
                onClick={() => openPosterGenerator({
                  type: 'election',
                  title: election.currentPhase === 1 ? 'Choose Your Representatives' : 'Elect Your Leaders',
                  subtitle: election.name,
                  date: election.startsOn,
                  endDate: election.endsOn,
                  category: phaseLabel(election.currentPhase),
                  location: 'CSEDU Campus',
                  mode: 'In-person',
                  cta: 'Cast your vote at csedu-nexus.vercel.app',
                  description: election.currentPhase === 1
                    ? 'Vote for your batch representative who will voice your concerns and drive change for your year.'
                    : 'Elect the leaders who will shape our club\'s future — President, VP, General Secretary and more.',
                  additionalInfo: ['Democratic', 'Transparent', 'Verified'],
                  theme: election.currentPhase === 1 ? 'blue' : 'purple',
                })}>
                Generate Poster
              </Button>
            )}
            {isActive && (
              <Button variant="primary" leftIcon={Vote} onClick={() => navigate(`/dashboard/elections/${id}/vote`)}>
                Vote Now
              </Button>
            )}
          </div>
        }
      />

      {/* Status Banner */}
      <div className="ui-card" style={{ background: 'var(--gradient-primary)', color: '#fff', padding: '20px 24px' }}>
        <div className="ui-flex ui-flex-between ui-flex-wrap" style={{ gap: 16 }}>
          <div>
            <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center', marginBottom: 8 }}>
              <StatusIcon size={24} />
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{cfg.label}</h2>
            </div>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
              {election.termId?.name && `Term: ${election.termId.name}`}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.85rem', opacity: 0.8 }}>Current Phase</p>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{election.currentPhase}</p>
          </div>
        </div>
      </div>

      {/* Application Status / Info for Students */}
      {!canManage && isPhase1 && canAcceptNominations && (
        <div className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title">Candidate Application</h3>
          </div>
          <div className="ui-card__body">
            {hasApplied ? (
              <Alert variant={
                myApplication?.status === 'Approved' ? 'success' :
                myApplication?.status === 'Rejected' ? 'error' : 'info'
              }>
                <strong>Application Status: {myApplication?.status === 'Submitted' ? 'Pending Review' : myApplication?.status}</strong>
                {(myApplication?.status === 'Submitted' || myApplication?.status === 'Under_Review') && (
                  <p style={{ margin: '8px 0 0' }}>Your application is being reviewed by the Election Commission. You'll be notified once it's approved.</p>
                )}
                {myApplication?.status === 'Approved' && (
                  <p style={{ margin: '8px 0 0' }}>✓ Your candidacy has been approved! You are now on the ballot for Phase 1.</p>
                )}
                {myApplication?.status === 'Rejected' && (
                  <p style={{ margin: '8px 0 0' }}>Your application was not approved. Please contact the Election Commission for more details.</p>
                )}
              </Alert>
            ) : isEligible ? (
              <div>
                <p style={{ margin: '0 0 12px', color: 'var(--text)' }}>
                  ✓ You are eligible to apply as a <strong>Batch Representative</strong> candidate for this election.
                </p>
                <div style={{ padding: '12px 16px', background: 'var(--surface)', borderRadius: 12, marginBottom: 12 }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>Requirements Met:</p>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.82rem', color: 'var(--muted)' }}>
                    <li>Active membership ✓</li>
                    <li>CGPA ≥ 3.0 ✓</li>
                    <li>Attendance ≥ 75% ✓</li>
                  </ul>
                </div>
                <Button variant="success" leftIcon={UserPlus}
                  isLoading={applyMut.isPending}
                  onClick={() => {
                    if (window.confirm('Apply as a candidate for this election?\n\nYour application will be reviewed by the Election Commission before being approved.')) {
                      applyMut.mutate(election.electionType === 'single_post' ? election.targetPost?._id : undefined);
                    }
                  }}>
                  Apply as Candidate
                </Button>
              </div>
            ) : (
              <Alert variant="warning">
                <strong>Not Eligible</strong>
                <p style={{ margin: '8px 0 0' }}>
                  To apply as a candidate, you must have: Active membership, CGPA ≥ 3.0, and Attendance ≥ 75%.
                  Update your academic records in your profile to check eligibility.
                </p>
              </Alert>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="ui-card">
        <div className="ui-card__header">
          <h3 className="ui-card__title">Timeline</h3>
        </div>
        <div className="ui-card__body">
          <div className="ui-flex ui-flex-gap-4 ui-flex-wrap">
            <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
              <Calendar size={16} style={{ color: 'var(--accent)' }} />
              <div>
                <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 2 }}>Starts</p>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{formatDateTime(election.startsOn)}</p>
              </div>
            </div>
            <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
              <Clock size={16} style={{ color: 'var(--accent)' }} />
              <div>
                <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 2 }}>Ends</p>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{formatDateTime(election.endsOn)}</p>
              </div>
            </div>
            {election.phase1EndsOn && (
              <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
                <CheckCircle size={16} style={{ color: 'var(--accent)' }} />
                <div>
                  <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 2 }}>Phase 1 Ends</p>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{formatDateTime(election.phase1EndsOn)}</p>
                </div>
              </div>
            )}
            {election.phase2StartsOn && (
              <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
                <Play size={16} style={{ color: 'var(--accent)' }} />
                <div>
                  <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 2 }}>Phase 2 Starts</p>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{formatDateTime(election.phase2StartsOn)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar for active elections */}
          {isActive && (
            <div style={{ marginTop: 20 }}>
              <div className="ui-flex ui-flex-between ui-text-xs ui-text-muted" style={{ marginBottom: 6 }}>
                <span>Voting Progress</span>
                <span>{daysLeft}d left</span>
              </div>
              <div style={{ height: 8, background: 'var(--surface)', borderRadius: 999, overflow: 'hidden' }}>
                <motion.div
                  style={{ height: '100%', background: 'linear-gradient(90deg,#10b981,#059669)', borderRadius: 999 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      {candidateStats && (
        <>
          <div className="ui-card">
            <div className="ui-card__header">
              <h3 className="ui-card__title">Phase 1 — Batch Representatives</h3>
            </div>
            <div className="ui-card__body">
              <div className="ui-grid-4">
                <StatsCard title="Total Candidates" value={candidateStats.phase1.total} icon={Users} color="primary" />
                <StatsCard title="Approved" value={candidateStats.phase1.approved} icon={CheckCircle} color="success" />
                <StatsCard title="Pending Review" value={candidateStats.phase1.pending} icon={Clock} color="warning" />
                <StatsCard title="Rejected" value={candidateStats.phase1.rejected} icon={AlertCircle} color="error" />
              </div>
              {votingStats && (
                <div style={{ marginTop: 16, padding: '16px', background: 'var(--surface)', borderRadius: 12 }}>
                  <div className="ui-flex ui-flex-between ui-flex-wrap" style={{ gap: 16 }}>
                    <div>
                      <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 4 }}>Votes Cast</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{votingStats.phase1.totalVotes}</p>
                    </div>
                    <div>
                      <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 4 }}>Eligible Voters</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{votingStats.phase1.eligibleVoters}</p>
                    </div>
                    <div>
                      <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 4 }}>Turnout</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{votingStats.phase1.turnoutPercentage.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="ui-card">
            <div className="ui-card__header">
              <h3 className="ui-card__title">Phase 2 — Office Bearers</h3>
            </div>
            <div className="ui-card__body">
              <div className="ui-grid-4">
                <StatsCard title="Total Candidates" value={candidateStats.phase2.total} icon={Users} color="primary" />
                <StatsCard title="Approved" value={candidateStats.phase2.approved} icon={CheckCircle} color="success" />
                <StatsCard title="Pending Review" value={candidateStats.phase2.pending} icon={Clock} color="warning" />
                <StatsCard title="Rejected" value={candidateStats.phase2.rejected} icon={AlertCircle} color="error" />
              </div>
              {votingStats && (
                <div style={{ marginTop: 16, padding: '16px', background: 'var(--surface)', borderRadius: 12 }}>
                  <div className="ui-flex ui-flex-between ui-flex-wrap" style={{ gap: 16 }}>
                    <div>
                      <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 4 }}>Votes Cast</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{votingStats.phase2.totalVotes}</p>
                    </div>
                    <div>
                      <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 4 }}>Eligible Voters</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{votingStats.phase2.eligibleVoters}</p>
                    </div>
                    <div>
                      <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 4 }}>Turnout</p>
                      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{votingStats.phase2.turnoutPercentage.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="ui-card">
        <div className="ui-card__header">
          <h3 className="ui-card__title">Actions</h3>
        </div>
        <div className="ui-card__body">
          <div className="ui-grid-3" style={{ gap: 16 }}>
            <Button variant="outline" leftIcon={Users} onClick={() => navigate(`/dashboard/elections/${id}/candidates`)}>
              Manage Candidates
            </Button>
            {isActive && (
              <Button variant="primary" leftIcon={Vote} onClick={() => navigate(`/dashboard/elections/${id}/vote`)}>
                Vote Now
              </Button>
            )}
            <Button variant="outline" leftIcon={BarChart2} onClick={() => navigate(`/dashboard/elections/${id}/results`)}>
              View Results
            </Button>
          </div>

          {canManage && (
            <div style={{ marginTop: 20, padding: '16px', background: 'var(--surface)', borderRadius: 12 }}>
              <p className="ui-text-sm ui-text-muted" style={{ marginBottom: 12 }}>Election Commission Controls</p>
              <div className="ui-flex ui-flex-gap-2 ui-flex-wrap">
                {/* Forward progression buttons */}
                {(election.status === 'Draft' || election.status === 'Setup') && (
                  <Button variant="success" size="sm" leftIcon={Play} 
                    isLoading={statusMut.isPending}
                    onClick={() => statusMut.mutate({ status: 'Phase1_Active', phase: 1 })}>
                    Start Phase 1
                  </Button>
                )}
                {election.status === 'Phase1_Active' && (
                  <Button variant="warning" size="sm" leftIcon={CheckCircle} 
                    isLoading={statusMut.isPending}
                    onClick={() => statusMut.mutate({ status: 'Phase1_Completed', phase: 1 })}>
                    Complete Phase 1
                  </Button>
                )}
                {election.status === 'Phase1_Completed' && (
                  <>
                    <Button variant="success" size="sm" leftIcon={Play} 
                      isLoading={statusMut.isPending}
                      onClick={() => statusMut.mutate({ status: 'Phase2_Active', phase: 2 })}>
                      Start Phase 2
                    </Button>
                    <Button variant="outline" size="sm" leftIcon={RotateCcw} 
                      isLoading={statusMut.isPending}
                      onClick={() => {
                        if (window.confirm('Reopen Phase 1 voting? This will set the election back to Phase 1 Active status.')) {
                          statusMut.mutate({ status: 'Phase1_Active', phase: 1 });
                        }
                      }}>
                      Reopen Phase 1
                    </Button>
                  </>
                )}
                {election.status === 'Phase2_Active' && (
                  <Button variant="warning" size="sm" leftIcon={CheckCircle} 
                    isLoading={statusMut.isPending}
                    onClick={() => statusMut.mutate({ status: 'Phase2_Completed', phase: 2 })}>
                    Complete Phase 2
                  </Button>
                )}
                {(election.status === 'Phase2_Completed') && (
                  <>
                    <Button variant="neutral" size="sm" leftIcon={Square} 
                      isLoading={statusMut.isPending}
                      onClick={() => statusMut.mutate({ status: 'Completed' })}>
                      Mark as Completed
                    </Button>
                    <Button variant="outline" size="sm" leftIcon={RotateCcw} 
                      isLoading={statusMut.isPending}
                      onClick={() => {
                        if (window.confirm('Reopen Phase 2 voting? This will set the election back to Phase 2 Active status.')) {
                          statusMut.mutate({ status: 'Phase2_Active', phase: 2 });
                        }
                      }}>
                      Reopen Phase 2
                    </Button>
                  </>
                )}
                {election.status === 'Completed' && (
                  <Button variant="outline" size="sm" leftIcon={RotateCcw} 
                    isLoading={statusMut.isPending}
                    onClick={() => {
                      if (window.confirm('Reopen this election? You can choose to reopen Phase 2 or go back to Phase 1.\n\nClick OK to reopen Phase 2.')) {
                        statusMut.mutate({ status: 'Phase2_Active', phase: 2 });
                      }
                    }}>
                    Reopen Election
                  </Button>
                )}
                {(election.status === 'Draft' || election.status === 'Setup' || isActive) && (
                  <Button variant="danger" size="sm" leftIcon={AlertCircle} 
                    isLoading={statusMut.isPending}
                    onClick={() => {
                      if (window.confirm('Are you sure you want to cancel this election?')) {
                        statusMut.mutate({ status: 'Cancelled' });
                      }
                    }}>
                    Cancel Election
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phase 2 Post Selection Modal */}
      {showPostSelectionModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }} onClick={() => setShowPostSelectionModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'var(--card-bg)',
              borderRadius: 16,
              maxWidth: 600,
              width: '100%',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>Select EC Post</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Choose which office-bearer position you want to apply for
                </p>
              </div>
              <button
                onClick={() => setShowPostSelectionModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 8,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} style={{ color: 'var(--muted)' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {eligiblePosts.length === 0 ? (
                <Alert variant="warning">
                  <strong>No Eligible Posts</strong>
                  <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>
                    You are not currently eligible for any Phase 2 office-bearer positions. This may be due to:
                  </p>
                  <ul style={{ margin: '8px 0 0 20px', fontSize: '0.85rem' }}>
                    <li>Insufficient EC experience years for available posts</li>
                    <li>Academic year requirements not met</li>
                    <li>All positions already filled</li>
                  </ul>
                  <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Contact the Election Commission for more information.
                  </p>
                </Alert>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {eligiblePosts.map((post) => (
                    <motion.button
                      key={post._id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedPostId(post._id)}
                      style={{
                        padding: '16px 20px',
                        border: `2px solid ${selectedPostId === post._id ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 12,
                        background: selectedPostId === post._id ? 'rgba(var(--accent-rgb), 0.1)' : 'var(--surface)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>
                          {post.title}
                        </h3>
                        {selectedPostId === post._id && (
                          <CheckCircle size={20} style={{ color: 'var(--accent)' }} />
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)' }}>
                        Code: {post.code}
                        {post.requiredEcYears != null && ` • Required EC Years: ${post.requiredEcYears}`}
                      </p>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end',
            }}>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPostSelectionModal(false);
                  setSelectedPostId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="success"
                leftIcon={UserPlus}
                disabled={!selectedPostId || applyMut.isPending}
                isLoading={applyMut.isPending}
                onClick={() => {
                  if (!selectedPostId) return;
                  const selectedPost = eligiblePosts.find(p => p._id === selectedPostId);
                  if (window.confirm(`Apply for ${selectedPost?.title || 'this post'}?\n\nYour application will be reviewed by the Election Commission.`)) {
                    applyMut.mutate(selectedPostId);
                  }
                }}
              >
                Submit Application
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Poster Generator Modal */}
      {PosterModal}
    </div>
  );
}
