import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, PieChart as PieIcon, TrendingUp, Calendar, Download, DollarSign } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { useAuth } from '../../auth/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatsCard } from '../../components/ui/StatsCard';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { useFinanceSummary } from './useFinanceQueries';
import { CATEGORY_COLORS } from './constants';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#64748b', '#eab308'];

type RangePreset = 'month' | 'quarter' | 'year' | 'all';

function getDateRange(preset: RangePreset): { startDate?: string; endDate?: string } {
  if (preset === 'all') return {};
  const now = new Date();
  const end = now.toISOString();
  let start: Date;
  if (preset === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (preset === 'quarter') {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    start = new Date(now.getFullYear(), qMonth, 1);
  } else {
    start = new Date(now.getFullYear(), 0, 1);
  }
  return { startDate: start.toISOString(), endDate: end };
}

export function ReportsPage() {
  const { user } = useAuth();
  const canRead = user?.roles.some(r => ['Treasurer', 'Moderator', 'Chief Patron'].includes(r));
  const [range, setRange] = useState<RangePreset>('year');
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'categories' | 'trends'>('overview');

  const { startDate, endDate } = useMemo(() => getDateRange(range), [range]);
  const { data: summary, isLoading } = useFinanceSummary(startDate, endDate);

  if (!canRead) {
    return (
      <div className="ui-page">
        <PageHeader title="Financial Reports" description="Restricted to finance-authorized roles" />
        <EmptyState icon={DollarSign} title="Access Denied" description="You do not have permission to view financial reports." />
      </div>
    );
  }

  const overall = summary?.overall ?? { income: 0, expenditure: 0, balance: 0 };

  const pieIncomeData = (summary?.byCategory ?? [])
    .filter(c => c.income > 0)
    .map(c => ({ name: c.category, value: c.income }));
  const pieExpenseData = (summary?.byCategory ?? [])
    .filter(c => c.expenditure > 0)
    .map(c => ({ name: c.category, value: c.expenditure }));

  function getCategoryColor(category: string, index: number) {
    return CATEGORY_COLORS[category] ?? CHART_COLORS[index % CHART_COLORS.length];
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: DollarSign },
    { key: 'monthly', label: 'Monthly', icon: BarChart2 },
    { key: 'categories', label: 'Categories', icon: PieIcon },
    { key: 'trends', label: 'Trends', icon: TrendingUp },
  ] as const;

  return (
    <div className="ui-page">
      <PageHeader
        title="Financial Reports"
        description="Analyze income, expenditure, and trends"
        actions={
          <Button variant="outline" leftIcon={Download} onClick={() => window.print()}>
            Print Report
          </Button>
        }
      />

      {/* Date Range Selectors */}
      <div className="ui-card">
        <div className="ui-card__body">
          <div className="ui-flex ui-flex-gap-2 ui-flex-wrap" style={{ alignItems: 'center' }}>
            <Calendar size={16} style={{ color: 'var(--muted)' }} />
            <span className="ui-text-sm ui-text-muted" style={{ marginRight: 8 }}>Period:</span>
            {(['month', 'quarter', 'year', 'all'] as RangePreset[]).map(preset => (
              <button
                key={preset}
                onClick={() => setRange(preset)}
                className={`ui-btn ui-btn--sm ${range === preset ? 'ui-btn--primary' : 'ui-btn--ghost'}`}
              >
                {preset === 'month' ? 'This Month' : preset === 'quarter' ? 'This Quarter' : preset === 'year' ? 'This Year' : 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Spinner size="lg" label="Loading report data..." />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="ui-grid-3">
            <StatsCard title="Total Income" value={`৳${overall.income.toLocaleString()}`} icon={TrendingUp} color="success" />
            <StatsCard title="Total Expenditure" value={`৳${overall.expenditure.toLocaleString()}`} icon={BarChart2} color="error" />
            <StatsCard
              title="Net Balance"
              value={`৳${overall.balance.toLocaleString()}`}
              icon={DollarSign}
              color={overall.balance >= 0 ? 'primary' : 'error'}
            />
          </div>

          {/* Tabs */}
          <div className="ui-card" style={{ padding: 0 }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px' }}>
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '14px 16px', border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: '0.85rem', fontWeight: activeTab === tab.key ? 600 : 400,
                      color: activeTab === tab.key ? 'var(--accent)' : 'var(--muted)',
                      borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon size={15} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div style={{ padding: '24px' }}>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div>
                      <h4 style={{ margin: '0 0 16px', color: 'var(--text)', fontWeight: 600 }}>Income by Category</h4>
                      {pieIncomeData.length === 0 ? (
                        <p className="ui-text-sm ui-text-muted">No income data for this period</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {pieIncomeData.map((item, i) => (
                            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: getCategoryColor(item.name, i), flexShrink: 0 }} />
                              <span className="ui-text-sm" style={{ flex: 1, color: 'var(--text)' }}>{item.name}</span>
                              <span className="ui-text-sm" style={{ fontWeight: 600, color: '#10b981' }}>৳{item.value.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 16px', color: 'var(--text)', fontWeight: 600 }}>Expenditure by Category</h4>
                      {pieExpenseData.length === 0 ? (
                        <p className="ui-text-sm ui-text-muted">No expenditure data for this period</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {pieExpenseData.map((item, i) => (
                            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: getCategoryColor(item.name, i), flexShrink: 0 }} />
                              <span className="ui-text-sm" style={{ flex: 1, color: 'var(--text)' }}>{item.name}</span>
                              <span className="ui-text-sm" style={{ fontWeight: 600, color: '#ef4444' }}>৳{item.value.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Monthly Tab */}
              {activeTab === 'monthly' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {(summary?.monthly ?? []).length === 0 ? (
                    <EmptyState icon={BarChart2} title="No monthly data" description="No transactions found for this period" size="sm" />
                  ) : (
                    <ResponsiveContainer width="100%" height={360}>
                      <BarChart data={summary?.monthly ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }}
                          labelStyle={{ color: 'var(--text)' }}
                          formatter={(value: number) => `৳${value.toLocaleString()}`}
                        />
                        <Legend wrapperStyle={{ color: 'var(--text)' }} />
                        <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenditure" name="Expenditure" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </motion.div>
              )}

              {/* Categories Tab */}
              {activeTab === 'categories' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                    <div>
                      <h4 style={{ margin: '0 0 16px', color: 'var(--text)', fontWeight: 600, textAlign: 'center' }}>Income Distribution</h4>
                      {pieIncomeData.length === 0 ? (
                        <p className="ui-text-sm ui-text-muted" style={{ textAlign: 'center' }}>No data</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie data={pieIncomeData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                              {pieIncomeData.map((entry, i) => (
                                <Cell key={entry.name} fill={getCategoryColor(entry.name, i)} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `৳${value.toLocaleString()}`} contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 16px', color: 'var(--text)', fontWeight: 600, textAlign: 'center' }}>Expenditure Distribution</h4>
                      {pieExpenseData.length === 0 ? (
                        <p className="ui-text-sm ui-text-muted" style={{ textAlign: 'center' }}>No data</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie data={pieExpenseData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                              {pieExpenseData.map((entry, i) => (
                                <Cell key={entry.name} fill={getCategoryColor(entry.name, i)} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `৳${value.toLocaleString()}`} contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Trends Tab */}
              {activeTab === 'trends' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {(summary?.runningBalance ?? []).length === 0 ? (
                    <EmptyState icon={TrendingUp} title="No trend data" description="Record transactions to see balance trends" size="sm" />
                  ) : (
                    <ResponsiveContainer width="100%" height={360}>
                      <AreaChart data={summary?.runningBalance ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }}
                          formatter={(value: number) => `৳${value.toLocaleString()}`}
                        />
                        <Area type="monotone" dataKey="balance" stroke="#6366f1" fillOpacity={1} fill="url(#balanceGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
