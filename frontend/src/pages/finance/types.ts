export type TransactionType = 'Income' | 'Expenditure';

export interface Transaction {
  _id: string;
  type: TransactionType;
  amount: number;
  category: string;
  reference: string;
  occurredOn: string;
  createdBy: { _id: string; firstName: string; lastName: string } | string;
  requiresCheque: boolean;
  chequeSignedBy: { _id: string; firstName: string; lastName: string } | null;
  chequeSignedAt: string | null;
  createdAt: string;
}

export interface LedgerResponse {
  rows: Transaction[];
  totals: { income: number; expenditure: number };
  balance: number;
}

export interface MonthlySummary {
  month: string;
  income: number;
  expenditure: number;
}

export interface CategorySummary {
  category: string;
  income: number;
  expenditure: number;
}

export interface BalancePoint {
  date: string;
  balance: number;
}

export interface SummaryResponse {
  monthly: MonthlySummary[];
  byCategory: CategorySummary[];
  runningBalance: BalancePoint[];
  overall: { income: number; expenditure: number; balance: number };
}

export interface LedgerFilters {
  type?: TransactionType | '';
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}
