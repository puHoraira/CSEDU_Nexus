import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, GraduationCap, ChevronDown, ChevronUp, Vote } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { Spinner } from '../ui/Spinner';
import { batchToSession, buildBatchSummary, YEAR_LABELS } from '../../lib/academicYear';

type MemberRow = {
  _id: string;
  studentId: string;
  batch: number;
  currentYear: number;
  session?: string;
  membershipStatus?: { status: string };
  // legacy flat field
  status?: string;
};

// Voting-eligible years for undergrad: Year 1–4 (not Year 5 extended)
const VOTING_ELIGIBLE_YEARS = [1, 2, 3, 4];

export function SessionBatchOverview() {
  const { token } = useAuth();
  const [expanded, setExpanded] = useState(true);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members-for-batch-overview', token],
    queryFn: () => apiRequest<MemberRow[]>('/membership/members', { token }),
    enabled: Boolean(token),
  });

  const activeMembers = members.filter(m => {
    const status = m.membershipStatus?.status ?? m.status;
    return status === 'Active';
  });

  const summary = buildBatchSummary(activeMembers);

  // Group by batch for display
  const batchGroups = summary.reduce<Record<number, typeof summary>>((acc, entry) => {
    if (!acc[entry.batch]) acc[entry.batch] = [];
    acc[entry.batch].push(entry);
    return acc;
  }, {});

  const totalVotingEligible = activeMembers.filter(m =>
    VOTING_ELIGIBLE_YEARS.includes(m.currentYear)
  ).length;

  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid var(--border)',
        background: 'var(--panel-strong)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, var(--accent), #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <GraduationCap size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
            Session & Batch Overview
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>
            Active members by batch, session, and academic year
          </p>
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--muted)' }} />}
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: 20 }}>
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                  <Spinner size="md" label="Loading members..." />
                </div>
              )}

              {!isLoading && (
                <>
                  {/* Summary stats */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: 10,
                      marginBottom: 20,
                    }}
                  >
                    <StatCard
                      icon={Users}
                      label="Active Members"
                      value={activeMembers.length}
                      color="var(--accent)"
                    />
                    <StatCard
                      icon={GraduationCap}
                      label="Active Batches"
                      value={Object.keys(batchGroups).length}
                      color="#8b5cf6"
                    />
                    <StatCard
                      icon={Vote}
                      label="Voting Eligible"
                      value={totalVotingEligible}
                      color="#10b981"
                      subtitle="Year 1–4"
                    />
                  </div>

                  {/* Batch groups */}
                  {Object.keys(batchGroups).length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                      No active members found
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {Object.entries(batchGroups)
                        .sort(([a], [b]) => Number(b) - Number(a))
                        .map(([batchStr, entries]) => {
                          const batch = Number(batchStr);
                          const session = batchToSession(batch);
                          const totalInBatch = entries.reduce((s, e) => s + e.memberCount, 0);
                          const votingInBatch = entries
                            .filter(e => VOTING_ELIGIBLE_YEARS.includes(e.currentYear))
                            .reduce((s, e) => s + e.memberCount, 0);

                          return (
                            <motion.div
                              key={batch}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              style={{
                                borderRadius: 12,
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                overflow: 'hidden',
                              }}
                            >
                              {/* Batch header */}
                              <div
                                style={{
                                  padding: '12px 16px',
                                  background: 'var(--panel)',
                                  borderBottom: '1px solid var(--border)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: 8,
                                }}
                              >
                                <div>
                                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                                    Batch {batch}
                                  </span>
                                  <span
                                    style={{
                                      marginLeft: 8,
                                      fontSize: '0.78rem',
                                      color: 'var(--accent)',
                                      fontWeight: 600,
                                      background: 'var(--accent)18',
                                      padding: '2px 8px',
                                      borderRadius: 6,
                                    }}
                                  >
                                    Session {session}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: 10, fontSize: '0.78rem' }}>
                                  <span style={{ color: 'var(--muted)' }}>
                                    <strong style={{ color: 'var(--text)' }}>{totalInBatch}</strong> members
                                  </span>
                                  <span style={{ color: '#10b981' }}>
                                    <strong>{votingInBatch}</strong> voting eligible
                                  </span>
                                </div>
                              </div>

                              {/* Year breakdown */}
                              <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {entries
                                  .sort((a, b) => a.currentYear - b.currentYear)
                                  .map(entry => {
                                    const isVotingEligible = VOTING_ELIGIBLE_YEARS.includes(entry.currentYear);
                                    const pct = totalInBatch > 0 ? (entry.memberCount / totalInBatch) * 100 : 0;

                                    return (
                                      <div key={entry.currentYear} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 90, flexShrink: 0 }}>
                                          <span
                                            style={{
                                              fontSize: '0.78rem',
                                              fontWeight: 600,
                                              color: isVotingEligible ? 'var(--text)' : 'var(--muted)',
                                            }}
                                          >
                                            {entry.yearLabel}
                                          </span>
                                        </div>
                                        <div style={{ flex: 1, height: 8, background: 'var(--panel)', borderRadius: 999, overflow: 'hidden' }}>
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.6, delay: 0.1 }}
                                            style={{
                                              height: '100%',
                                              borderRadius: 999,
                                              background: isVotingEligible
                                                ? 'linear-gradient(90deg, var(--accent), #6366f1)'
                                                : 'var(--border)',
                                            }}
                                          />
                                        </div>
                                        <div style={{ width: 60, textAlign: 'right', flexShrink: 0 }}>
                                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
                                            {entry.memberCount}
                                          </span>
                                          {isVotingEligible && (
                                            <span
                                              title="Voting eligible"
                                              style={{
                                                marginLeft: 4,
                                                fontSize: '0.65rem',
                                                color: '#10b981',
                                                fontWeight: 600,
                                              }}
                                            >
                                              ✓
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  )}

                  {/* Legend */}
                  <div
                    style={{
                      marginTop: 16,
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      gap: 16,
                      flexWrap: 'wrap',
                      fontSize: '0.75rem',
                      color: 'var(--muted)',
                    }}
                  >
                    <span>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Voting eligible</span>
                      {' '}— Year 1, 2, 3, 4 (active undergrad)
                    </span>
                    <span>
                      <span style={{ color: 'var(--muted)', fontWeight: 700 }}>Year 5</span>
                      {' '}— Extended / readmission (not voting eligible)
                    </span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.2 }}>
          {label}
          {subtitle && <span style={{ display: 'block', color: color, fontWeight: 600 }}>{subtitle}</span>}
        </p>
      </div>
    </div>
  );
}
