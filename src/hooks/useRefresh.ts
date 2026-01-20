import { useState, useCallback } from 'react';

/**
 * Custom hook for handling pull-to-refresh pattern
 * Eliminates boilerplate refresh logic from screens
 *
 * @param refreshFn - Async function to call when refreshing
 * @returns { refreshing, onRefresh } - State and handler for RefreshControl
 *
 * @example
 * const { refreshing, onRefresh } = useRefresh(async () => {
 *   await loadEmployees();
 * });
 *
 * <FlatList
 *   refreshControl={
 *     <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
 *   }
 * />
 */
export function useRefresh(refreshFn: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshFn();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshFn]);

  return { refreshing, onRefresh };
}
