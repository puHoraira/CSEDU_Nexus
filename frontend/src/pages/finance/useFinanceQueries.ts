import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type { LedgerResponse, LedgerFilters, SummaryResponse } from './types';

function buildQueryString(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&');
}

export function useFinanceLedger(filters: LedgerFilters = {}) {
  const { token, user } = useAuth();
  const canRead = user?.roles?.some((r: string) => ['Treasurer', 'Moderator', 'Chief Patron'].includes(r));

  return useQuery({
    queryKey: queryKeys.finance.ledger(token!, filters),
    queryFn: () => {
      const qs = buildQueryString({
        type: filters.type || undefined,
        category: filters.category || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        search: filters.search || undefined,
      });
      return apiRequest<LedgerResponse>(`/finance/ledger${qs}`, { token });
    },
    enabled: Boolean(token && canRead),
  });
}

export function useFinanceSummary(startDate?: string, endDate?: string) {
  const { token, user } = useAuth();
  const canRead = user?.roles?.some((r: string) => ['Treasurer', 'Moderator', 'Chief Patron'].includes(r));

  return useQuery({
    queryKey: queryKeys.finance.summary(token!, startDate, endDate),
    queryFn: () => {
      const qs = buildQueryString({ startDate, endDate });
      return apiRequest<SummaryResponse>(`/finance/summary${qs}`, { token });
    },
    enabled: Boolean(token && canRead),
  });
}

export function useFinanceCategories() {
  const { token, user } = useAuth();
  const canRead = user?.roles?.some((r: string) => ['Treasurer', 'Moderator', 'Chief Patron'].includes(r));

  return useQuery({
    queryKey: queryKeys.finance.categories(token!),
    queryFn: () => apiRequest<string[]>('/finance/categories', { token }),
    enabled: Boolean(token && canRead),
  });
}

export function usePendingCheques() {
  const { token, user } = useAuth();
  const canSign = user?.roles?.some((r: string) => ['Moderator', 'Chief Patron'].includes(r));

  return useQuery({
    queryKey: queryKeys.finance.pendingCheques(token!),
    queryFn: () => apiRequest<any[]>('/finance/pending-cheques', { token }),
    enabled: Boolean(token && canSign),
  });
}

export function useCreateTransaction() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      type: 'Income' | 'Expenditure';
      amount: number;
      category: string;
      reference: string;
      occurredOn?: string;
      requiresCheque?: boolean;
    }) =>
      apiRequest('/finance/transactions', {
        method: 'POST',
        token,
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}

export function useSignCheque() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, note }: { transactionId: string; note?: string }) =>
      apiRequest(`/finance/transactions/${transactionId}/sign-cheque`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ note: note || '' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}
