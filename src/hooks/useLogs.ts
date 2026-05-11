import { useState, useEffect, useCallback } from 'react';
import { Log } from '../models';
import { LogService } from '../services/LogService';
import { useAuth } from '../auth/useAuth';

const PAGE_SIZE = 50;

export function useLogs(entityType?: 'employee' | 'attendance') {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadLogs = useCallback(async (refresh = false) => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      if (refresh) {
        setLoading(true);
        setPage(0);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const offset = refresh ? 0 : page * PAGE_SIZE;
      const newLogs = await LogService.getLogs(user.id, PAGE_SIZE, offset);

      // Client-side filtering
      let filteredLogs = newLogs;
      if (entityType) {
        filteredLogs = newLogs.filter(l => l.entityType === entityType);
      }

      if (refresh) {
        setLogs(filteredLogs);
        setPage(1);
      } else {
        setLogs(prev => [...prev, ...filteredLogs]);
        setPage(prev => prev + 1);
      }

      setHasMore(newLogs.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, entityType, page]);

  useEffect(() => {
    loadLogs(true);
  }, [loadLogs]);

  const refresh = useCallback(() => {
    return loadLogs(true);
  }, [loadLogs]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      return loadLogs(false);
    }
  }, [loadingMore, hasMore, loadLogs]);

  return {
    logs,
    loading,
    loadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
  };
}
