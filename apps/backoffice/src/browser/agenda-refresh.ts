export const AGENDA_REFRESH_INTERVAL_MS = 60_000;

export type Refresh = () => Promise<boolean>;
export interface RefreshStatus {
  loading: boolean;
  updatedAt: number | null;
}
export interface AgendaRefreshActivity {
  lastAttemptAt: number;
  pending: boolean;
}

export function createAgendaRefreshController<Timer>({
  refresh,
  getStatus,
  isVisible,
  now,
  setTimer,
  clearTimer,
  intervalMs = AGENDA_REFRESH_INTERVAL_MS,
  activity = {
    lastAttemptAt: getStatus().updatedAt ?? now(),
    pending: false,
  },
}: {
  refresh: Refresh;
  getStatus: () => RefreshStatus;
  isVisible: () => boolean;
  now: () => number;
  setTimer: (callback: () => void, delay: number) => Timer;
  clearTimer: (timer: Timer) => void;
  intervalMs?: number;
  activity?: AgendaRefreshActivity;
}) {
  let timer: Timer | undefined;
  let stopped = false;

  const cancelTimer = () => {
    if (timer !== undefined) clearTimer(timer);
    timer = undefined;
  };
  const elapsed = () =>
    now() - Math.max(activity.lastAttemptAt, getStatus().updatedAt ?? 0);
  const schedule = () => {
    cancelTimer();
    if (stopped || !isVisible()) return;
    const delay =
      activity.pending || getStatus().loading
        ? intervalMs
        : Math.max(0, intervalMs - elapsed());
    timer = setTimer(check, delay);
  };
  const run = async () => {
    activity.pending = true;
    activity.lastAttemptAt = now();
    try {
      await refresh();
    } catch {
      // The contacts model exposes failures in its existing error state. A
      // failed attempt still waits a full interval before the next retry.
    } finally {
      activity.pending = false;
      schedule();
    }
  };
  const check = () => {
    cancelTimer();
    if (stopped || !isVisible()) return;
    if (activity.pending || getStatus().loading || elapsed() < intervalMs) {
      schedule();
      return;
    }
    void run();
  };

  check();
  return {
    check,
    stop() {
      stopped = true;
      cancelTimer();
    },
  };
}
