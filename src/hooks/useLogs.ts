import { useCallback, useEffect, useRef, useState } from 'react';
import { Log, LogCategory } from '../models';
import { LogService } from '../services/LogService';
import { useAuth } from '../auth/useAuth';
import { t } from '../i18n';

const PAGE_SIZE = 50;
type Page = {
  key: string;
  logs: Log[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
};

export function useLogs(category?: LogCategory) {
  const { user } = useAuth();
  const owner = user?.id;
  const key = JSON.stringify([owner, category]);
  const [page, setPage] = useState<Page>();
  const version = useRef(0);
  const loadingNext = useRef(false);
  const load = useCallback(async (before?: Log) => {
    if (owner === undefined || (before && loadingNext.current)) return;
    const token = ++version.current;
    loadingNext.current = !!before;
    setPage(prev => ({
      key, logs: prev?.key === key ? prev.logs : [], hasMore: false,
      loading: !before, loadingMore: !!before, error: null,
    }));
    try {
      const rows = await LogService.getPage(owner, PAGE_SIZE + 1, category, before);
      if (token !== version.current) return;
      setPage(prev => ({
        key, logs: [...(before && prev?.key === key ? prev.logs : []), ...rows.slice(0, PAGE_SIZE)],
        hasMore: rows.length > PAGE_SIZE, error: null, loading: false, loadingMore: false,
      }));
    } catch {
      if (token === version.current) setPage(prev => ({
        key, logs: prev?.key === key ? prev.logs : [], error: t('history.loadError'),
        hasMore: !!before, loading: false, loadingMore: false,
      }));
    } finally {
      if (token === version.current) loadingNext.current = false;
    }
  }, [owner, category, key]);
  const invalidate = useCallback(() => {
    version.current++;
    loadingNext.current = false;
  }, []);
  useEffect(() => {
    void load();
    return invalidate;
  }, [load, invalidate]);
  const visible = page?.key === key ? page : undefined;
  const refresh = useCallback(() => load(), [load]);
  const loadMore = () => {
    if (visible?.hasMore) return load(visible.logs[visible.logs.length - 1]);
  };
  return {
    logs: visible?.logs ?? [], loading: visible?.loading ?? owner !== undefined,
    loadingMore: visible?.loadingMore ?? false, hasMore: visible?.hasMore ?? false,
    error: visible?.error ?? null, refresh, loadMore,
  };
}
