import { type KeyboardEvent } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import { monthDays, shiftDay, shiftMonth } from './agenda-model';
import { Button } from './ui/button';

const monthFormat = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
export const calendarDate = (day: string) => new Date(`${day}T12:00:00Z`);
export const dayFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const weekdays = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];

export function AgendaCalendar({
  selectedDay,
  today,
  counts,
  onSelect,
  month,
  onMonthChange,
}: {
  selectedDay: string;
  today: string;
  counts: Map<string, number>;
  onSelect: (day: string) => void;
  month: string;
  onMonthChange: (month: string) => void;
}) {
  const days = monthDays(month);
  const focusedDay = days.some(({ day }) => day === selectedDay)
    ? selectedDay
    : month;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, day: string) => {
    const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[
      event.key
    ];
    if (offset === undefined) return;
    event.preventDefault();
    const nextDay = shiftDay(day, offset);
    onSelect(nextDay);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(`[data-calendar-day="${nextDay}"]`)
        ?.focus();
    });
  };

  return (
    <section
      className="rounded-2xl border border-zinc-950/10 bg-white p-4 sm:p-5"
      aria-label="Calendrier des rendez-vous"
      id="agenda-calendar"
    >
      <div className="mb-5 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-950">
          Votre calendrier
        </h2>
        <button
          type="button"
          onClick={() => onSelect(today)}
          className="rounded px-1 py-2 text-xs font-semibold text-green-800 hover:text-green-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
        >
          Aujourd’hui
        </button>
      </div>
      <div className="mb-3 flex items-center justify-between">
        <Button
          plain
          aria-label="Mois précédent"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
        >
          <ChevronLeftIcon />
        </Button>
        <span
          id="calendar-month"
          className="text-sm font-semibold capitalize"
          aria-live="polite"
        >
          {monthFormat.format(calendarDate(month))}
        </span>
        <Button
          plain
          aria-label="Mois suivant"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
        >
          <ChevronRightIcon />
        </Button>
      </div>
      <table
        className="w-full table-fixed text-center text-sm"
        aria-labelledby="calendar-month"
      >
        <thead>
          <tr>
            {weekdays.map((day) => (
              <th
                key={day}
                scope="col"
                className="pb-3 text-xs font-normal text-zinc-500"
              >
                <abbr title={day} className="no-underline">
                  {day.slice(0, 1)}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: days.length / 7 }, (_, week) => (
            <tr key={days[week * 7]!.day}>
              {days.slice(week * 7, week * 7 + 7).map(({ day, inMonth }) => {
                const count = counts.get(day) ?? 0;
                const selected = day === selectedDay;
                return (
                  <td key={day} className="py-0.5">
                    <button
                      type="button"
                      data-calendar-day={day}
                      tabIndex={day === focusedDay ? 0 : -1}
                      aria-label={`${dayFormat.format(calendarDate(day))}, ${count} rendez-vous`}
                      aria-pressed={selected}
                      aria-current={day === today ? 'date' : undefined}
                      onClick={() => onSelect(day)}
                      onKeyDown={(event) => onKeyDown(event, day)}
                      className={`relative mx-auto flex h-10 w-full max-w-10 items-center justify-center rounded-full pb-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 ${selected ? 'bg-green-800 font-semibold text-white' : day === today ? 'bg-green-100 font-semibold text-green-900 hover:bg-green-200' : inMonth ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-400 hover:bg-zinc-100'}`}
                    >
                      {Number(day.slice(-2))}
                      {count > 0 && (
                        <span
                          aria-hidden="true"
                          className={`absolute bottom-1.5 size-1 rounded-full ${selected ? 'bg-white' : 'bg-green-600'}`}
                        />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <Button
        outline
        href="#day-agenda-title"
        className="mt-4 w-full xl:hidden"
      >
        Voir la journée sélectionnée
      </Button>
    </section>
  );
}
