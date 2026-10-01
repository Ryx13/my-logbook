import { Fragment } from 'react';
import { startOfDay, TODAY } from '../data/derive';
import {
  addDays,
  coreHeld,
  corePlanned,
  coreLabels,
  dayScore,
  groupLabels,
  habits,
  isScheduled,
  monthWeeks,
  scored,
  tickKey,
  type CoreHabit,
  type Habit,
  type HabitGroup,
} from '../data/tracker';
import { useApp } from '../state';
import { Icon } from './Icon';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const groups: HabitGroup[] = ['sec', 'body', 'mind', 'life'];
const today = startOfDay(TODAY);
const isFuture = (d: Date) => d > today;
const sameDay = (a: Date, b: Date) => +startOfDay(a) === +startOfDay(b);

/** One tick box. Handles "not scheduled" and "in the future" states. */
export function TickBox({ habit, date, label }: { habit: Habit; date: Date; label?: string }) {
  const { ticks, toggleTick } = useApp();
  if (!isScheduled(habit, date)) {
    return (
      <span className="tick off" aria-label={`${habit.label}: not scheduled`}>
        –
      </span>
    );
  }
  const state = ticks[tickKey(date, habit.id)];
  const future = isFuture(date);
  const when = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  return (
    <button
      role="checkbox"
      aria-checked={!!state}
      aria-label={label ?? `${habit.label}, ${when}`}
      title={state === 'entry' ? 'Ticked by a logged entry' : undefined}
      className={`tick${state === 'entry' ? ' auto' : ''}`}
      disabled={future}
      onClick={() => toggleTick(date, habit.id)}
    >
      {state && <Icon name="check" size={16} />}
    </button>
  );
}

/** The weekly habit grid (Operating Protocol p.12), Mon–Sun. */
export function WeeklyGrid({ monday }: { monday: Date }) {
  const { ticks } = useApp();
  const days = DAYS.map((_, i) => addDays(monday, i));

  const dayTotal = (d: Date) => {
    const due = habits.filter((h) => isScheduled(h, d) && scored(h));
    return `${due.filter((h) => ticks[tickKey(d, h.id)]).length}/${due.length}`;
  };

  return (
    <div className="week-grid-wrap">
      <table className="week-grid">
        <thead>
          <tr>
            <th scope="col" className="wg-habit">
              Habit
            </th>
            {days.map((d, i) => (
              <th key={i} scope="col" className={sameDay(d, today) ? 'is-today' : ''}>
                <span className="wg-day">{DAYS[i]}</span>
                <span className="wg-date">{d.getDate()}</span>
              </th>
            ))}
            <th scope="col" className="wg-sum">
              Done
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const color = groupLabels[g].color;
            return (
              <Fragment key={g}>
                <tr className="wg-group">
                  <th colSpan={9} scope="colgroup" className={`pc-${color}`}>
                    <span className="dot" /> {groupLabels[g].name}
                  </th>
                </tr>
                {habits
                  .filter((h) => h.group === g)
                  .map((h, idx, arr) => {
                    const due = days.filter((d) => isScheduled(h, d));
                    const done = due.filter((d) => ticks[tickKey(d, h.id)]).length;
                    const newSection = h.section && h.section !== arr[idx - 1]?.section;
                    return (
                      <Fragment key={h.id}>
                        {newSection && (
                          <tr className="wg-section">
                            <th colSpan={9} scope="colgroup">
                              {h.section}
                            </th>
                          </tr>
                        )}
                        <tr>
                          <th scope="row" className="wg-habit">
                            <span className="wg-name">{h.label}</span>
                            {h.detail && <span className="wg-detail">{h.detail}</span>}
                          </th>
                          {days.map((d, i) => (
                            <td key={i} className={sameDay(d, today) ? 'is-today' : ''}>
                              <TickBox habit={h} date={d} />
                            </td>
                          ))}
                          <td className="wg-sum">
                            {done}/{due.length}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="wg-habit">
              Day total
            </th>
            {days.map((d, i) => (
              <td key={i} className={sameDay(d, today) ? 'is-today' : ''}>
                {isFuture(d) ? '' : dayTotal(d)}
              </td>
            ))}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * The monthly consistency grid (p.13): the three non-negotiables, five weeks.
 * Filled in from the weekly ticks, so there is nothing extra to tick here.
 */
export function MonthlyGrid({ month, only }: { month: Date; only?: CoreHabit[] }) {
  const { ticks } = useApp();
  const weeks = monthWeeks(month);
  const inMonth = (d: Date) => d.getMonth() === month.getMonth();
  const cores = only ?? (['mobility', 'training', 'sec'] as CoreHabit[]);

  return (
    <div className="month-grids">
      {cores.map((core) => {
        const counted = weeks.flat().filter((d) => inMonth(d) && !isFuture(d) && corePlanned(core, d));
        const held = counted.filter((d) => coreHeld(core, d, ticks)).length;
        return (
          <section key={core} className="mg">
            <div className="mg-head">
              <div>
                <h3>{coreLabels[core].name}</h3>
                <p className="hint">{coreLabels[core].rule}</p>
              </div>
              <span className="mg-count">
                <b>{held}</b> of {counted.length} planned days
              </span>
            </div>
            <table className="mg-table">
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Week</span>
                  </th>
                  {DAYS.map((d) => (
                    <th key={d} scope="col">
                      {d[0]}
                      <span className="sr-only">{d.slice(1)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, w) => (
                  <tr key={w}>
                    <th scope="row">W{w + 1}</th>
                    {week.map((d, i) => {
                      const on = coreHeld(core, d, ticks);
                      const cls = !inMonth(d)
                        ? 'out'
                        : on
                          ? 'on'
                          : !corePlanned(core, d)
                            ? 'rest'
                            : isFuture(d)
                              ? 'future'
                              : 'miss';
                      return (
                        <td key={i}>
                          <span
                            className={`mg-cell ${cls}${sameDay(d, today) ? ' is-today' : ''}`}
                            title={`${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: ${
                              cls === 'on' ? 'held' : cls === 'miss' ? 'missed' : cls === 'rest' ? 'not planned' : ''
                            }`}
                          >
                            {inMonth(d) ? d.getDate() : ''}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}

/** Today's scheduled boxes as a checklist, for the Today screen. */
export function TodayBoxes() {
  const { ticks } = useApp();
  const due = habits.filter((h) => isScheduled(h, today));
  // "If applicable" habits are shown but don't count towards the day's score.
  const { done, due: counted } = dayScore(today, ticks);

  return (
    <div>
      <div className="progress" aria-hidden style={{ marginTop: 0 }}>
        <div style={{ width: `${(done / counted) * 100}%`, background: 'var(--ink)' }} />
      </div>
      <p className="hint" style={{ marginBottom: 10 }}>
        {done} of {counted} ticked today
      </p>
      {groups.map((g) => {
        const list = due.filter((h) => h.group === g);
        if (!list.length) return null;
        const color = groupLabels[g].color;
        return (
          <div key={g} className="tb-group">
            <div className={`tb-group-name pc-${color}`}>
              <span className="dot" /> {groupLabels[g].name}
            </div>
            {list.map((h) => (
              <label key={h.id} className="tb-row">
                <TickBox habit={h} date={today} label={h.label} />
                <span className="tb-text">
                  <span className="tb-name">{h.label}</span>
                  {h.detail && <span className="tb-detail">{h.detail}</span>}
                </span>
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}
