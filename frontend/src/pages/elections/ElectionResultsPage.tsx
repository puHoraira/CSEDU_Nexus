import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal, Award, Users, TrendingUp, BarChart2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';

type Election = {
  _id: string;
  name: string;
  currentPhase: number;
  status: string;
};

type Result = {
  candidateId: string;
  total: number;
  candidateStatus: string;
  memberId: string;
  candidateName: string;
  studentId: string;
  batch: number;
  post: { _id: string; title: string; code: string } | null;
};

export function ElectionResultsPage() {
  const { id } = useParams();
  const { token, loading: authLoading } = useAuth();

  const { data: election, isLoading: electionLoading } = useQuery({
    queryKey: ['election-detail', id, token],
    queryFn: () => apiRequest<Election>(`/elections/${id}`, { token }),
    enabled: Boolean(id && token) && !authLoading,
  });

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['election-results', id, token],
    queryFn: () => apiRequest<Result[]>(`/elections/${id}/results`, { token }),
    enabled: Boolean(id && token) && !authLoading,
  });

  const isLoading = electionLoading || resultsLoading;

  // Group results by post (Phase 2) or show all (Phase 1)
  const groupedResults = useMemo(() => {
    if (election?.currentPhase === 1) {
      return { 'Batch Representatives': results };
    } else {
      return results.reduce((acc, r) => {
        const postTitle = r.post?.title || 'No Post';
        if (!acc[postTitle]) acc[postTitle] = [];
        acc[postTitle].push(r);
        return acc;
      }, {} as Record<string, Result[]>);
    }
  }, [results, election]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalVotes = results.reduce((sum, r) => sum + r.total, 0);
    const totalCandidates = results.length;
    const approvedCandidates = results.filter(r => r.candidateStatus === 'Approved').length;

    return {
      totalVotes,
      totalCandidates,
      approvedCandidates,
      avgVotesPerCandidate: totalCandidates > 0 ? (totalVotes / totalCandidates).toFixed(1) : '0',
    };
  }, [results]);

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
        <Alert variant="error">Election not found</Alert>
      </div>
    );
  }

  const isCompleted = election.status.includes('Completed') || election.status === 'Completed';

  return (
    <div className="ui-page">
      <PageHeader
        title={`Results: ${election.name}`}
        description={
          isCompleted
            ? 'Final election results'
            : 'Live results (voting still in progress)'
        }
        backButton
      />

      {!isCompleted && (
        <Alert variant="info" icon={TrendingUp}>
          Voting is still in progress. Results shown here are preliminary and may change.
        </Alert>
      )}

      {/* Stats */}
      <div className="ui-grid-4">
        <div className="ui-card">
          <div className="ui-card__body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'var(--gradient-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <BarChart2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)' }}>
                  {stats.totalVotes}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Total Votes</div>
              </div>
            </div>
          </div>
        </div>

        <div className="ui-card">
          <div className="ui-card__body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <Users size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)' }}>
                  {stats.totalCandidates}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Candidates</div>
              </div>
            </div>
          </div>
        </div>

        <div className="ui-card">
          <div className="ui-card__body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <Trophy size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)' }}>
                  {stats.approvedCandidates}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Approved</div>
              </div>
            </div>
          </div>
        </div>

        <div className="ui-card">
          <div className="ui-card__body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <TrendingUp size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)' }}>
                  {stats.avgVotesPerCandidate}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Avg Votes</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results by Group */}
      {Object.entries(groupedResults).map(([group, groupResults]) => {
        const sortedResults = [...groupResults].sort((a, b) => b.total - a.total);
        const maxVotes = sortedResults[0]?.total || 1;

        return (
          <div key={group} className="ui-card">
            <div className="ui-card__header">
              <h3 className="ui-card__title">{group}</h3>
              <Badge variant="info">{groupResults.length} candidates</Badge>
            </div>
            <div className="ui-card__body">
              <div style={{ display: 'grid', gap: 16 }}>
                {sortedResults.map((result, index) => {
                  const percentage = maxVotes > 0 ? (result.total / maxVotes) * 100 : 0;
                  const isWinner = index === 0 && result.total > 0;
                  const isRunnerUp = index === 1 && result.total > 0;

                  return (
                    <div
                      key={result.candidateId}
                      style={{
                        padding: 16,
                        border: `2px solid ${
                          isWinner
                            ? 'var(--success)'
                            : isRunnerUp
                            ? 'var(--warning)'
                            : 'var(--border)'
                        }`,
                        borderRadius: 12,
                        background: isWinner
                          ? 'var(--success-bg)'
                          : isRunnerUp
                          ? 'var(--warning-bg)'
                          : 'var(--surface)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                        {/* Rank */}
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: isWinner
                              ? 'var(--success)'
                              : isRunnerUp
                              ? 'var(--warning)'
                              : 'var(--muted-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isWinner || isRunnerUp ? '#fff' : 'var(--text)',
                            fontWeight: 800,
                            fontSize: '1.1rem',
                            flexShrink: 0,
                          }}
                        >
                          {isWinner ? <Trophy size={20} /> : isRunnerUp ? <Medal size={20} /> : index + 1}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                              {result.candidateName}
                            </span>
                            {isWinner && <Badge variant="success">Winner</Badge>}
                            {isRunnerUp && <Badge variant="warning">Runner-up</Badge>}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                            {result.studentId} • Batch {result.batch}
                          </div>
                        </div>

                        {/* Votes */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
                            {result.total}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                            vote{result.total !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div
                        style={{
                          height: 8,
                          background: 'var(--surface)',
                          borderRadius: 999,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${percentage}%`,
                            background: isWinner
                              ? 'var(--success)'
                              : isRunnerUp
                              ? 'var(--warning)'
                              : 'var(--accent)',
                            borderRadius: 999,
                            transition: 'width 0.5s ease-out',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {results.length === 0 && (
        <div className="ui-card">
          <div className="ui-card__body">
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
              <Award size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '1.1rem' }}>No results available yet</p>
              <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>
                Results will appear once voting begins
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
