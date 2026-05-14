import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook to force refetch queries on navigation
 * This ensures data is always fresh when switching between pages
 * 
 * Usage: Call this hook once in your App component
 */
export function useNavigationRefetch() {
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalidate all queries when route changes
    // This forces a refetch of all active queries on the new page
    queryClient.invalidateQueries();
  }, [location.pathname, queryClient]);
}
