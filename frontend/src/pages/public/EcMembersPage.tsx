import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Landmark, History, Vote, Award, Mail, Phone, IdCard,
  CalendarRange, TrendingUp, Building2,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatsCard } from '../../components/ui/StatsCard';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';

type EcMember = {
  appointmentId: string;
  post: { code: string; title: string; displayOrder: number };
  member: {
    memberId: string; studentId: string; batch: number; currentYear: number;
    academicYearLevel: string; fullName: string; email: string; phone: string; avatarUrl?: string;
  };
  startsOn: string; endsOn?: string; source: string; isCurrent?: boolean;
};

type EcTerm = { _id: string; name: string; startsOn: string; endsOn: string; status: string; memberCount?: number };

type Statistics = {
  overview: {
    totalTerms: number; activeTermCount: number; currentEcMemberCount: number;
    totalHistoricalAppointments: number; uniqueEcMembersAllTime: number;
  };
  postWiseDistribution: Array<{ postTitle: string; count: number }>;
};

type BatchRep = {
  _id: string; batch?: string;
  votingResults?: { totalVotes?: number; votePercentage?: number; rank?: number; isWinner?: boolean };
  memberId?: {
    _id?: string; studentId?: string; batch?: number;
    userId?: { firstName?: string; lastName?: string; email?: string; avatarUrl?: string };
  };
};

type CurrentEcPayload = {
  term: EcTerm | null;
  election?: { _id: string; name: string; currentPhase: number; status: string } | null;
  members: EcMember[];
  panelByPost?: Array<{ postTitle: string; members: EcMember[] }>;
  currentBatchRepresentatives?: Record<string, BatchRep[]>;
  overview?: { currentPanelCount: number; currentBatchRepresentativeCount: number };
  message?: string;
};

type TermMembersPayload = { term: EcTerm; members: EcMember[] };

function fmt(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function Avatar({ name, src, size = 56 }: { name?: string; src?: string; size?: number }) {
  if (src) return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--gradient-primary)', color: '#fff', fontWeight: 700,
      fontSize: size * 0.36,
    }}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

