import { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Download, PlusCircle, TrendingUp, TrendingDown, Wallet,
  ChevronLeft, ChevronRight, ArrowUpDown, X, FileCheck, Clock,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatsCard } from '../../components/ui/StatsCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { useFinanceLedger, useFinanceCategories } from './useFinanceQueries';
import { ChequeSignModal } from './ChequeSignModal';
import type { Transaction, LedgerFilters } from './types';

type SortField = 'occurredOn' | 'amount' | 'category' | 'type';
type SortDir = 'asc' | 'desc';

export function LedgerPage() {
  const { user } = useAuth();
  const isTreasurer = user?.roles.includes('Treasurer');
  const canSign = user?.roles.some((r) => ['Moderator', 'Chief Patron'].includes(r));

  const [filters, setFilters] = useState<LedgerFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [sortField, setSortField] = useState<SortField>('occurredOn');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [chequeTransaction, setChequeTransaction] = useState<Transaction | null>(null);

  const { data: ledger, isLoading } = useFinanceLedger(filters);
  const { data: categories } = useFinanceCategories();

  const applySearch = useCallback(() => {
    setFilters((f) => ({ ...f, search: searchInput || undefined }));
    setPage(0);
  }, [searchInput]);

  const clearFilters = () => {
    setFilters({});
    setSearchInput('');
    setPage(0);
  };

  const hasActiveFilters = Boolean(filters.type || filters.category || filters.startDate || filters.endDate || filters.search);

  const sortedRows = useMemo(() => {
    const rows = ledger?.rows ?? [];
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'occurredOn') cmp = new Date(a.occurredOn).getTime() - new Date(b.occurredOn).getTime();
      else if (sortField === 'amount') cmp = a.amount - b.amount;
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
      else if (sortField === 'type') cmp = a.type.localeCompare(b.type);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [ledger?.rows, sortField, sortDir]);

  const totalPages = Math.ceil(sortedRows.length / pageSize);
  const pageRows = sortedRows.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const exportCSV = () => {
    const header = 'Date,Type,Category,Reference,Amount,Cheque Required,Cheque Signed\n';
    const body = sortedRows.map((r) =>
      `${new Date(r.occurredOn).toLocaleDateString()},${r.type},${r.category},"${r.reference}",${r.amount},${r.requiresCheque ? 'Yes' : 'No'},${r.chequeSignedAt ? 'Yes' : 'No'}`
    ).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ui-page">
      <PageHeader
        title="Ledger"
        description="Complete financial transaction history"
        actions={
          <div className="ui-flex ui-flex-gap-2">
            <Button variant="outline" leftIcon={Download} onClick={exportCSV}>Export CSV</Button>
            {isTreasurer && <Button href="/dashboard/finance/transactions/new" leftIcon={PlusCircle}>New Transaction</Button>}
          </div>
        }
      />

      {/* Stats */}
      <div className="ui-grid-3">
        <StatsCard title="Total Income" value={`৳${(ledger?.totals?.income ?? 0).toLocaleString()}`} icon={TrendingUp} color="success" />
        <StatsCard title="Total Expenditure" value={`৳${(ledger?.totals?.expenditure ?? 0).toLocaleString()}`} icon={TrendingDown} color="error" />
        <StatsCard title="Balance" value={`৳${(ledger?.balance ?? 0).toLocaleString()}`} icon={Wallet} color={(ledger?.balance ?? 0) >= 0 ? 'primary' : 'error'} />
      </div>

      {/* Filters */}
      <div className="ui-card">
        <div className="ui-card__body">
          <div className="ui-flex ui-flex-gap-3 ui-flex-wrap" style={{ alignItems: 'flex-end' }}>
            <div className="ui-flex-1" style={{ minWidth: 200 }}>
              <div className="ui-input-row">
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  className="ui-input ui-input--icon"
                  placeholder="Search reference..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>
            <select
              className="ui-select"
              value={filters.type || ''}
              onChange={(e) => { setFilters((f) => ({ ...f, type: e.target.value as any || undefined })); setPage(0); }}
            >
              <option value="">All Types</option>
              <option value="Income">Income</option>
              <option value="Expenditure">Expenditure</option>
            </select>
            <select
              className="ui-select"
              value={filters.category || ''}
              onChange={(e) => { setFilters((f) => ({ ...f, category: e.target.value || undefined })); setPage(0); }}
            >
              <option value="">All Categories</option>
              {(categories ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="date"
              className="ui-input"
              value={filters.startDate?.slice(0, 10) || ''}
              onChange={(e) => { setFilters((f) => ({ ...f, startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })); setPage(0); }}
              title="From date"
            />
            <input
              type="date"
              className="ui-input"
              value={filters.endDate?.slice(0, 10) || ''}
              onChange={(e) => { setFilters((f) => ({ ...f, endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })); setPage(0); }}
              title="To date"
            />
            <Button variant="outline" onClick={applySearch}>Search</Button>
            {hasActiveFilters && (
              <Button variant="ghost" leftIcon={X} onClick={clearFilters}>Clear</Button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Spinner size="lg" label="Loading ledger..." />
        </div>
      ) : sortedRows.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No transactions found" description={hasActiveFilters ? 'Try adjusting your filters' : 'Transactions will appear here once recorded'} />
      ) : (
        <div className="ui-card">
          <div className="ui-card__body ui-card__body--flush">
            <div className="ui-table--scroll">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th onClick={() => toggleSort('occurredOn')} style={{ cursor: 'pointer' }}>
                      <span className="ui-flex ui-flex-gap-1" style={{ alignItems: 'center' }}>Date <ArrowUpDown size={12} /></span>
                    </th>
                    <th onClick={() => toggleSort('type')} style={{ cursor: 'pointer' }}>
                      <span className="ui-flex ui-flex-gap-1" style={{ alignItems: 'center' }}>Type <ArrowUpDown size={12} /></span>
                    </th>
                    <th onClick={() => toggleSort('category')} style={{ cursor: 'pointer' }}>
                      <span className="ui-flex ui-flex-gap-1" style={{ alignItems: 'center' }}>Category <ArrowUpDown size={12} /></span>
                    </th>
                    <th>Reference</th>
                    <th onClick={() => toggleSort('amount')} style={{ cursor: 'pointer' }}>
                      <span className="ui-flex ui-flex-gap-1" style={{ alignItems: 'center' }}>Amount <ArrowUpDown size={12} /></span>
                    </th>
                    <th>Cheque</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, i) => (
                    <motion.tr
                      key={row._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <td>{new Date(row.occurredOn).toLocaleDateString()}</td>
                      <td>
                        <Badge variant={row.type === 'Income' ? 'success' : 'error'} size="sm">
                          {row.type}
                        </Badge>
                      </td>
                      <td>{row.category}</td>
                      <td style={{ maxWidth: 220 }} className="ui-truncate">{row.reference}</td>
                      <td style={{ fontWeight: 600, color: row.type === 'Income' ? '#10b981' : '#ef4444' }}>
                        {row.type === 'Income' ? '+' : '-'}৳{row.amount.toLocaleString()}
                      </td>
                      <td>
                        {!row.requiresCheque ? (
                          <span style={{ color: 'var(--muted)' }}>—</span>
                        ) : row.chequeSignedAt ? (
                          <Badge variant="success" size="sm" icon={FileCheck}>Signed</Badge>
                        ) : canSign ? (
                          <Badge
                            variant="warning"
                            size="sm"
                            icon={Clock}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setChequeTransaction(row)}
                          >
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm" icon={Clock}>Pending</Badge>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="ui-card__footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
            <span className="ui-text-sm ui-text-muted">
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sortedRows.length)} of {sortedRows.length}
            </span>
            <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
              <select
                className="ui-select"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                style={{ width: 'auto' }}
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft size={16} />
              </Button>
              <span className="ui-text-sm">{page + 1} / {totalPages || 1}</span>
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cheque Sign Modal */}
      {chequeTransaction && (
        <ChequeSignModal
          transaction={chequeTransaction}
          onClose={() => setChequeTransaction(null)}
        />
      )}
    </div>
  );
}
