import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Wallet, PlusCircle, BookOpen, BarChart2, Lock, FileSignature, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatsCard } from '../../components/ui/StatsCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { queryKeys } from '../../lib/queryKeys';
import { formatDate } from '../../lib/utils';
import { ChequeSignModal } from './ChequeSignModal';
import type { Transaction, LedgerResponse, SummaryResponse } from './types';

export function ModernFinancePage() {
  const { token, user } = useAuth();
  const canRead = user?.roles.some(r => ['Treasurer', 'Moderator', 'Chief Patron'].includes(r));
  const isTreasurer = user?.roles.includes('Treasurer');
  const canSignCheque = user?.roles.some(r => ['Moderator', 'Chief Patron'].includes(r));

  const [chequeTarget, setChequeTarget] = useState<Transaction | null>(null);

  const { data: ledger, isLoading } = useQuery({
    queryKey: queryKeys.finance.overview(token!),
    queryFn: () => apiRequest<LedgerResponse>('/finance/ledger', { token }),
    enabled: Boolean(token && canRead),
  });

  const { data: summary } = useQuery({
    queryKey: queryKeys.finance.summary(token!),
    queryFn: () => apiRequest<SummaryResponse>('/finance/summary', { token }),
    enabled: Boolean(token && canRead),
  });

  const recentRows = (ledger?.rows ?? []).slice(-8).reverse();
  const pendingCheques = (ledger?.rows ?? []).filter(
    r => r.requiresCheque && !r.chequeSignedAt
  );

  const chartData = (summary?.monthly ?? []).map(m => ({
    month: m.month.slice(5),
    income: m.income,
    expenditure: m.expenditure,
  })).slice(-6);

  return (
    <div className="ui-page">
      <PageHeader
        title="Finance"
        description="Club ledger, transactions, and financial reports"
        actions={isTreasurer && <Button href="/dashboard/finance/transactions/new" leftIcon={PlusCircle}>New Transaction</Button>}
      />

      {!canRead && (
        <div className="ui-card">
          <div className="ui-card__body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ padding: 16, borderRadius: '50%', background: 'var(--surface)' }}>
              <Lock size={32} style={{ color: 'var(--muted)' }} />
            </div>
            <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text)' }}>Restricted Access</h3>
            <p className="ui-text-sm ui-text-muted" style={{ maxWidth: 340 }}>
              Finance data is restricted to Treasurer, Moderator, and Chief Patron roles.
            </p>
          </div>
        </div>
      )}

      {canRead && (
        <>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <Spinner size="lg" label="Loading finance data..." />
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="ui-grid-3">
                <StatsCard title="Total Income" value={`৳${(ledger?.totals?.income ?? 0).toLocaleString()}`} icon={TrendingUp} color="success" />
                <StatsCard title="Total Expenditure" value={`৳${(ledger?.totals?.expenditure ?? 0).toLocaleString()}`} icon={TrendingDown} color="error" />
                <StatsCard
                  title="Current Balance"
                  value={`৳${(ledger?.balance ?? 0).toLocaleString()}`}
                  icon={Wallet}
                  color={(ledger?.balance ?? 0) >= 0 ? 'primary' : 'error'}
                />
              </div>

              {/* Trend Chart */}
              {chartData.length > 1 && (
                <div className="ui-card">
                  <div className="ui-card__header">
                    <h3 className="ui-card__title">Income vs Expenditure Trend</h3>
                  </div>
                  <div className="ui-card__body" style={{ padding: '0 16px 16px' }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="month" stroke="var(--muted)" fontSize={12} />
                        <YAxis stroke="var(--muted)" fontSize={12} tickFormatter={v => `৳${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                        <Tooltip
                          contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13 }}
                          labelStyle={{ color: 'var(--text)' }}
                          formatter={(value: number) => [`৳${value.toLocaleString()}`, '']}
                        />
                        <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
                        <Area type="monotone" dataKey="expenditure" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} name="Expenditure" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="ui-grid-3">
                {[
                  { label: 'Open Ledger', href: '/dashboard/finance/ledger', icon: BookOpen, grad: 'var(--gradient-primary)' },
                  { label: 'View Reports', href: '/dashboard/finance/reports', icon: BarChart2, grad: 'linear-gradient(135deg,#3b82f6,#2563eb)' },
                  ...(isTreasurer ? [{ label: 'New Transaction', href: '/dashboard/finance/transactions/new', icon: PlusCircle, grad: 'linear-gradient(135deg,#10b981,#059669)' }] : []),
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.label} to={item.href} style={{ textDecoration: 'none' }}>
                      <motion.div
                        whileHover={{ y: -4 }}
                        className="ui-card"
                        style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                      >
                        <div style={{ padding: 12, borderRadius: 14, background: item.grad, color: '#fff', flexShrink: 0 }}>
                          <Icon size={20} />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{item.label}</span>
                        <TrendingUp size={14} style={{ color: 'var(--muted)', marginLeft: 'auto' }} />
                      </motion.div>
                    </Link>
                  );
                })}
              </div>

              {/* Pending Cheque Approvals */}
              {canSignCheque && pendingCheques.length > 0 && (
                <div className="ui-card" style={{ padding: 0 }}>
                  <div className="ui-card__header">
                    <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileSignature size={18} /> Pending Cheque Approvals
                      <Badge variant="warning" size="sm">{pendingCheques.length}</Badge>
                    </h3>
                  </div>
                  <div>
                    {pendingCheques.slice(0, 5).map((row, i) => (
                      <div
                        key={row._id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '13px 22px',
                          borderBottom: i < Math.min(pendingCheques.length, 5) - 1 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                        }}>
                          <FileSignature size={16} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }} className="ui-truncate">
                            {row.reference}
                          </p>
                          <p className="ui-text-xs ui-text-muted" style={{ margin: '2px 0 0' }}>
                            {row.category} · ৳{row.amount.toLocaleString()} · {formatDate(row.occurredOn)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={CheckCircle2}
                          onClick={() => setChequeTarget(row)}
                        >
                          Sign
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Transactions */}
              <div className="ui-card" style={{ padding: 0 }}>
                <div className="ui-card__header">
                  <h3 className="ui-card__title">Recent Transactions</h3>
                  <Link to="/dashboard/finance/ledger" className="ui-link">View All</Link>
                </div>

                {recentRows.length === 0 ? (
                  <EmptyState icon={DollarSign} title="No transactions yet" description="Transactions will appear here once recorded" size="sm" />
                ) : (
                  <div>
                    {recentRows.map((row, i) => (
                      <motion.div
                        key={row._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '13px 22px',
                          borderBottom: i < recentRows.length - 1 ? '1px solid var(--border)' : 'none',
                          transition: 'background 0.18s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: row.type === 'Income' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          color: row.type === 'Income' ? '#10b981' : '#ef4444',
                        }}>
                          {row.type === 'Income' ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }} className="ui-truncate">
                            {row.reference}
                          </p>
                          <p className="ui-text-xs ui-text-muted" style={{ margin: '2px 0 0' }}>
                            {row.category} · {formatDate(row.occurredOn)}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          {row.requiresCheque && (
                            <Badge variant={row.chequeSignedAt ? 'success' : 'warning'} size="sm">
                              {row.chequeSignedAt ? 'Signed' : 'Pending'}
                            </Badge>
                          )}
                          <span style={{
                            fontWeight: 700, fontSize: '0.95rem',
                            color: row.type === 'Income' ? '#10b981' : '#ef4444',
                          }}>
                            {row.type === 'Income' ? '+' : '-'}৳{row.amount.toLocaleString()}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {chequeTarget && (
        <ChequeSignModal
          transaction={chequeTarget}
          onClose={() => setChequeTarget(null)}
        />
      )}
    </div>
  );
}
