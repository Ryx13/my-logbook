import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dayKey, entryTitle, formatDuration, formatTime, projectById, startOfDay, TODAY } from '../data/derive';
import { addDays, dayScore, mondayOf, weekday, weeklyPlan } from '../data/tracker';
import { useApp } from '../state';
import { Icon } from '../components/Icon';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function Calendar() {
  const { entries, ticks, tasks, select, openCapture } = useApp();
  const today = startOfDay(TODAY);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [picked, setPicked] = useState<Date>(today);

  // Six rows always, so the grid doesn't jump in height between months.
  const start = mondayOf(month);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));

  const byDay = new Map<string, typeof entries>();
  entries.forEach((e) => {
    const k = dayKey(new Date(e.at));
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  });
  byDay.forEach((l) => l.sort((a, b) => +new Date(a.at) - +new Date(b.at)));
  const tasksOn = (d: Date) => tasks.filter((t) => t.due === dayKey(d));

  const step = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const isThisMonth = month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear();

  const pickedEntries = byDay.get(dayKey(picked)) ?? [];
  const pickedTasks = tasksOn(picked);
  const pickedScore = dayScore(picked, ticks);
  const pickedFuture = picked > today;
  const plan = weeklyPlan[weekday(picked)];
  const pickedTotal = pickedEntries.reduce((s, e) => s + e.durationMin, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Calendar</h1>
          <p className="sub">What you logged, what’s due, and how many boxes you ticked each day.</p>
        </div>
      </div>

      <div className="period-nav">
        <button className="btn small" onClick={() => step(-1)} aria-label="Previous month">
          <Icon name="left" size={16} />
        </button>
        <h2>{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2>
        <button className="btn small" onClick={() => step(1)} aria-label="Next month">
          <Icon name="right" size={16} />
        </button>
        {!isThisMonth && (
          <button
            className="btn ghost small"
            onClick={() => {
              setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
              setPicked(today);
            }}
          >
            Today
          </button>
        )}
      </div>

      <div className="cal-layout">
        <div className="cal" role="grid" aria-label="Month">
          <div className="cal-row cal-head" role="row">
            {DAYS.map((d) => (
              <span key={d} role="columnheader">
                {d}
              </span>
            ))}
          </div>
          {Array.from({ length: 6 }, (_, w) => (
            <div key={w} className="cal-row" role="row">
              {cells.slice(w * 7, w * 7 + 7).map((d) => {
                const k = dayKey(d);
                const list = byDay.get(k) ?? [];
                const due = tasksOn(d);
                const score = dayScore(d, ticks);
                const out = d.getMonth() !== month.getMonth();
                const future = d > today;
                const cls = [
                  'cal-day',
                  out && 'out',
                  +d === +today && 'is-today',
                  +d === +picked && 'picked',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <button
                    key={k}
                    role="gridcell"
                    className={cls}
                    aria-selected={+d === +picked}
                    aria-label={`${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}: ${
                      list.length
                    } entries${due.length ? `, ${due.length} due` : ''}`}
                    onClick={() => setPicked(d)}
                  >
                    <span className="cal-num">{d.getDate()}</span>
                    <span className="cal-items">
                      {list.slice(0, 3).map((e) => (
                        <span key={e.id} className={`cal-item pc-${projectById(e.projectId)?.color}`}>
                          {entryTitle(e)}
                        </span>
                      ))}
                      {list.length > 3 && <span className="cal-more">+{list.length - 3} more</span>}
                      {due.map((t) => (
                        <span key={t.id} className={`cal-item due pc-${projectById(t.projectId)?.color}`}>
                          Due: {t.title}
                        </span>
                      ))}
                    </span>
                    {/* Phone: dots instead of labels */}
                    <span className="cal-dots" aria-hidden>
                      {list.slice(0, 4).map((e) => (
                        <span key={e.id} className={`dot pc-${projectById(e.projectId)?.color}`} />
                      ))}
                      {due.length > 0 && <span className="dot due" />}
                    </span>
                    {!future && !out && (
                      <span
                        className="cal-score"
                        title={`${score.done} of ${score.due} boxes ticked`}
                        style={{ ['--fill' as string]: `${(score.done / score.due) * 100}%` }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          <p className="hint cal-key">
            The line at the bottom of each day fills as you tick that day’s boxes.
          </p>
        </div>

        <aside className="panel cal-side" aria-live="polite">
          <div className="panel-head" style={{ marginBottom: 6 }}>
            <h2>{picked.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          </div>
          <p className="hint" style={{ marginBottom: 16 }}>
            {pickedFuture
              ? 'Coming up'
              : `${pickedScore.done} of ${pickedScore.due} boxes ticked${
                  pickedTotal ? `, ${formatDuration(pickedTotal)} logged` : ''
                }`}
            {!pickedFuture && (
              <>
                {' · '}
                <Link to="/tracker">Open tracker</Link>
              </>
            )}
          </p>

          <h3 className="side-h">Planned</h3>
          <ul className="plan-list">
            {plan.map((p) => (
              <li key={p.what} className={`pc-${projectById(p.projectId)?.color}`}>
                <span className="plan-time">{p.time}</span>
                <span className="dot" />
                <span>{p.what}</span>
              </li>
            ))}
          </ul>

          <h3 className="side-h">Logged</h3>
          {pickedEntries.length ? (
            <ul className="plan-list">
              {pickedEntries.map((e) => (
                <li key={e.id} className={`pc-${projectById(e.projectId)?.color}`}>
                  <span className="plan-time">{formatTime(e.at)}</span>
                  <span className="dot" />
                  <button className="link-btn" onClick={() => select(e)}>
                    {entryTitle(e)}
                    {e.durationMin ? <span className="hint"> · {formatDuration(e.durationMin)}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint" style={{ marginBottom: 16 }}>
              {pickedFuture ? 'Nothing yet.' : 'Nothing logged.'}
            </p>
          )}

          {pickedTasks.length > 0 && (
            <>
              <h3 className="side-h">Due</h3>
              <ul className="plan-list">
                {pickedTasks.map((t) => (
                  <li key={t.id} className={`pc-${projectById(t.projectId)?.color}`}>
                    <span className="plan-time">{t.status === 'done' ? 'Done' : 'Open'}</span>
                    <span className="dot" />
                    <span>{t.title}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {+picked === +today && (
            <button className="log-btn block" style={{ marginTop: 8 }} onClick={() => openCapture()}>
              <Icon name="plus" size={18} /> Log entry
            </button>
          )}
        </aside>
      </div>
    </>
  );
}
