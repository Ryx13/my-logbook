import { useState } from 'react';
import { TODAY } from '../data/derive';
import { addDays, mondayOf } from '../data/tracker';
import { MonthlyGrid, WeeklyGrid } from '../components/Tracker';
import { MonthSheet } from '../components/MonthSheet';
import { Icon } from '../components/Icon';

type View = 'week' | 'month' | 'core';

export function Tracker() {
  const [view, setView] = useState<View>('week');
  const [monday, setMonday] = useState(() => mondayOf(TODAY));
  const [month, setMonth] = useState(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const thisMonday = mondayOf(TODAY);
  const onThisWeek = +monday === +thisMonday;
  const onThisMonth = month.getMonth() === TODAY.getMonth() && month.getFullYear() === TODAY.getFullYear();

  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-GB', o);
  const sunday = addDays(monday, 6);
  const title =
    view === 'week'
      ? `${fmt(monday, { day: 'numeric', month: 'short' })} – ${fmt(sunday, { day: 'numeric', month: 'short' })}`
      : fmt(month, { month: 'long', year: 'numeric' });

  const step = (n: number) => {
    if (view === 'week') setMonday((m) => addDays(m, n * 7));
    else setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tracker</h1>
          <p className="sub">
            {view === 'week'
              ? 'Tick each habit as you do it. A dash means it isn’t scheduled that day.'
              : view === 'month'
                ? 'The whole month at once. Tick boxes here or in the week view; they’re the same ticks.'
                : 'Mobility, a training session and a SEC block. Filled in from your ticks; faded days are rest days.'}
          </p>
        </div>
        <div className="seg" role="group" aria-label="Tracker view">
          <button aria-pressed={view === 'week'} onClick={() => setView('week')}>
            Week
          </button>
          <button aria-pressed={view === 'month'} onClick={() => setView('month')}>
            Month
          </button>
          <button aria-pressed={view === 'core'} onClick={() => setView('core')}>
            Non-negotiables
          </button>
        </div>
      </div>

      <div className="period-nav">
        <button className="btn small" onClick={() => step(-1)} aria-label={`Previous ${view === "week" ? "week" : "month"}`}>
          <Icon name="left" size={16} />
        </button>
        <h2>{title}</h2>
        <button
          className="btn small"
          onClick={() => step(1)}
          aria-label={`Next ${view === "week" ? "week" : "month"}`}
          disabled={view === 'week' ? onThisWeek : onThisMonth}
        >
          <Icon name="right" size={16} />
        </button>
        {!(view === 'week' ? onThisWeek : onThisMonth) && (
          <button
            className="btn ghost small"
            onClick={() =>
              view === 'week' ? setMonday(thisMonday) : setMonth(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))
            }
          >
            {view === 'week' ? 'This week' : 'This month'}
          </button>
        )}
      </div>

      {view === 'week' ? (
        <>
          <section className="panel" style={{ padding: 0 }}>
            <WeeklyGrid monday={monday} />
          </section>
          <div className="tick-legend">
            <span>
              <span className="tick" aria-hidden>
                <Icon name="check" size={14} />
              </span>{' '}
              Ticked by hand
            </span>
            <span>
              <span className="tick auto" aria-hidden>
                <Icon name="check" size={14} />
              </span>{' '}
              Ticked by a logged entry
            </span>
            <span>
              <span className="tick off" aria-hidden>
                –
              </span>{' '}
              Not scheduled
            </span>
          </div>
        </>
      ) : view === 'month' ? (
        <MonthSheet month={month} />
      ) : (
        <MonthlyGrid month={month} />
      )}
    </>
  );
}
