import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Vote, CheckCircle, XCircle, Clock, AlertCircle,
  User2, Hash, Calendar, Trophy, Info
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { formatDateTime } from '../../lib/utils';

type Election = {
  _id: string;
  name: string;
  phase: number;
  startsOn: string;
  endsOn: string;
  status: 'Draft' | 'Active' | 'Closed';
};

type Candidate = {
  _id: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  electionId: string;
  postId?: { _id: string; title: string; code: string } | null;
  memberId?: {
    studentId?: string;
    batch?: number;
    currentYear?: number;
    userId?: { firstName?: string; lastName?: string; email?: string };
  };
};

type ProfilePayload = {
  user: { firstName: string; lastName: string; email: string };
  membership: {
    studentId: string;
    batch: number;
    currentYear: number;
    status: string;
    academicRecord?: { currentCgpa?: number };
    attendanceRecord?: { overallAttendancePercentage?: number };
    electionEligibility?: { isEligibleForVoting?: boolean; isEligibleForCandidacy?: boolean };
  } | null;
};

const STATUS_CFG: Record<string, { variant: 'success' | 'warning' | 'error' | 'neutral'; icon: any; label: string }> = {
  Pending:  { variant: 'warning', icon: Clock,        label: 'Pending Review' },
  Approved: { variant: 'success', icon: CheckCircle,  label: 'Approved' },
  Rejected: { variant: 'error',   icon: XCircle,      label: 'Rejected' },
};

