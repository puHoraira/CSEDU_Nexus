# Navigation Auto-Reload Fix

## Problem
When navigating between different sections (e.g., Profile → Events → Meetings), data doesn't load automatically and requires a manual page refresh. This creates a poor user experience.

## Root Cause Analysis

The issue stems from React Query's caching and query key management:

1. **Query Key Inconsistency**: Some queries use different key structures, making cache invalidation unreliable
2. **Stale Data Serving**: Even with `staleTime: 0`, React Query may serve cached data if the component doesn't properly trigger a refetch
3. **Missing Refetch Triggers**: Navigation doesn't always trigger query refetches due to how React Router handles route changes
4. **Auth Loading State**: The `loading` state from AuthContext might prevent queries from running during navigation

## Solution

### 1. Update React Query Configuration

**File**: `frontend/src/lib/reactQueryConfig.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is immediately stale - always refetch on mount
      staleTime: 0,
      
      // Keep data in cache for quick back/forward navigation
      gcTime: 5 * 60 * 1000, // 5 minutes
      
      // Retry configuration
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 1;
      },
      
      // Refetch behaviors - CRITICAL for navigation
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true, // Changed from 'always' to true for better performance
      
      // Network mode
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});
```

### 2. Create Navigation Observer Hook

**File**: `frontend/src/hooks/useNavigationRefetch.ts`

```typescript
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook to force refetch queries on navigation
 * This ensures data is always fresh when switching between pages
 */
export function useNavigationRefetch() {
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalidate all queries when route changes
    // This forces a refetch of all active queries
    queryClient.invalidateQueries();
  }, [location.pathname, queryClient]);
}
```

### 3. Update App Component to Use Navigation Observer

**File**: `frontend/src/App.tsx`

Add the hook at the top of the App component:

```typescript
import { useNavigationRefetch } from './hooks/useNavigationRefetch';

export default function App() {
  // Force refetch on navigation
  useNavigationRefetch();
  
  return (
    <Routes>
      {/* ... existing routes ... */}
    </Routes>
  );
}
```

### 4. Update Query Enabled Logic

Remove the `&& !loading` condition from query enabled checks, as it can prevent queries from running during navigation transitions.

**Pattern to Update**:
```typescript
// BEFORE (problematic)
enabled: Boolean(token) && !loading

// AFTER (fixed)
enabled: Boolean(token)
```

**Files to Update**:
- `frontend/src/pages/dashboard/ModernProfilePage.tsx`
- `frontend/src/pages/events/ModernEventsPage.tsx`
- `frontend/src/pages/meetings/ModernMeetingsPage.tsx`
- All other page components with queries

### 5. Add Query Key Consistency

Ensure all queries use consistent query keys from the centralized `queryKeys` object.

**File**: `frontend/src/lib/queryKeys.ts`

Make sure all resources have proper query key factories:

```typescript
export const queryKeys = {
  auth: {
    me: (token: string) => ['auth', 'me', token] as const,
  },
  events: {
    all: (token: string) => ['events', token] as const,
    detail: (id: string, token: string) => ['events', id, token] as const,
    public: () => ['events', 'public'] as const,
  },
  meetings: {
    all: (token: string) => ['meetings', token] as const,
    detail: (id: string, token: string) => ['meetings', id, token] as const,
    live: (token: string) => ['meetings', 'live', token] as const,
  },
  // ... add more as needed
};
```

### 6. Alternative: Use Route-Based Refetch

If the global invalidation is too aggressive, use a more targeted approach:

**File**: `frontend/src/hooks/useRouteRefetch.ts`

