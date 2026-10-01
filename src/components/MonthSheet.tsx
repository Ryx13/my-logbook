import { Fragment } from 'react';
import { dayKey, startOfDay, TODAY } from '../data/derive';
import {
  dayScore,
  daysInMonth,
  groupLabels,
  habits,
  isScheduled,
  mondayOf,
  scored,
  tickKey,
  type HabitGroup,
} from '../data/tracker';
import { useApp } from '../state';
import { TickBox } from './Tracker';

/**
 * Spreadsheet-style month view: every habit against every day of the month,
 * with a dashboard on top and a per-habit analysis underneath.
 * Everything except the ticks, mood and sleep is calculated.
 */

const LETTERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const groups: HabitGroup[] = ['sec', 'body', 'mind', 'life'];
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export function MonthSheet({ month }: { month: Date }) {
  const { ticks, daily, setDaily } = useApp();
  const today = startOfDay(TODAY);
  const days = daysInMonth(month);
  const future = (d: Date) => d > today;

  // Per-day scores and month totals.
  const perDay = days.map((d) => dayScore(d, ticks));
  const goal = perDay.reduce((s, x) => s + x.due, 0);
  const completed = perDay.reduce((s, x) => s + x.done, 0);
  const left = goal - completed;

  // Split the month into Monday-start weeks.
  const weeks: { label: string; days: Date[] }[] = [];
  days.forEach((d) => {
    const last = weeks[weeks.length - 1];
    if (last && +mondayOf(last.days[0]) === +mondayOf(d)) last.days.push(d);
    else weeks.push({ label: `Week ${weeks.length + 1}`, days: [d] });
  });
  const weekPct = weeks.map((w) => {
    const s = w.days.map((d) => dayScore(d, ticks));
    return pct(
      s.reduce((a, x) => a + x.done, 0),
      s.reduce((a, x) => a + x.due, 0),
    );
  });

  // Per-habit analysis.
  const analysis = habits.filter(scored).map((h) => {
    const due = days.filter((d) => isScheduled(h, d));
    const actual = due.filter((d) => ticks[tickKey(d, h.id)]).length;
    return { habit: h, goal: due.length, actual, left: due.length - actual, pct: pct(actual, due.length) };
  });
  const top = [...analysis].sort((a, b) => b.pct - a.pct || b.actual - a.actual).slice(0, 10);

  const pastDays = days.filter((d) => !future(d));
  const moods = pastDays.map((d) => daily[dayKey(d)]?.mood).filter((v): v is number => !!v);
  const sleeps = pastDays.map((d) => daily[dayKey(d)]?.sleep).filter((v): v is number => !!v);
  const avg = (l: number[]) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0);

  const donePct = pct(completed, goal);
  const C = 2 * Math.PI * 42;

  return (
    <div className="ms">
      {/* ---------- Dashboard ---------- */}
      <div className="ms-top">
        <div className="ms-kpis">
          <div>
            <span>Goal</span>
            <b>{goal}</b>
          </div>
          <div>
            <span>Completed</span>
            <b>{completed}</b>
          </div>
          <div>
            <span>Left</span>
            <b>{left}</b>
          </div>
        </div>

        <div className="ms-donut">
          <svg viewBox="0 0 100 100" role="img" aria-label={`${donePct}% of the month's boxes ticked`}>
            <circle cx="50" cy="50" r="42" className="ring-bg" />
            <circle
              cx="50"
              cy="50"
              r="42"
              className="ring-fg"
              strokeDasharray={`${(donePct / 100) * C} ${C}`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="ms-donut-label">
            <b>{donePct}%</b>
            <span>done</span>
          </div>
        </div>

        <div className="ms-chart">
          <h3>Daily progress</h3>
          <svg viewBox={`0 0 ${days.length * 10} 64`} preserveAspectRatio="none" className="ms-bars" aria-hidden>
            {perDay.map((s, i) => {
              const h = future(days[i]) ? 0 : (s.done / s.due) * 60;
              return (
                <g key={i}>
                  <rect x={i * 10 + 1.5} y={4} width={7} height={60} className="bar-bg" />
                  <rect x={i * 10 + 1.5} y={64 - h} width={7} height={h} className="bar-fg">
                    <title>
                      {days[i].getDate()}: {s.done} of {s.due}
                    </title>
                  </rect>
                </g>
              );
            })}
          </svg>
          <div className="ms-axis">
            <span>1</span>
            <span>{Math.ceil(days.length / 2)}</span>
            <span>{days.length}</span>
          </div>
        </div>

        <div className="ms-chart">
          <h3>Weekly progress</h3>
          <div className="ms-weeks">
            {weeks.map((w, i) => (
              <div key={w.label} className="ms-week">
                <span className="ms-week-v">{weekPct[i]}%</span>
                <span className="ms-week-bar">
                  <span style={{ height: `${weekPct[i]}%` }} />
                </span>
                <span className="ms-week-l">W{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- The grid ---------- */}
      <section className="panel ms-grid-panel">
        <div className="ms-grid-wrap">
          <table className="ms-grid">
            <thead>
              <tr>
                <th rowSpan={2} className="ms-habit ms-corner" scope="col">
                  My habits
                </th>
                {weeks.map((w) => (
                  <th key={w.label} colSpan={w.days.length} className="ms-week-head" scope="colgroup">
                    {w.days.length > 2 ? w.label : `W${weeks.indexOf(w) + 1}`}
                  </th>
                ))}
                <th rowSpan={2} className="ms-pct" scope="col">
                  %
                </th>
              </tr>
              <tr>
                {days.map((d) => (
                  <th
                    key={d.getDate()}
                    scope="col"
                    className={`ms-day${+d === +today ? ' is-today' : ''}${
                      weeks.some((w) => w.days[0] === d) ? ' wk-start' : ''
                    }`}
                  >
                    <span>{LETTERS[(d.getDay() + 6) % 7]}</span>
                    {d.getDate()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const color = groupLabels[g].color;
                return (
                  <Fragment key={g}>
                    <tr className="ms-group">
                      <th scope="colgroup" className={`ms-habit pc-${color}`}>
                        <span className="dot" /> {groupLabels[g].name}
                      </th>
                      <td colSpan={days.length + 1} />
                    </tr>
                    {habits
                      .filter((h) => h.group === g)
                      .map((h, idx, arr) => {
                        const a = analysis.find((x) => x.habit.id === h.id);
                        const newSection = h.section && h.section !== arr[idx - 1]?.section;
                        return (
                          <Fragment key={h.id}>
                            {newSection && (
                              <tr className="ms-section">
                                <th scope="colgroup" className="ms-habit">
                                  {h.section}
                                </th>
                                <td colSpan={days.length + 1} />
                              </tr>
                            )}
                            <tr>
                              <th scope="row" className="ms-habit" title={h.detail ?? h.label}>
                                <span className="ms-name">{h.label}</span>
                                {h.detail && <span className="ms-detail">{h.detail}</span>}
                              </th>
                              {days.map((d) => (
                                <td
                                  key={d.getDate()}
                                  className={`${+d === +today ? 'is-today' : ''}${
                                    weeks.some((w) => w.days[0] === d) ? ' wk-start' : ''
                                  }`}
                                >
                                  <TickBox habit={h} date={d} />
                                </td>
                              ))}
                              <td className="ms-pct">{a ? `${a.pct}%` : '—'}</td>
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
                <th scope="row" className="ms-habit">
                  Day score
                </th>
                {days.map((d, i) => (
                  <td key={d.getDate()} className={`ms-score${+d === +today ? ' is-today' : ''}`}>
                    {future(d) ? '' : pct(perDay[i].done, perDay[i].due)}
                  </td>
                ))}
                <td className="ms-pct">{donePct}%</td>
              </tr>
              <tr>
                <th scope="row" className="ms-habit">
                  Mood <span className="hint">(1–5, tap)</span>
                </th>
                {days.map((d) => {
                  const v = daily[dayKey(d)]?.mood;
                  return (
                    <td key={d.getDate()} className={+d === +today ? 'is-today' : ''}>
                      <button
                        className="ms-cell-btn"
                        disabled={future(d)}
                        aria-label={`Mood on the ${d.getDate()}: ${v ?? 'not set'}`}
                        onClick={() => setDaily(d, { mood: v === 5 ? undefined : (v ?? 0) + 1 })}
                      >
                        {v ?? ''}
                      </button>
                    </td>
                  );
                })}
                <td className="ms-pct">{moods.length ? avg(moods).toFixed(1) : '—'}</td>
              </tr>
              <tr>
                <th scope="row" className="ms-habit">
                  Hours of sleep
                </th>
                {days.map((d) => {
                  const v = daily[dayKey(d)]?.sleep;
                  return (
                    <td key={d.getDate()} className={+d === +today ? 'is-today' : ''}>
                      <input
                        className="ms-cell-input"
                        inputMode="decimal"
                        disabled={future(d)}
                        aria-label={`Hours of sleep on the ${d.getDate()}`}
                        value={v ?? ''}
                        onChange={(e) => {
                          const n = parseFloat(e.target.value.replace(',', '.'));
                          setDaily(d, { sleep: Number.isFinite(n) ? n : undefined });
                        }}
                      />
                    </td>
                  );
                })}
                <td className="ms-pct">{sleeps.length ? `${avg(sleeps).toFixed(1)}h` : '—'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ---------- Analysis ---------- */}
      <div className="ms-bottom">
        <section className="panel">
          <div className="panel-head">
            <h2>Analysis</h2>
            <span className="hint">Goal = days the habit is scheduled this month</span>
          </div>
          <div className="ms-grid-wrap">
            <table className="ms-analysis">
              <thead>
                <tr>
                  <th scope="col">Habit</th>
                  <th scope="col">Goal</th>
                  <th scope="col">Actual</th>
                  <th scope="col">Left</th>
                  <th scope="col" className="ms-prog-col">
                    Progress
                  </th>
                  <th scope="col">%</th>
                </tr>
              </thead>
              <tbody>
                {analysis.map((a) => (
                  <tr key={a.habit.id}>
                    <th scope="row">{a.habit.label}</th>
                    <td>{a.goal}</td>
                    <td>{a.actual}</td>
                    <td>{a.left}</td>
                    <td className="ms-prog-col">
                      <span className="ms-prog">
                        <span style={{ width: `${a.pct}%` }} />
                      </span>
                    </td>
                    <td>
                      <b>{a.pct}%</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="stack">
          <section className="panel">
            <h2 style={{ marginBottom: 12 }}>Top 10 habits</h2>
            <ol className="ms-top10">
              {top.map((a) => (
                <li key={a.habit.id}>
                  <span>{a.habit.label}</span>
                  <b>{a.pct}%</b>
                </li>
              ))}
            </ol>
          </section>
          <section className="panel">
            <h2 style={{ marginBottom: 12 }}>This month</h2>
            <div className="ms-kpis ms-kpis-row">
              <div>
                <span>Avg mood</span>
                <b>{moods.length ? avg(moods).toFixed(1) : '—'}</b>
              </div>
              <div>
                <span>Avg sleep</span>
                <b>{sleeps.length ? `${avg(sleeps).toFixed(1)}h` : '—'}</b>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