export function ApplyCandidatePage() {
  const { token, loading } = useAuth();

  // Fetch profile + eligibility
  const profileQ = useQuery({
    queryKey: ['my-profile', token],
    queryFn: () => apiRequest<ProfilePayload>('/auth/me', { token }),
    enabled: Boolean(token),
  });

  // Fetch all elections
  const electionsQ = useQuery({
    queryKey: ['elections', token],
    queryFn: () => apiRequest<Election[]>('/elections', { token }),
    enabled: Boolean(token),
  });

  const membership = profileQ.data?.membership;
  const eligibility = membership?.electionEligibility;
  const cgpa        = membership?.academicRecord?.currentCgpa ?? 0;
  const attendance  = membership?.attendanceRecord?.overallAttendancePercentage ?? 0;
  const isEligible  = eligibility?.isEligibleForCandidacy ?? false;

  // Active elections only
  const activeElections = useMemo(
    () => (electionsQ.data ?? []).filter(e => e.status === 'Active'),
    [electionsQ.data]
  );

  // Fetch my candidacy across all active elections
  const candidacyQueries = useQuery({
    queryKey: ['my-candidacies', token, activeElections.map(e => e._id).join(',')],
    queryFn: async () => {
      const results: Array<{ electionId: string; candidates: Candidate[] }> = [];
      for (const election of activeElections) {
        try {
          const candidates = await apiRequest<Candidate[]>(`/elections/${election._id}/candidates`, { token });
          results.push({ electionId: election._id, candidates });
        } catch {
          results.push({ electionId: election._id, candidates: [] });
        }
      }
      return results;
    },
    enabled: Boolean(token) && activeElections.length > 0,
  });

  // Find my member ID from profile
  const myStudentId = membership?.studentId;

  // Find my candidacies
  const myCandidacies = useMemo(() => {
    if (!candidacyQueries.data || !myStudentId) return [];
    const all: Array<Candidate & { electionName: string; electionPhase: number }> = [];
    for (const { electionId, candidates } of candidacyQueries.data) {
      const election = activeElections.find(e => e._id === electionId);
      const mine = candidates.filter(c => c.memberId?.studentId === myStudentId);
      mine.forEach(c => all.push({
        ...c,
        electionName: election?.name ?? 'Unknown',
        electionPhase: election?.phase ?? 1,
      }));
    }
    return all;
  }, [candidacyQueries.data, myStudentId, activeElections]);

  const isLoading = profileQ.isLoading || electionsQ.isLoading;

  return (
    <div className="ui-page">
      <PageHeader
        title="EC Candidacy"
        description="View your eligibility and candidacy status for Executive Committee elections"
        backButton
        breadcrumbs={[{ label: 'Elections', href: '/dashboard/elections' }, { label: 'My Candidacy' }]}
      />

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Spinner size="lg" label="Loading…" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Eligibility Card */}
          <div className="ui-card">
            <div className="ui-card__header">
              <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User2 size={17} style={{ color: 'var(--accent)' }} /> Eligibility Status
              </h3>
              <Badge variant={isEligible ? 'success' : 'error'}>
                {isEligible ? '✓ Eligible' : '✗ Not Eligible'}
              </Badge>
            </div>
            <div className="ui-card__body">
              {!membership ? (
                <Alert variant="warning">
                  No membership record found. You must be an active club member to apply as a candidate.
                </Alert>
              ) : (
                <>
                  {/* Eligibility criteria */}
                  <div className="ui-grid-3" style={{ marginBottom: 16 }}>
                    {[
                      {
                        label: 'CGPA',
                        value: cgpa > 0 ? cgpa.toFixed(2) : 'Not set',
                        required: '≥ 3.0',
                        ok: cgpa >= 3.0,
                      },
                      {
                        label: 'Attendance',
                        value: attendance > 0 ? `${attendance}%` : 'Not set',
                        required: '≥ 75%',
                        ok: attendance >= 75,
                      },
                      {
                        label: 'Membership',
                        value: membership.status,
                        required: 'Active',
                        ok: membership.status === 'Active',
                      },
                    ].map(item => (
                      <div key={item.label} style={{
                        padding: '14px 16px', borderRadius: 14,
                        border: `1px solid ${item.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        background: item.ok ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</span>
                          {item.ok
                            ? <CheckCircle size={15} style={{ color: '#10b981' }} />
                            : <XCircle size={15} style={{ color: '#ef4444' }} />
                          }
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{item.value}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Required: {item.required}</div>
                      </div>
                    ))}
                  </div>

                  {/* Member info */}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '12px 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    {[
                      { icon: Hash,     label: 'Student ID', value: membership.studentId },
                      { icon: Calendar, label: 'Batch',      value: membership.batch },
                      { icon: User2,    label: 'Year',       value: membership.currentYear },
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Icon size={14} style={{ color: 'var(--accent)' }} />
                          <span className="ui-text-xs ui-text-muted">{item.label}:</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{item.value}</span>
                        </div>
                      );
                    })}
                  </div>

                  {!isEligible && (
                    <Alert variant="warning" className="ui-mt-3">
                      Update your CGPA and attendance in your <a href="/dashboard/profile" style={{ color: 'var(--accent)', fontWeight: 600 }}>Profile → Academic tab</a> to become eligible.
                    </Alert>
                  )}
                </>
              )}
            </div>
          </div>

          {/* How to apply info */}
          <div className="ui-card">
            <div className="ui-card__header">
              <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={17} style={{ color: 'var(--accent)' }} /> How to Apply as a Candidate
              </h3>
            </div>
            <div className="ui-card__body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { step: '1', title: 'Check Eligibility', desc: 'Ensure your CGPA ≥ 3.0, attendance ≥ 75%, and membership is Active (shown above).' },
                  { step: '2', title: 'Contact Election Commission', desc: 'Reach out to the Election Commissioner or Moderator and express your intent to run.' },
                  { step: '3', title: 'Get Added as Candidate', desc: 'The Election Commissioner will add you to the election via the Candidate Management page.' },
                  { step: '4', title: 'Wait for Approval', desc: 'Your candidacy will be reviewed. Status will show as Pending → Approved or Rejected.' },
                  { step: '5', title: 'Campaign', desc: 'Once approved, your name appears on the voting ballot for all eligible voters.' },
                ].map(item => (
                  <div key={item.step} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--gradient-primary)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.82rem',
                    }}>
                      {item.step}
                    </div>
                    <div>
                      <p style={{ margin: '0 0 3px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{item.title}</p>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* My Candidacies */}
          <div className="ui-card" style={{ padding: 0 }}>
            <div className="ui-card__header">
              <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={17} style={{ color: 'var(--accent)' }} /> My Candidacy Status
              </h3>
              <Badge variant="neutral">{myCandidacies.length} application{myCandidacies.length !== 1 ? 's' : ''}</Badge>
            </div>

            {candidacyQueries.isLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
            )}

            {!candidacyQueries.isLoading && myCandidacies.length === 0 && (
              <EmptyState
                icon={Vote}
                title="No candidacy applications"
                description={activeElections.length === 0
                  ? 'No active elections at the moment'
                  : 'You have not been added as a candidate in any active election yet'
                }
                size="sm"
              />
            )}

            {myCandidacies.map((c, i) => {
              const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.Pending;
              const StatusIcon = cfg.icon;
              return (
                <motion.div key={c._id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px 22px',
                    borderBottom: i < myCandidacies.length - 1 ? '1px solid var(--border)' : 'none',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Phase badge */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: 'var(--gradient-primary)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, lineHeight: 1 }}>{(c as any).electionPhase}</span>
                    <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', opacity: 0.85 }}>Phase</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>
                        {(c as any).electionName}
                      </span>
                      <Badge variant={cfg.variant} className="flex items-center gap-1">
                        <StatusIcon size={11} /> {cfg.label}
                      </Badge>
                    </div>
                    <p className="ui-text-xs ui-text-muted">
                      {c.postId ? `Post: ${c.postId.title}` : 'Batch Representative (Phase 1)'}
                    </p>
                    {c.status === 'Rejected' && c.rejectionReason && (
                      <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#ef4444' }}>
                        Reason: {c.rejectionReason}
                      </p>
                    )}
                    {c.status === 'Approved' && (
                      <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                        ✓ You are on the ballot — voters can vote for you
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Active elections overview */}
          {activeElections.length > 0 && (
            <div className="ui-card">
              <div className="ui-card__header">
                <h3 className="ui-card__title">Active Elections</h3>
              </div>
              <div className="ui-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeElections.map(e => (
                  <div key={e._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>{e.name}</p>
                      <p className="ui-text-xs ui-text-muted">Phase {e.phase} · Ends {formatDateTime(e.endsOn)}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Badge variant="success">Active</Badge>
                      <a href={`/dashboard/elections/${e._id}/vote`}
                        style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                        Vote →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
