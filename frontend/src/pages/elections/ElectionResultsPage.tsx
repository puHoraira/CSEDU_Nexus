import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Trophy, Medal, Award, BarChart2, PieChart as PieIcon, Users } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';

type ResultRow = {
  candidateId: string;
  total: number;
  candidateName: string;
  studentId?: string | null;
  batch?: number | null;
  post?: { title?: string } | null;
};

const CHART_COLORS = ['#6ba3ff','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'];

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy size={20} style={{ color: '#f59e0b' }} />;
  if (rank === 2) return <Medal size={20} style={{ color: '#94a3b8' }} />;
  if (rank === 3) return <Award size={20} style={{ color: '#cd7c2f' }} />;
  return <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)', width: 20, textAlign: 'center' }}>{rank}</span>;
}

export function ElectionResultsPage() {
  const { id } = useParams();
  const { token, loading } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ['election-results', id, token],
    queryFn: () => apiRequest<ResultRow[]>(`/elections/${id}/results`, { token }),
    enabled: Boolean(token && id) && !loading,
  });

  const sorted = useMemo(() =>
    [...data].sort((a, b) => b.total - a.total),
    [data]
  );

  const totalVotes = useMemo(() => data.reduce((s, r) => s + r.total, 0), [data]);

  // Group by post for multi-post elections
  const byPost = useMemo(() => {
    const map = new Map<string, ResultRow[]>();
    sorted.forEach(r => {
      const key = r.post?.title || 'Batch Representative';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return map;
  }, [sorted]);

  const chartData = sorted.map(r => ({
    name: r.candidateName.split(' ')[0],
    fullName: r.candidateName,
    votes: r.total,
    pct: totalVotes > 0 ? Math.round((r.total / totalVotes) * 100) : 0,
  }));

  const pieData = sorted.slice(0, 8).map((r, i) => ({
    name: r.candidateName.split(' ')[0],
    value: r.total,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="ui-page">
      <PageHeader
        title="Election Results"
        description="Transparent result publication with vote breakdown"
        backButton
        breadcrumbs={[{ label: 'Elections', href: '/dashboard/elections' }, { label: 'Results' }]}
      />

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Spinner size="lg" label="Loading results…" />
        </div>
      )}

      {!isLoading && data.length === 0 && (
        <div className="ui-card">
          <EmptyState icon={BarChart2} title="No results yet" description="Results will appear once the election is closed and published." />
        </div>
      )}

      {!isLoading && data.length > 0 && (
        <>
          {/* Summary */}
          <div className="ui-grid-3">
            {[
              { label: 'Total Votes Cast', value: totalVotes, icon: Users },
              { label: 'Candidates',        value: data.length, icon: Medal },
              { label: 'Winner',            value: sorted[0]?.candidateName.split(' ')[0] ?? '—', icon: Trophy },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ padding: 12, borderRadius: 14, background: 'var(--gradient-primary)', color: '#fff', flexShrink: 0 }}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)' }}>{s.value}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Charts */}
          <div className="ui-grid-2">
            {/* Bar Chart */}
            <div className="ui-card">
              <div className="ui-card__header">
                <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart2 size={18} /> Vote Distribution
                </h3>
              </div>
              <div className="ui-card__body">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }}
                      formatter={(value: number, _: string, entry: any) => [
                        `${value} votes (${entry.payload.pct}%)`,
                        entry.payload.fullName,
                      ]}
                    />
                    <Bar dataKey="votes" radius={[6, 6, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="ui-card">
              <div className="ui-card__header">
                <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PieIcon size={18} /> Vote Share
                </h3>
              </div>
              <div className="ui-card__body">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                      paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }}
                      formatter={(value: number) => [`${value} votes`, '']}
                    />
                    <Legend formatter={(value) => <span style={{ color: 'var(--muted)', fontSize: 12 }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Results by Post */}
          {Array.from(byPost.entries()).map(([postTitle, candidates]) => (
            <div key={postTitle} className="ui-card" style={{ padding: 0 }}>
              <div className="ui-card__header">
                <h3 className="ui-card__title">{postTitle}</h3>
                <Badge variant="neutral">{candidates.length} candidates</Badge>
              </div>
              <div>
                {candidates.map((row, i) => {
                  const pct = totalVotes > 0 ? (row.total / totalVotes) * 100 : 0;
                  const isWinner = i === 0;
                  return (
                    <motion.div key={row.candidateId}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16, padding: '14px 22px',
                        borderBottom: i < candidates.length - 1 ? '1px solid var(--border)' : 'none',
                        background: isWinner ? 'rgba(245,158,11,0.05)' : 'transparent',
                      }}
                    >
                      {/* Rank */}
                      <div style={{ width: 28, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                        <RankIcon rank={i + 1} />
                      </div>

                      {/* Avatar */}
                      <div style={{
                        width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                        background: `linear-gradient(135deg, ${CHART_COLORS[i % CHART_COLORS.length]}, ${CHART_COLORS[(i + 1) % CHART_COLORS.length]})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: '1rem',
                      }}>
                        {row.candidateName.charAt(0)}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>{row.candidateName}</span>
                          {isWinner && <Badge variant="warning">Winner</Badge>}
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 8 }}>
                          {row.studentId && <span>ID: {row.studentId}</span>}
                          {row.batch && <span>Batch: {row.batch}</span>}
                        </div>
                        {/* Progress bar */}
                        <div style={{ height: 6, background: 'var(--surface)', borderRadius: 999, overflow: 'hidden' }}>
                          <motion.div
                            style={{ height: '100%', background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 999 }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: i * 0.1 }}
                          />
                        </div>
                      </div>

                      {/* Votes */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)' }}>{row.total}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{pct.toFixed(1)}%</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
