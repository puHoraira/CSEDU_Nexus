import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Vote, CheckCircle, AlertCircle, ArrowLeft, Users, Award } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import toast from 'react-hot-toast';

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

export function ElectionVotingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());

  // Fetch election details
  const { data: election, isLoading: electionLoading } = useQuery({
    queryKey: ['election-detail', id, token],
    queryFn: () => apiRequest<Election>(`/elections/${id}`, { token }),
    enabled: Boolean(id && token) && !authLoading,
  });

  // Fetch candidates
  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ['election-candidates', id, token],
    queryFn: () => apiRequest<Candidate[]>(`/elections/${id}/candidates`, { token }),
    enabled: Boolean(id && token) && !authLoading,
  });

  // Fetch my votes
  const { data: myVotes = [], isLoading: votesLoading } = useQuery({
    queryKey: ['my-votes', id, token],
    queryFn: async () => {
      try {
        return await apiRequest<MyVote[]>(`/elections/${id}/my-votes`, { token });
      } catch {
        return [];
      }
    },
    enabled: Boolean(id && token) && !authLoading,
  });

  // Cast vote mutation
  const voteMut = useMutation({
    mutationFn: (candidateId: string) =>
      apiRequest('/elections/votes', {
        method: 'POST',
        token,
        body: JSON.stringify({ electionId: id, candidateId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-votes', id, token] });
      toast.success('Vote cast successfully!');
    },
    onError: (e) => toast.error(normalizeApiError(e)),
  });

  const isLoading = electionLoading || candidatesLoading || votesLoading;
  const isPhase1 = (election?.currentPhase ?? 1) === 1;
  const maxVotes = election?.phase1?.maxVotesPerVoter || 5;
  const votedCandidateIds = new Set(myVotes.map(v => v.candidateId));
  const hasVoted = votedCandidateIds.size > 0;

  // Election is active if status contains 'Active' (handles Phase1_Active, Phase2_Active, Active)
  const isActive = Boolean(election?.status && (
    election.status === 'Active' ||
    election.status === 'Phase1_Active' ||
    election.status === 'Phase2_Active' ||
    election.status.includes('Active')
  ));

  // Filter approved candidates
  const approvedCandidates = candidates.filter(c => c.status === 'Approved');

  // Group candidates by post (Phase 2) or batch (Phase 1)
  const groupedCandidates = useMemo(() => {
    if (isPhase1) {
      // Group by batch
      return approvedCandidates.reduce((acc, c) => {
        const batch = c.batch || 'Unknown';
        if (!acc[batch]) acc[batch] = [];
        acc[batch].push(c);
        return acc;
      }, {} as Record<string, Candidate[]>);
    } else {
      // Group by post
      return approvedCandidates.reduce((acc, c) => {
        const postTitle = c.postId?.title || 'No Post';
        if (!acc[postTitle]) acc[postTitle] = [];
        acc[postTitle].push(c);
        return acc;
      }, {} as Record<string, Candidate[]>);
    }
  }, [approvedCandidates, isPhase1]);

  const handleToggleCandidate = (candidateId: string) => {
    if (hasVoted) return; // Can't change votes after voting

    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId);
    } else {
      if (isPhase1 && newSelected.size >= maxVotes) {
        toast.error(`You can only select up to ${maxVotes} candidates`);
        return;
      }
      newSelected.add(candidateId);
    }
    setSelectedCandidates(newSelected);
  };

  const handleSubmitVotes = async () => {
    if (selectedCandidates.size === 0) {
      toast.error('Please select at least one candidate');
      return;
    }

    if (isPhase1 && selectedCandidates.size > maxVotes) {
      toast.error(`You can only vote for up to ${maxVotes} candidates`);
      return;
    }

    // Cast votes sequentially
    for (const candidateId of Array.from(selectedCandidates)) {
      await voteMut.mutateAsync(candidateId);
    }

    setSelectedCandidates(new Set());
  };

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

  return (
    <div className="ui-page">
      <PageHeader
        title={`Vote: ${election.name}`}
        description={isPhase1 ? 'Select up to 5 batch representatives' : 'Select one candidate per post'}
        backButton
      />

      {/* Voting Status */}
      {hasVoted && (
        <Alert variant="success" icon={CheckCircle}>
          You have already cast your vote{votedCandidateIds.size > 1 ? 's' : ''} in this election.
          {isPhase1 && ` (${votedCandidateIds.size}/${maxVotes} votes used)`}
        </Alert>
      )}

      {!isActive && (
        <Alert variant="warning" icon={AlertCircle}>
          Voting is not currently active for this election.
        </Alert>
      )}

      {/* Phase Info */}
      <div className="ui-card">
        <div className="ui-card__body">
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
        </div>
      </div>

      {/* Candidates */}
      {Object.entries(groupedCandidates).map(([group, groupCandidates]) => (
        <div key={group} className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title">
              {isPhase1 ? `Batch ${group}` : group}
            </h3>
            <span className="ui-badge ui-badge--info">{groupCandidates.length} candidates</span>
          </div>
          <div className="ui-card__body">
            <div style={{ display: 'grid', gap: 16 }}>
              {groupCandidates.map((candidate) => {
                const isSelected = selectedCandidates.has(candidate._id);
                const hasVotedFor = votedCandidateIds.has(candidate._id);
                const user = candidate.memberId.userId;

                return (
                  <motion.div
                    key={candidate._id}
                    whileHover={{ scale: hasVoted ? 1 : 1.02 }}
                    whileTap={{ scale: hasVoted ? 1 : 0.98 }}
                    style={{
                      padding: 16,
                      border: `2px solid ${
                        hasVotedFor
                          ? 'var(--success)'
                          : isSelected
                          ? 'var(--accent)'
                          : 'var(--border)'
                      }`,
                      borderRadius: 12,
                      background: hasVotedFor
                        ? 'var(--success-bg)'
                        : isSelected
                        ? 'var(--accent-bg)'
                        : 'var(--surface)',
                      cursor: hasVoted ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => !hasVoted && isActive && handleToggleCandidate(candidate._id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {/* Avatar */}
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: 'var(--gradient-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '1.2rem',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              borderRadius: '50%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          user.firstName.charAt(0).toUpperCase()
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
                          {user.firstName} {user.lastName}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                          {candidate.memberId.studentId} • Batch {candidate.memberId.batch} • Year{' '}
                          {candidate.memberId.currentYear}
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      {(isSelected || hasVotedFor) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: hasVotedFor ? 'var(--success)' : 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
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

      {/* Submit Button */}
      {!hasVoted && isActive && (
        <div
          style={{
            position: 'sticky',
            bottom: 24,
            padding: 16,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {selectedCandidates.size} candidate{selectedCandidates.size !== 1 ? 's' : ''} selected
              </div>
              {isPhase1 && (
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Maximum {maxVotes} votes allowed
                </div>
              )}
            </div>
            <Button
              leftIcon={Vote}
              onClick={handleSubmitVotes}
              isLoading={voteMut.isPending}
              disabled={selectedCandidates.size === 0}
            >
              Cast Vote{selectedCandidates.size > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
