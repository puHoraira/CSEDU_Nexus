import { QueryClient } from '@tanstack/react-query';

/**
 * Centralized React Query configuration
 * 
 * IMPORTANT: This configuration is optimized for IMMEDIATE data loading on navigation.
 * - staleTime: 0 means data is always considered stale and will refetch
 * - refetchOnMount: true ensures data loads when navigating between pages
 * - Combined with useNavigationRefetch hook, this prevents the "need to refresh" issue
 * 
 * Trade-off: More network requests, but always fresh data and better UX
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: Data is considered stale immediately
      // This forces refetch on every mount/navigation
      staleTime: 0, // 0 seconds - always stale, always refetch
      
      // Cache time: Keep data in cache for 5 minutes for back/forward navigation
      gcTime: 5 * 60 * 1000, // 5 minutes
      
      // Retry failed requests
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403 (auth errors)
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Retry up to 1 time for other errors (faster failure)
        return failureCount < 1;
      },
      
      // Refetch on window focus
      refetchOnWindowFocus: true,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
      
      // Refetch on mount - critical for navigation
      refetchOnMount: true,
      
      // Network mode - only fetch when online
      networkMode: 'online',
      
      // IMPORTANT: Don't use suspense mode as it can cause issues with navigation
      suspense: false,
      
      // Use error boundaries for better error handling
      useErrorBoundary: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      
      // Network mode for mutations
      networkMode: 'online',
      
      // Use error boundaries for mutations
      useErrorBoundary: false,
    },
  },
});

/**
 * Helper function to invalidate all related queries for a resource
 * This ensures data consistency across the application
 */
export const invalidateAllQueries = async (resource: string, token?: string) => {
  const patterns = [
    [resource],
    [resource, token],
    [`${resource}-*`],
  ].filter(Boolean);

  await Promise.all(
    patterns.map(pattern => 
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          if (Array.isArray(key)) {
            return key.some(k => 
              typeof k === 'string' && 
              (k === resource || k.startsWith(`${resource}-`) || k.includes(resource))
            );
          }
          return false;
        }
      })
    )
  );
};

/**
 * Helper to clear all cache when user logs out
 */
export const clearAllCache = () => {
  queryClient.clear();
};

/**
 * Helper to prefetch common data
 */
export const prefetchCommonData = async (token: string) => {
  if (!token) return;

  // Prefetch user profile
  queryClient.prefetchQuery({
    queryKey: ['auth', 'me', token],
    queryFn: () => fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => res.json()),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};