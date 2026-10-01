import { Link } from 'react-router-dom';
import { formats as allFormats } from '../data/mock';
import { dayKey, formatDuration, TODAY, weekMinutes } from '../data/derive';
import { addDays, dayScore, mondayOf, overallStreak } from '../data/tracker';
import { useEffect } from 'react';
import { maybeNotify } from '../lib/reminders';
import { useApp } from '../state';
import { Bars } from '../components/Charts';
import { TodayBoxes } from '../components/Tracker';
import { EntryRow } from '../components/Entries';
import { Icon } from '../components/Icon';

export function Today() {
  const { entries, ticks, tasks, projects, openCapture } = useApp();
  const recent = [...entries].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 5);
  const week = weekMinutes(entries);
  const weekTotal = week.reduce((s, w) => s + w.minutes, 0);
  const todayCount = entries.filter((e) => dayKey(new Date(e.at)) === dayKey(TODAY)).length;
  const monday = mondayOf(TODAY);
  const weekBoxes = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
    .filter((d) => d <= TODAY)
    .map((d) => dayScore(d, ticks))
    .reduce((a, b) => ({ done: a.done + b.done, due: a.due + b.due }), { done: 0, due: 0 });
  const streak = overallStreak(ticks, TODAY);
  const todayScore = dayScore(TODAY, ticks);
  useEffect(() => {
    maybeNotify(todayScore.due - todayScore.done);
  }, [todayScore.due, todayScore.done]);
  const open = tasks.filter((t) => t.status !== 'done');
  const due = open.filter((t) => t.due).sort((a, b) => a.due!.localeCompare(b.due!));
  const isSunday = TODAY.getDay() === 0;

  const greeting = TODAY.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const quickLog = [
    { key: 'lab', label: 'Lab attempt', projectName: 'SEC', fmt: 'lab-attempt' },
    { key: 'fin', label: 'Finisher', projectName: 'Body', fmt: 'finisher' },
    { key: 'ses', label: 'Session', projectName: 'Body', fmt: 'session' },
    { key: 'obs', label: 'Observation', projectName: 'Mind', fmt: 'observation' },
  ].map((q) => {
    const project = projects.find((p) => p.name.toLowerCase() === q.projectName.toLowerCase());
    const formatId = project ? allFormats.find((f) => f.projectId === project.id && (f.key ?? f.id) === q.fmt)?.id : undefined;
    return { ...q, project, formatId };
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{greeting}</h1>
          <p className="sub">
            {todayCount ? `${todayCount} logged today.` : 'Nothing logged today yet.'}
          </p>
        </div>
        <button className="log-btn" onClick={() => openCapture()}>
          <Icon name="plus" size={18} /> Log entry
        </button>
      </div>

      {isSunday && (
        <Link
          to="/review"
          className="panel"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            marginBottom: 20,
            textDecoration: 'none',
            background: 'var(--action-soft)',
            borderColor: 'transparent',
          }}
        >
          <span>
            <strong>Sunday review is ready.</strong>
            <span className="hint" style={{ display: 'block', color: 'var(--ink-2)' }}>
              This week's numbers are filled in. You only write the reflection.
            </span>
          </span>
          <span className="btn primary small">Start review</span>
        </Link>
      )}

      <div className="today-strip">
        <div>
          <div className="num">{formatDuration(weekTotal) || '0m'}</div>
          <div className="what">Logged this week</div>
        </div>
        <div>
          <div className="num">{entries.length}</div>
          <div className="what">Entries in total</div>
        </div>
        <div>
          <div className="num">
            {weekBoxes.done}/{weekBoxes.due}
          </div>
          <div className="what">Boxes ticked this week</div>
        </div>
        <div>
          <div className="num">{open.length}</div>
          <div className="what">Open tasks</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Today’s boxes</h2>
              <Link to="/tracker">Full tracker</Link>
            </div>
            <TodayBoxes />
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Recent entries</h2>
              <Link to="/timeline">Open timeline</Link>
            </div>
            <div style={{ margin: '0 -8px' }}>
              {recent.map((e) => (
                <EntryRow key={e.id} entry={e} showDay />
              ))}
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Quick log</h2>
            </div>
            <div className="chip-row">
              {quickLog.map(({ key, label, project, formatId }) => (
                <button
                  key={key}
                  className={`chip pc-${project?.color}`}
                  disabled={!project || !formatId}
                  onClick={() => project && formatId && openCapture(project.id, formatId)}
                >
                  <span className="dot" /> {label}
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Streak</h2>
              <span className="hint">Days in a row with a box ticked</span>
            </div>
            <div className="streaks">
              <div className="streak">
                <div className="n">{streak.current}</div>
                <div className="l">Current streak</div>
                <div className="best">Best: {streak.best} days</div>
              </div>
              <div className="streak">
                <div className="n">{weekBoxes.done}/{weekBoxes.due}</div>
                <div className="l">Boxes this week</div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Time this week</h2>
            </div>
            <Bars rows={week} />
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Coming up</h2>
              <Link to="/tasks">All tasks</Link>
            </div>
            {due.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {due.map((t) => {
                  const p = projects.find((x) => x.id === t.projectId);
                  return (
                    <div key={t.id} className={`task pc-${p?.color}`}>
                      <div className="t">{t.title}</div>
                      <div className="m">
                        <span>{p?.name}</span>
                        <span>
                          Due{' '}
                          {new Date(t.due!).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="hint">Nothing with a due date.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
