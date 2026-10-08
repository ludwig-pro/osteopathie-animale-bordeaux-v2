import { useEffect, useRef } from 'react';
import {
  createAgendaRefreshController,
  type AgendaRefreshActivity,
  type Refresh,
  type RefreshStatus,
} from './agenda-refresh';

// useContacts owns the stable callback. Keeping its activity here also prevents
// duplicate requests when Home unmounts and mounts again during a refresh.
const activities = new WeakMap<Refresh, AgendaRefreshActivity>();

export function useAgendaRefresh({
  refresh,
  loading,
  updatedAt,
  enabled = true,
}: {
  refresh: Refresh;
  loading: boolean;
  updatedAt: Date | null;
  enabled?: boolean;
}) {
  const status = useRef<RefreshStatus>({
    loading,
    updatedAt: updatedAt?.getTime() ?? null,
  });
  const controller = useRef<{ check: () => void; stop: () => void } | null>(
    null
  );
  useEffect(() => {
    status.current = { loading, updatedAt: updatedAt?.getTime() ?? null };
    controller.current?.check();
  }, [loading, updatedAt]);

  useEffect(() => {
    if (!enabled) return;
    const activity = activities.get(refresh) ?? {
      lastAttemptAt: status.current.updatedAt ?? Date.now(),
      pending: false,
    };
    activities.set(refresh, activity);
    const current = createAgendaRefreshController({
      refresh,
      getStatus: () => status.current,
      isVisible: () => document.visibilityState === 'visible',
      now: Date.now,
      setTimer: (callback, delay) => window.setTimeout(callback, delay),
      clearTimer: (timer) => window.clearTimeout(timer),
      activity,
    });
    controller.current = current;
    document.addEventListener('visibilitychange', current.check);
    window.addEventListener('focus', current.check);
    return () => {
      current.stop();
      controller.current = null;
      document.removeEventListener('visibilitychange', current.check);
      window.removeEventListener('focus', current.check);
    };
  }, [refresh, enabled]);
}