```typescript
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

const routeQueryMap: Record<string, string[]> = {
  '/dashboard/profile': ['my-profile', 'auth'],
  '/dashboard/events': ['events'],
  '/dashboard/meetings': ['meetings'],
  '/dashboard/elections': ['elections'],
  '/dashboard/workshops': ['workshops'],
  '/dashboard/finance': ['finance'],
  '/dashboard/certificates': ['certificates'],
  '/dashboard/membership': ['members', 'membership'],
  '/dashboard/governance': ['ec-terms', 'ec-posts', 'ec-appointments'],
};

export function useRouteRefetch() {
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Find matching route patterns
    const matchingKeys = Object.entries(routeQueryMap)
      .filter(([route]) => location.pathname.startsWith(route))
      .flatMap(([, keys]) => keys);

    if (matchingKeys.length > 0) {
      // Invalidate only relevant queries
      matchingKeys.forEach(key => {
        queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey;
            return Array.isArray(queryKey) && queryKey.some(k => 
              typeof k === 'string' && k.includes(key)
            );
          }
        });
      });
    }
  }, [location.pathname, queryClient]);
}
```

## Implementation Steps

1. ✅ Update `reactQueryConfig.ts` with new configuration
2. ✅ Create `useNavigationRefetch.ts` hook
3. ✅ Add hook to `App.tsx`
4. ✅ Remove `&& !loading` from all query enabled conditions
5. ✅ Test navigation between different sections
6. ✅ Verify data loads automatically without refresh

## Testing Checklist

- [ ] Navigate from Dashboard → Profile (data loads automatically)
- [ ] Navigate from Profile → Events (data loads automatically)
- [ ] Navigate from Events → Meetings (data loads automatically)
- [ ] Navigate from Meetings → Elections (data loads automatically)
- [ ] Navigate from Elections → Workshops (data loads automatically)
- [ ] Back button works correctly with cached data
- [ ] Forward button works correctly
- [ ] No unnecessary network requests on rapid navigation
- [ ] Loading states display correctly during navigation

## Performance Considerations

### Option 1: Global Invalidation (Simpler, More Network Requests)
- Pros: Guarantees fresh data, simple implementation
- Cons: More network requests, slightly slower navigation

### Option 2: Targeted Invalidation (Optimized, More Complex)
- Pros: Fewer network requests, faster navigation
- Cons: Requires maintaining route-to-query mapping

**Recommendation**: Start with Option 1 (global invalidation) for immediate fix, then optimize with Option 2 if performance becomes an issue.

## Additional Improvements

### 1. Add Loading Indicators During Navigation

```typescript
// In App.tsx or layout component
const location = useLocation();
const [isNavigating, setIsNavigating] = useState(false);

useEffect(() => {
  setIsNavigating(true);
  const timer = setTimeout(() => setIsNavigating(false), 300);
  return () => clearTimeout(timer);
}, [location.pathname]);

// Show loading bar at top of page
{isNavigating && <div className="navigation-loading-bar" />}
```

### 2. Prefetch on Link Hover

```typescript
// In navigation links
<Link 
  to="/dashboard/events"
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.events.all(token),
      queryFn: () => apiRequest('/events', { token })
    });
  }}
>
  Events
</Link>
```

### 3. Add Suspense Boundaries

```typescript
// Wrap route components with Suspense
<Suspense fallback={<PageLoadingSpinner />}>
  <ModernEventsPage />
</Suspense>
```

## Rollback Plan

If the fix causes issues:

1. Revert `reactQueryConfig.ts` to original settings
2. Remove `useNavigationRefetch` hook
3. Restore `&& !loading` conditions in queries
4. Clear browser cache and localStorage

## Related Files

- `frontend/src/lib/reactQueryConfig.ts`
- `frontend/src/hooks/useNavigationRefetch.ts`
- `frontend/src/App.tsx`
- `frontend/src/pages/**/*.tsx` (all page components)
- `frontend/src/lib/queryKeys.ts`

## References

- [React Query: Important Defaults](https://tanstack.com/query/latest/docs/react/guides/important-defaults)
- [React Query: Window Focus Refetching](https://tanstack.com/query/latest/docs/react/guides/window-focus-refetching)
- [React Router: Navigation](https://reactrouter.com/en/main/hooks/use-location)
