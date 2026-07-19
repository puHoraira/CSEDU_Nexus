import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Vote, CheckCircle, AlertCircle, Users, Award, Timer } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { VideoRecorder } from '../../components/elections/VideoRecorder';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type Election = {
  _id: string;
  name: string;
  currentPhase: number;
  status: string;
  phase1?: { maxVotesPerVoter: number };
};

type Candidate = {
  _id: string;
  phase: number;
  status: string;
  batch?: string;
  postId?: { _id: string; title: string; code: string };
  memberId: {
    _id: string;
    studentId: string;
    batch: number;
    currentYear: number;
    userId: {
      firstName: string;
      lastName: string;
      email: string;
      avatarUrl?: string;
    };
  };
};

type MyVote = {
  _id: string;
  candidateId: string;
  createdAt: string;
};

type MemberSelf = {
  _id: string;
  studentId?: string;
  batch?: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_SECONDS = 30; // voting window in seconds
const READY_COUNTDOWN = 3;  // "get ready" seconds before session starts

// ─── Countdown display helper ─────────────────────────────────────────────────

function CountdownBadge({ seconds, expired, readyCountdown }: { seconds: number; expired: boolean; readyCountdown: number | null }) {
  if (readyCountdown !== null) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 999,
        fontWeight: 700, fontSize: '1rem',
        background: '#dbeafe', color: '#1d4ed8',
        border: '2px solid #1d4ed8', transition: 'all 0.3s',
      }}>
        <Timer size={16} />
        Get ready… {readyCountdown}
      </div>
    );
  }
  const isUrgent = seconds <= 10 && !expired;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 14px', borderRadius: 999,
      fontWeight: 700, fontSize: '1rem',
      background: expired ? 'var(--danger-bg, #fee2e2)' : isUrgent ? '#fef3c7' : 'var(--accent-bg)',
      color: expired ? '#dc2626' : isUrgent ? '#92400e' : 'var(--accent)',
      border: `2px solid ${expired ? '#dc2626' : isUrgent ? '#d97706' : 'var(--accent)'}`,
      transition: 'all 0.3s',
    }}>
      <Timer size={16} />
      {expired ? 'Time expired' : `${seconds}s remaining`}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ElectionVotingPage() {
  const { id } = useParams();
  const { token, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  // ── Session timer state ────────────────────────────────────────────────────
  // Session starts once the camera is ready (recordingActive = true)
  const [sessionStarted, setSessionStarted]   = useState(false);
  const [sessionSeconds, setSessionSeconds]   = useState(SESSION_SECONDS);
  const [sessionExpired, setSessionExpired]   = useState(false);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // "Get ready" countdown shown before the 30s session begins
  const [readyCountdown, setReadyCountdown]   = useState<number | null>(null);
  const readyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Vote & recording state ─────────────────────────────────────────────────
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [videoRecordingId, setVideoRecordingId]     = useState<string | null>(null);
  const [voteTimestamp, setVoteTimestamp]           = useState<number | null>(null);
  const [voteCastSuccessfully, setVoteCastSuccessfully] = useState(false);
  const [videoError, setVideoError]                 = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: election, isLoading: electionLoading } = useQuery({
    queryKey: ['election-detail', id, token],
    queryFn: () => apiRequest<Election>(`/elections/${id}`, { token }),
    enabled: Boolean(id && token) && !authLoading,
  });

  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ['election-candidates', 'ballot', id, token],
    queryFn: () => apiRequest<Candidate[]>(`/elections/${id}/candidates?scope=ballot`, { token }),
    enabled: Boolean(id && token) && !authLoading,
  });

  const { data: myVotes = [], isLoading: votesLoading } = useQuery({
    queryKey: ['my-votes', id, token],
    queryFn: async () => {
      try { return await apiRequest<MyVote[]>(`/elections/${id}/my-votes`, { token }); }
      catch { return []; }
    },
    enabled: Boolean(id && token) && !authLoading,
  });

  const { data: memberSelf } = useQuery({
    queryKey: ['member-self', token],
    queryFn: () => apiRequest<MemberSelf>('/membership/members/me', { token }),
    enabled: Boolean(token) && !authLoading,
    retry: false,
  });

  const memberRecordId = memberSelf?._id ?? null;

  // ── Vote mutation ──────────────────────────────────────────────────────────
  const voteMut = useMutation({
    mutationFn: (candidateId: string) =>
      apiRequest('/elections/votes', {
        method: 'POST',
        token,
        body: JSON.stringify({
            electionId: id,
            candidateId,
            ...(videoRecordingId ? { videoRecordingId } : {}),
          }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-votes', id, token] });
      toast.success('Vote cast successfully!');
    },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  // ── Derived state ──────────────────────────────────────────────────────────

  const isLoading    = electionLoading || candidatesLoading || votesLoading;
  const isPhase1     = (election?.currentPhase ?? 1) === 1;
  const currentPhase = election?.currentPhase ?? 1;
  const maxVotes     = election?.phase1?.maxVotesPerVoter || 5;
  
  // Filter votes by current phase: Phase 1 votes are for batch representatives (no postId),
  // Phase 2 votes are for office bearers (with postId)
  const currentPhaseVotes = myVotes.filter((v: any) => {
    const votePhase = v.phase ?? (v.postId ? 2 : 1);
    return votePhase === currentPhase;
  });
  
  const votedIds     = new Set(currentPhaseVotes.map((v) => v.candidateId));
  const hasVoted     = votedIds.size > 0;
  const isActive     = Boolean(election?.status?.includes('Active'));

  const approvedCandidates = candidates.filter((c) => c.status === 'Approved');

  const groupedCandidates = useMemo(() => {
    if (isPhase1) {
      return approvedCandidates.reduce((acc, c) => {
        const batch = c.batch || 'Unknown';
        if (!acc[batch]) acc[batch] = [];
        acc[batch].push(c);
        return acc;
      }, {} as Record<string, Candidate[]>);
    }
    return approvedCandidates.reduce((acc, c) => {
      const post = c.postId?.title || 'No Post';
      if (!acc[post]) acc[post] = [];
      acc[post].push(c);
      return acc;
    }, {} as Record<string, Candidate[]>);
  }, [approvedCandidates, isPhase1]);

  // ── Session timer ──────────────────────────────────────────────────────────
  // Start the countdown as soon as recording begins (signalled by VideoRecorder
  // calling onRecordingComplete is NOT the trigger — we start when the camera
  // is ready and recording starts, which we detect via sessionStarted flag set
  // from the VideoRecorder's internal state. We use a simpler approach: start
  // the countdown when the VideoRecorder mounts and camera permission is granted,
  // which we infer by passing a callback via the `onSessionStart` prop).

  function handleSessionStart() {
    if (sessionStarted || readyCountdown !== null) return;

    // Show a 3-2-1 "get ready" countdown before the real 30s session begins
    setReadyCountdown(READY_COUNTDOWN);
    let count = READY_COUNTDOWN;

    readyTimerRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(readyTimerRef.current!);
        readyTimerRef.current = null;
        setReadyCountdown(null);

        // Now start the real 30-second session
        setSessionStarted(true);
        setSessionSeconds(SESSION_SECONDS);

        sessionTimerRef.current = setInterval(() => {
          setSessionSeconds((prev) => {
            if (prev <= 1) {
              clearInterval(sessionTimerRef.current!);
              sessionTimerRef.current = null;
              setSessionExpired(true);
              toast('Voting session expired. Your recording was not saved.', { icon: '⏱️' });
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setReadyCountdown(count);
      }
    }, 1000);
  }

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      if (readyTimerRef.current) clearInterval(readyTimerRef.current);
    };
  }, []);

  // Stop the session timer once a vote is successfully cast
  useEffect(() => {
    if (voteCastSuccessfully && sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, [voteCastSuccessfully]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleToggleCandidate = (candidateId: string) => {
    if (hasVoted || sessionExpired) return;
    const next = new Set(selectedCandidates);
    if (next.has(candidateId)) {
      next.delete(candidateId);
    } else {
      if (isPhase1 && next.size >= maxVotes) {
        toast.error(`You can only select up to ${maxVotes} candidates`);
        return;
      }
      next.add(candidateId);
    }
    setSelectedCandidates(next);
  };

  const handleSubmitVotes = async () => {
    if (sessionExpired) {
      toast.error('The voting session has expired.');
      return;
    }
    if (selectedCandidates.size === 0) {
      toast.error('Please select at least one candidate.');
      return;
    }

    // Record the vote timestamp for the 10s-before/10s-after clip
    const ts = Date.now();
    setVoteTimestamp(ts);

    for (const candidateId of Array.from(selectedCandidates)) {
      await voteMut.mutateAsync(candidateId);
    }

    setVoteCastSuccessfully(true);
    setSelectedCandidates(new Set());
  };

  // ── Loading / error screens ────────────────────────────────────────────────

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
        <Alert variant="error" icon={AlertCircle}>Election not found</Alert>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="ui-page">
      <PageHeader
        title={`Vote: ${election.name}`}
        description={isPhase1 ? 'Select up to 5 batch representatives' : 'Select one candidate per post'}
        backButton
      />

      {/* Status banners */}
      {hasVoted && (
        <Alert variant="success" icon={CheckCircle}>
          You have already cast your vote{votedIds.size > 1 ? 's' : ''} in this election.
          {isPhase1 && ` (${votedIds.size}/${maxVotes} votes used)`}
        </Alert>
      )}
      {!isActive && (
        <Alert variant="warning" icon={AlertCircle}>
          Voting is not currently active for this election.
        </Alert>
      )}

      {/* Phase info + session countdown */}
      <div className="ui-card">
        <div className="ui-card__body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {isPhase1 ? <Users size={24} /> : <Award size={24} />}
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                  {isPhase1 ? 'Phase 1: Batch Representatives' : 'Phase 2: Office Bearers'}
                </h3>
                <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
                  {isPhase1
                    ? `Vote for up to ${maxVotes} candidates from your batch`
                    : 'Vote for one candidate per post'}
                </p>
              </div>
            </div>

            {/* Countdown — only show after session starts */}
            {sessionStarted && !hasVoted && isActive && (
              <CountdownBadge seconds={sessionSeconds} expired={sessionExpired} />
            )}
          </div>

          {/* Session expired warning */}
          {sessionExpired && !hasVoted && (
            <div style={{
              marginTop: 12,
              padding: '10px 14px',
              background: '#fee2e2',
              borderRadius: 8,
              color: '#dc2626',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}>
              ⏱️ The 30-second voting window has expired. You can no longer cast a vote in this session.
              Please reload the page to start a new session.
            </div>
          )}
        </div>
      </div>

      {/* ── Video Recording Section ─────────────────────────────────────── */}
      {/* Keep VideoRecorder mounted until upload completes (don't unmount on hasVoted) */}
      {isActive && memberRecordId && !voteCastSuccessfully && (
        <div className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title">Camera verification</h3>
            <span className={`ui-badge ${videoRecordingId ? 'ui-badge--success' : 'ui-badge--warning'}`}>
              {videoRecordingId ? '✓ Saved' : sessionExpired ? 'Expired' : 'Recording'}
            </span>
          </div>
          <div className="ui-card__body">
            {!sessionExpired && (
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 16 }}>
                Your webcam records your voting session automatically.
                You have <strong>{SESSION_SECONDS} seconds</strong> to select a candidate and cast your vote.
                The recording uploads after you vote.
              </p>
            )}
            <VideoRecorder
              electionId={id!}
              voterId={memberRecordId}
              token={token}
              voteTimestamp={voteTimestamp}
              sessionExpired={sessionExpired}
              onRecordingComplete={(vid) => {
                setVideoRecordingId(vid);
                setVideoError(null);
                // Mark vote as fully complete (video uploaded)
                setVoteCastSuccessfully(true);
              }}
              onError={(msg) => setVideoError(msg)}
              onSessionStart={handleSessionStart}
            />
            {videoError && (
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>{videoError}</p>
            )}
          </div>
        </div>
      )}

      {!hasVoted && isActive && !memberRecordId && (
        <div className="ui-card">
          <div className="ui-card__body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)' }}>
              <Spinner size="sm" />
              <span>Loading camera verification…</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Candidate Selection ─────────────────────────────────────────── */}
      {isPhase1 && approvedCandidates.length > 0 && (
        <div className="ui-card" style={{ background: 'var(--accent-bg, rgba(107,163,255,0.06))' }}>
          <div className="ui-card__body" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={16} style={{ color: 'var(--accent)' }} />
            <span className="ui-text-sm" style={{ color: 'var(--muted)' }}>
              You are viewing candidates from <strong>your own batch only</strong>. Phase 1 voting is batch-restricted per the constitution.
            </span>
          </div>
        </div>
      )}
      {Object.entries(groupedCandidates).map(([group, groupCandidates]) => (
        <div key={group} className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title">{isPhase1 ? `Batch ${group} — Your Batch` : group}</h3>
            <span className="ui-badge ui-badge--info">{groupCandidates.length} candidates</span>
          </div>
          <div className="ui-card__body">
            <div style={{ display: 'grid', gap: 16 }}>
              {groupCandidates.map((candidate) => {
                const isSelected  = selectedCandidates.has(candidate._id);
                const hasVotedFor = votedIds.has(candidate._id);
                const u = candidate.memberId.userId;

                return (
                  <motion.div
                    key={candidate._id}
                    whileHover={{ scale: (hasVoted || sessionExpired) ? 1 : 1.02 }}
                    whileTap={{ scale: (hasVoted || sessionExpired) ? 1 : 0.98 }}
                    style={{
                      padding: 16,
                      border: `2px solid ${hasVotedFor ? 'var(--success)' : isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 12,
                      background: hasVotedFor ? 'var(--success-bg)' : isSelected ? 'var(--accent-bg)' : 'var(--surface)',
                      cursor: (hasVoted || sessionExpired) ? 'default' : 'pointer',
                      opacity: sessionExpired && !hasVotedFor ? 0.5 : 1,
                      transition: 'all 0.2s',
                    }}
                    onClick={() => !hasVoted && isActive && !sessionExpired && handleToggleCandidate(candidate._id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'var(--gradient-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '1.2rem', fontWeight: 700, flexShrink: 0,
                      }}>
                        {u.avatarUrl
                          ? <img src={u.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          : u.firstName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
                          {u.firstName} {u.lastName}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                          {candidate.memberId.studentId} • Batch {candidate.memberId.batch} • Year {candidate.memberId.currentYear}
                        </div>
                      </div>
                      {(isSelected || hasVotedFor) && (
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: hasVotedFor ? 'var(--success)' : 'var(--accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                          }}
                        >
                          <CheckCircle size={20} />
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {/* ── Sticky submit bar ───────────────────────────────────────────── */}
      {!hasVoted && isActive && (
        <div style={{
          position: 'sticky', bottom: 24, padding: 16,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {selectedCandidates.size} candidate{selectedCandidates.size !== 1 ? 's' : ''} selected
              </div>
              {isPhase1 && (
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Maximum {maxVotes} votes allowed</div>
              )}
              {sessionExpired && (
                <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: 4 }}>
                  ⏱️ Session expired — voting disabled
                </div>
              )}
            </div>
            <Button
              leftIcon={Vote}
              onClick={handleSubmitVotes}
              isLoading={voteMut.isPending}
              disabled={selectedCandidates.size === 0 || sessionExpired}
            >
              Cast Vote{selectedCandidates.size > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