function MemberCard({ m }: { m: EcMember }) {
  return (
    <div className="ui-card" style={{ padding: 0 }}>
      <div className="ui-card__body" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Avatar name={m.member.fullName} src={m.member.avatarUrl} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h4 style={{ margin: '0 0 2px', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
            {m.member.fullName || m.member.studentId || 'EC Member'}
          </h4>
          <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--accent)', fontSize: '0.88rem' }}>{m.post?.title}</p>
          <div className="ui-flex-col" style={{ gap: 4 }}>
            <span className="ui-text-xs ui-text-muted ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}><IdCard size={13} /> {m.member.studentId || '—'} · Batch {m.member.batch ?? '—'}</span>
            {m.member.email && <span className="ui-text-xs ui-text-muted ui-flex ui-flex-gap-2 ui-truncate" style={{ alignItems: 'center' }}><Mail size={13} /> {m.member.email}</span>}
            {m.member.phone && <span className="ui-text-xs ui-text-muted ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}><Phone size={13} /> {m.member.phone}</span>}
          </div>
          <div className="ui-flex ui-flex-gap-2" style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <Badge variant="neutral">Since {fmt(m.startsOn)}</Badge>
            {m.source && <Badge variant="primary">{m.source}</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
}

function BatchRepCard({ rep }: { rep: BatchRep }) {
  const u = rep.memberId?.userId;
  const name = `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || rep.memberId?.studentId || 'Representative';
  return (
    <div className="ui-card" style={{ padding: 0 }}>
      <div className="ui-card__body" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Avatar name={name} src={u?.avatarUrl} size={48} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="ui-flex ui-flex-between" style={{ alignItems: 'flex-start', gap: 8 }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{name}</h4>
            <Badge variant="success">Winner</Badge>
          </div>
          <p className="ui-text-xs ui-text-muted" style={{ margin: '2px 0 8px' }}>{rep.memberId?.studentId || '—'} · Batch {rep.batch || rep.memberId?.batch || '—'}</p>
          <div className="ui-flex ui-flex-gap-2 ui-flex-wrap">
            <Badge variant="neutral">Rank {rep.votingResults?.rank ?? '—'}</Badge>
            <Badge variant="primary">{rep.votingResults?.totalVotes ?? 0} votes</Badge>
            <Badge variant="neutral">{(rep.votingResults?.votePercentage ?? 0).toFixed(1)}%</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EcMembersPage() {
  const { token } = useAuth();
  const [view, setView] = useState<'current' | 'history'>('current');
  const [selectedTerm, setSelectedTerm] = useState('');

  const currentQuery = useQuery({
    queryKey: ['ec-members-current', token],
    queryFn: () => apiRequest<CurrentEcPayload>('/ec-members/current', { token }),
    enabled: Boolean(token),
  });

  const termsQuery = useQuery({
    queryKey: ['ec-members-terms', token],
    queryFn: () => apiRequest<EcTerm[]>('/ec-members/terms', { token }),
    enabled: Boolean(token),
  });

  const statsQuery = useQuery({
    queryKey: ['ec-members-stats', token],
    queryFn: () => apiRequest<Statistics>('/ec-members/statistics', { token }),
    enabled: Boolean(token),
  });

  const termMembersQuery = useQuery({
    queryKey: ['ec-members-term', selectedTerm, token],
    queryFn: () => apiRequest<TermMembersPayload>(`/ec-members/term/${selectedTerm}`, { token }),
    enabled: Boolean(token && selectedTerm),
  });

  const current = currentQuery.data;
  const stats = statsQuery.data;
  const terms = termsQuery.data ?? [];
  const panelByPost = current?.panelByPost ?? [];
  const batchReps = current?.currentBatchRepresentatives ?? {};

  const tabs = useMemo(
    () => [
      { id: 'current' as const, label: 'Current Committee', icon: Users },
      { id: 'history' as const, label: 'History by Term', icon: History },
    ],
    []
  );

  return (
    <div className="ui-page">
      <PageHeader
        title="Executive Committee"
        description="The current CSEDU Students' Club committee and its full history."
      />

      {/* Statistics */}
      {stats && (
        <div className="ui-grid-4">
          <StatsCard title="Current Members" value={stats.overview.currentEcMemberCount} icon={Users} color="primary" />
          <StatsCard title="Total Terms" value={stats.overview.totalTerms} icon={CalendarRange} color="info" />
          <StatsCard title="All-Time Members" value={stats.overview.uniqueEcMembersAllTime} icon={Award} color="success" />
          <StatsCard title="Appointments" value={stats.overview.totalHistoricalAppointments} icon={TrendingUp} color="warning" />
        </div>
      )}

      {/* Current election banner */}
      {current?.election && (
        <div className="ui-card">
          <div className="ui-card__body ui-flex ui-flex-between ui-flex-wrap" style={{ gap: 12, alignItems: 'center' }}>
            <div>
              <p className="ui-text-xs ui-text-muted" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Current Election</p>
              <h3 style={{ margin: '2px 0 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>{current.election.name}</h3>
            </div>
            <div className="ui-flex ui-flex-gap-2 ui-flex-wrap">
              <Badge variant="primary" icon={Vote}>{current.election.status}</Badge>
              <Badge variant="neutral">
                {current.election.currentPhase === 1 ? 'Phase 1 — Batch Representatives' : 'Phase 2 — Office Bearers'}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="ui-tabs" role="tablist">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = view === t.id;
          return (
            <button key={t.id} role="tab" aria-selected={active}
              className={`ui-tab ${active ? 'ui-tab--active' : ''}`} onClick={() => setView(t.id)}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Current view */}
      {view === 'current' && (
        currentQuery.isLoading ? (
          <div className="ui-flex-center" style={{ padding: 48 }}><Spinner size="lg" label="Loading committee…" /></div>
        ) : (
          <div className="ui-flex-col" style={{ gap: 24 }}>
            {/* Active term header */}
            {current?.term ? (
              <div className="ui-card">
                <div className="ui-card__body ui-flex ui-flex-gap-3" style={{ alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Landmark size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>{current.term.name}</h3>
                    <p className="ui-text-sm ui-text-muted" style={{ margin: '2px 0 0' }}>{fmt(current.term.startsOn)} – {fmt(current.term.endsOn)}</p>
                  </div>
                  <Badge variant="success" style={{ marginLeft: 'auto' }}>Active Term</Badge>
                </div>
              </div>
            ) : (
              <div className="ui-card">
                <EmptyState
                  icon={Landmark}
                  title="No active committee term"
                  description="An administrator needs to activate an EC term. Once activated, the committee panel appears here."
                />
              </div>
            )}

            {/* Panel grouped by post */}
            {panelByPost.length > 0 && (
              <div className="ui-flex-col" style={{ gap: 16 }}>
                <h3 style={{ margin: '4px 2px', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Full EC Panel</h3>
                {panelByPost.map((group) => (
                  <div key={group.postTitle} className="ui-card">
                    <div className="ui-card__header">
                      <h4 className="ui-card__title ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
                        <Building2 size={16} /> {group.postTitle}
                      </h4>
                      <Badge variant="neutral">{group.members.length} member{group.members.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    <div className="ui-card__body">
                      <div className="ui-grid-3">
                        {group.members.map((m) => <MemberCard key={m.appointmentId} m={m} />)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Flat member list fallback */}
            {panelByPost.length === 0 && (current?.members?.length ?? 0) > 0 && (
              <div className="ui-grid-3">
                {current!.members.map((m) => <MemberCard key={m.appointmentId} m={m} />)}
              </div>
            )}

            {/* Empty panel state (active term but no appointments) */}
            {current?.term && panelByPost.length === 0 && (current?.members?.length ?? 0) === 0 && Object.keys(batchReps).length === 0 && (
              <div className="ui-card">
                <EmptyState
                  icon={Users}
                  title="No members appointed yet"
                  description="This term is active but has no EC appointments. Winners are appointed automatically when election results are published."
                />
              </div>
            )}

            {/* Batch representatives */}
            {Object.keys(batchReps).length > 0 && (
              <div className="ui-flex-col" style={{ gap: 16 }}>
                <div className="ui-flex ui-flex-between" style={{ alignItems: 'center' }}>
                  <h3 style={{ margin: '4px 2px', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Current Batch Representatives</h3>
                  <span className="ui-text-sm ui-text-muted">Phase 1 winners</span>
                </div>
                {Object.entries(batchReps).map(([batch, winners]) => (
                  <div key={batch} className="ui-card">
                    <div className="ui-card__header">
                      <h4 className="ui-card__title">Batch {batch}</h4>
                      <Badge variant="success">{winners.length} winner{winners.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    <div className="ui-card__body">
                      <div className="ui-grid-3">
                        {winners.map((rep) => <BatchRepCard key={rep._id} rep={rep} />)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* History view */}
      {view === 'history' && (
        <div className="ui-flex-col" style={{ gap: 20 }}>
          <div className="ui-card">
            <div className="ui-card__body">
              <label className="ui-input-wrap" style={{ maxWidth: 420 }}>
                <span className="ui-input-label">Select EC Term</span>
                <select className="ui-select" value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}>
                  <option value="">— Select a term —</option>
                  {terms.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.status}) — {t.memberCount ?? 0} members
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {!selectedTerm ? (
            <div className="ui-card">
              <EmptyState icon={History} title="Select a term" description="Choose an EC term above to view its members." />
            </div>
          ) : termMembersQuery.isLoading ? (
            <div className="ui-flex-center" style={{ padding: 48 }}><Spinner size="lg" label="Loading term members…" /></div>
          ) : (termMembersQuery.data?.members?.length ?? 0) > 0 ? (
            <div className="ui-grid-3">
              {termMembersQuery.data!.members.map((m) => <MemberCard key={m.appointmentId} m={m} />)}
            </div>
          ) : (
            <div className="ui-card">
              <EmptyState icon={Users} title="No members for this term" description="This term has no recorded EC appointments." />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EcMembersPage;
