import { useEffect, useState } from 'react';
import type {
  CalendarAgendaView,
  CalendarAppointment,
} from '../calendar-types';
import { monthDays, shiftDay, shiftMonth } from './agenda-model';
import type { ContactsModel } from './contacts-model';

export function useCalendarAgenda(
  model: ContactsModel,
  today: string,
  month: string,
  enabled: boolean
) {
  const [data, setData] = useState<{
    appointments: CalendarAppointment[];
    state: CalendarAgendaView['state'];
    loading: boolean;
  }>({ appointments: [], state: 'unavailable', loading: true });
  const currentMonth = shiftMonth(today, 0);
  useEffect(() => {
    if (!enabled || !model.ready) return;
    const controller = new AbortController();
    setData((previous) => ({ ...previous, loading: true }));
    const windows = [...new Set([currentMonth, month])].map((first) => {
      const days = monthDays(first);
      // Padding includes the complete Paris day regardless of the UTC offset.
      return {
        from: shiftDay(days[0]!.day, -1),
        to: shiftDay(days.at(-1)!.day, 2),
      };
    });
    let pending = false;
    let lastAttemptAt = 0;
    async function load() {
      if (
        pending ||
        controller.signal.aborted ||
        document.visibilityState !== 'visible'
      )
        return;
      pending = true;
      lastAttemptAt = Date.now();
      setData((previous) => ({ ...previous, loading: true }));
      try {
        const results = await Promise.allSettled([
          ...windows.map(({ from, to }) =>
            model.calendarAppointments(from, to, controller.signal)
          ),
        ]);
        if (controller.signal.aborted) return;
        const views: CalendarAgendaView[] = [];
        let failed = false;
        const appointments = new Map<string, CalendarAppointment>();
        for (const result of results) {
          if (result.status === 'rejected') {
            failed = true;
            continue;
          }
          if ('appointments' in result.value) {
            views.push(result.value);
            for (const event of result.value.appointments)
              appointments.set(event.id, event);
          }
        }
        setData((previous) => ({
          appointments: failed
            ? [
                ...new Map(
                  [...previous.appointments, ...appointments.values()].map(
                    (event) => [event.id, event]
                  )
                ).values(),
              ]
            : [...appointments.values()],
          state:
            failed || views.some((view) => view.state === 'unavailable')
              ? 'unavailable'
              : views.some((view) => view.state === 'not_connected')
                ? 'not_connected'
                : 'ready',
          loading: false,
        }));
      } catch {
        if (!controller.signal.aborted)
          setData((previous) => ({
            ...previous,
            state: 'unavailable',
            loading: false,
          }));
      } finally {
        pending = false;
      }
    }
    const refreshStale = () => {
      if (Date.now() - lastAttemptAt >= 60000) void load();
    };
    void load();
    const timer = window.setInterval(refreshStale, 60000);
    document.addEventListener('visibilitychange', refreshStale);
    window.addEventListener('focus', refreshStale);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshStale);
      window.removeEventListener('focus', refreshStale);
    };
  }, [model.calendarAppointments, model.ready, currentMonth, month, enabled]);
  return data;
}
