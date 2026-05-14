import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { queryKeys } from '../lib/queryKeys';

/**
 * Custom hook to provide easy cache invalidation functions
 * This helps ensure data consistency across the application
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const invalidateEvents = async () => {
    if (!token) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.events.public() }),
    ]);
  };

  const invalidateWorkshops = async () => {
    if (!token) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.workshops.all(token) });
  };

  const invalidateElections = async () => {
    if (!token) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.elections.all(token) });
  };

  const invalidateMeetings = async () => {
    if (!token) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all(token) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings.live(token) }),
    ]);
  };

  const invalidateAll = async () => {
    if (!token) return;
    await Promise.all([
      invalidateEvents(),
      invalidateWorkshops(),
      invalidateElections(),
      invalidateMeetings(),
    ]);
  };

  return {
    invalidateEvents,
    invalidateWorkshops,
    invalidateElections,
    invalidateMeetings,
    invalidateAll,
  };
}