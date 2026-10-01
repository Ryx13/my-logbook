import { useMemo, useState } from 'react';
import { formats } from '../data/mock';
import { TODAY, weekMinutes, formatDuration, finisherSeries, projectById } from '../data/derive';
import type { SavedStat, TaskStatus } from '../data/types';
import { useApp } from '../state';
import { evaluateStat } from '../lib/stats';
import { buildBundle, download, parseBundle, toMarkdown } from '../lib/io';
import { loadPrefs, requestPermission, savePrefs } from '../lib/reminders';
import { Bars, LineChart } from '../components/Charts';
import { MonthlyGrid } from '../components/Tracker';
import { SignOutButton } from '../components/AuthGate';
import { Icon } from '../components/Icon';

const uid = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* ---------------- Tasks ---------------- */

export function Tasks() {
  const { tasks, projects, upsertTask } = useApp();
  const cols: [TaskStatus, string][] = [
    ['todo', 'To do'],
    ['doing', 'In progress'],
    ['done', 'Done'],
  ];
  const next: Record<TaskStatus, TaskStatus> = { todo: 'doing', doing: 'done', done: 'todo' };

  const addTask = () => {
    const title = window.prompt('New task')?.trim();
    if (!title) return;
    upsertTask({ id: uid(), projectId: projects[0]?.id ?? '', title, status: 'todo' });
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tasks</h1>
          <p className="sub">Things still to do, across every project. Tap a task to move it along.</p>
        </div>
        <button className="btn primary" onClick={addTask}>
          <Icon name="plus" size={16} /> New task
        </button>
      </div>
      <div className="task-cols">
        {cols.map(([status, label]) => {
          const list = tasks.filter((t) => t.status === status);
          return (
            <section key={status} className="task-col">
              <h2>
                {label} <span>{list.length}</span>
              </h2>
              {list.map((t) => {
                const p = projectById(t.projectId);
                const overdue = t.due && new Date(t.due) < TODAY && status !== 'done';
                return (
                  <button
                    key={t.id}
                    className={`task pc-${p?.color}${status === 'done' ? ' done' : ''}`}
                    style={{ textAlign: 'left', cursor: 'pointer', width: '100%', border: '1px solid var(--line)' }}
                    onClick={() => upsertTask({ ...t, status: next[t.status] })}
                    title="Tap to change status"
                  >
                    <div className="t">{t.title}</div>
                    <div className="m">
                      {p && <span>{p.name}</span>}
                      {t.due && (
                        <span className={overdue ? 'overdue' : ''}>
                          {overdue ? 'Overdue, ' : 'Due '}
                          {new Date(t.due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {t.note && <span>{t.note}</span>}
                    </div>
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- Statistics ---------------- */

export function Stats() {
  const { entries, projects, savedStats, upsertStat, notify } = useApp();
  const [name, setName] = useState('');
  const [expr, setExpr] = useState("count(sec.lab-attempt where rooted == true)");
  const ctx = useMemo(() => ({ entries, projects, formats }), [entries, projects]);
  const finisher = useMemo(() => finisherSeries(entries), [entries]);
  const preview = useMemo(() => evaluateStat(expr, ctx), [expr, ctx]);

  const save = () => {
    if (!name.trim()) {
      notify('Give the statistic a name');
      return;
    }
    upsertStat({ id: uid(), name: name.trim(), expr, result: '', detail: '' });
    setName('');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Statistics</h1>
          <p className="sub">Everything here is calculated from your entries. Nothing is typed in.</p>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <h2>Consistency this month</h2>
          <span className="hint">From your tracker ticks</span>
        </div>
        <MonthlyGrid month={TODAY} />
      </section>

      <div className="grid-2">
        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Finisher output</h2>
              <span className="hint">Total reps per finisher</span>
            </div>
            {finisher.length >= 2 ? (
              <LineChart data={finisher} color="var(--p4)" unit=" reps" />
            ) : (
              <p className="hint" style={{ padding: '12px 0' }}>
                Log a couple of finisher entries and the trend shows here.
              </p>
            )}
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>Your statistics</h2>
              <span className="hint">Live from your entries</span>
            </div>
            <div className="stat-list">
              {savedStats.length === 0 && <p className="hint">None yet. Create one on the right.</p>}
              {savedStats.map((s) => (
                <StatRow key={s.id} stat={s} ctx={ctx} />
              ))}
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Time this week</h2>
            </div>
            <Bars rows={weekMinutes(entries)} />
          </section>

          <section className="panel">
            <h2 style={{ marginBottom: 12 }}>New statistic</h2>
            <label className="label" htmlFor="stat-name">
              Name
            </label>
            <input
              id="stat-name"
              className="input"
              placeholder="e.g. Rooted boxes"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="label" htmlFor="expr" style={{ marginTop: 12 }}>
              Expression
            </label>
            <textarea
              id="expr"
              className="textarea expr-box"
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              spellCheck={false}
            />
            <div className="expr-out">
              <span className="hint">{preview.error ?? 'Preview over all entries'}</span>
              <b>{preview.display}</b>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn primary" onClick={save}>
                Save statistic
              </button>
            </div>
            <p className="hint" style={{ marginTop: 10 }}>
              Try: <code>avg(sec.durationMin)</code>, <code>pct(body.finisher where clean == true)</code>,{' '}
              <code>count(mind.observation)</code>.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}

function StatRow({ stat, ctx }: { stat: SavedStat; ctx: any }) {
  const res = useMemo(() => evaluateStat(stat.expr, ctx), [stat.expr, ctx]);
  return (
    <div className="stat-item">
      <strong>{stat.name}</strong>
      <span className="res">{res.display}</span>
      <code>{stat.expr}</code>
    </div>
  );
}

/* ---------------- Review ---------------- */

export function Review() {
  const { entries, saveReview } = useApp();
  const [kind, setKind] = useState<'week' | 'month'>('week');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const week = weekMinutes(entries);
  const total = week.reduce((s, w) => s + w.minutes, 0);
  const top = [...week].sort((a, b) => b.minutes - a.minutes)[0];

  const prompts =
    kind === 'week'
      ? ['What went well this week?', 'What got in the way?', 'One thing to change next week']
      : ['What moved forward this month?', 'What kept slipping?', 'Which protocol rule needs changing?'];

  const period = TODAY.toLocaleDateString('en-CA');

  return (
    <div className="review">
      <div className="page-head">
        <div>
          <h1>{kind === 'week' ? 'Sunday review' : 'Monthly review'}</h1>
          <p className="sub">
            {kind === 'week' ? 'Week ending ' : 'Month of '}
            {TODAY.toLocaleDateString('en-GB', kind === 'week' ? { day: 'numeric', month: 'long' } : { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="seg" role="group" aria-label="Review type">
          <button aria-pressed={kind === 'week'} onClick={() => setKind('week')}>
            Weekly
          </button>
          <button aria-pressed={kind === 'month'} onClick={() => setKind('month')}>
            Monthly
          </button>
        </div>
      </div>

      <div className="review-body">
        <div>
          <h2>Filled in from your entries</h2>
          <div className="review-facts">
            <div>
              <div className="n">{formatDuration(total) || '0m'}</div>
              <div className="w">Time logged</div>
            </div>
            <div>
              <div className="n">{entries.filter((e) => e.formatKey === 'lab-attempt' || e.formatId === 'lab-attempt').length}</div>
              <div className="w">Lab attempts</div>
            </div>
            <div>
              <div className="n">{entries.length}</div>
              <div className="w">Entries</div>
            </div>
            <div>
              <div className="n">{top?.project.name ?? '—'}</div>
              <div className="w">Most time</div>
            </div>
          </div>
        </div>
        <div>
          <h2 style={{ marginBottom: 16 }}>Reflection</h2>
          {prompts.map((p, i) => (
            <div key={p} className="prompt-block">
              <label className="label" htmlFor={`p${i}`}>
                {p}
              </label>
              <textarea
                id={`p${i}`}
                className="textarea"
                value={answers[p] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [p]: e.target.value }))}
              />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
            <button className="btn primary" onClick={() => saveReview(kind, period, answers)}>
              Save review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Settings ---------------- */

export function Settings() {
  const { entries, habits, ticks, daily, tasks, savedStats, projects, demo, email, loadBundle, notify } = useApp();
  const [theme, setTheme] = useState<string>(localStorage.getItem('logbook.theme') ?? 'system');
  const [prefs, setPrefs] = useState(loadPrefs());

  const applyTheme = (t: string) => {
    setTheme(t);
    try {
      localStorage.setItem('logbook.theme', t);
    } catch {
      /* ignore */
    }
    if (t === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  };

  const doExport = (fmt: 'json' | 'md') => {
    const bundle = buildBundle({ projects, entries, habits, ticks, daily, tasks, savedStats });
    if (fmt === 'json') download('logbook-export.json', JSON.stringify(bundle, null, 2), 'application/json');
    else download('logbook-export.md', toMarkdown(bundle), 'text/markdown');
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const b = parseBundle(String(reader.result));
        loadBundle({
          projects: b.projects,
          entries: b.entries,
          habits: b.habits,
          ticks: b.ticks,
          daily: b.daily,
          tasks: b.tasks,
          savedStats: b.savedStats,
        });
      } catch (e: any) {
        notify(e.message ?? 'Could not read that file');
      }
    };
    reader.readAsText(file);
  };

  const toggleReminders = async () => {
    if (!prefs.enabled) {
      const ok = await requestPermission();
      if (!ok) {
        notify('Allow notifications in your browser to enable reminders');
        return;
      }
    }
    const nextPrefs = { ...prefs, enabled: !prefs.enabled };
    setPrefs(nextPrefs);
    savePrefs(nextPrefs);
  };

  const setHour = (h: number) => {
    const nextPrefs = { ...prefs, hour: h };
    setPrefs(nextPrefs);
    savePrefs(nextPrefs);
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel">
          <h2 style={{ marginBottom: 4 }}>Appearance</h2>
          <div className="setting">
            <div>
              <strong>Theme</strong>
            </div>
            <div className="seg" role="group" aria-label="Theme">
              {['system', 'light', 'dark'].map((t) => (
                <button key={t} aria-pressed={theme === t} onClick={() => applyTheme(t)}>
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <h2 style={{ marginBottom: 4 }}>Reminders</h2>
          <div className="setting">
            <div>
              <strong>Daily reminder</strong>
              <p className="d">A browser notification if boxes are still unticked. Works while the app is open.</p>
            </div>
            <button className="btn" onClick={toggleReminders}>
              {prefs.enabled ? 'On' : 'Off'}
            </button>
          </div>
          {prefs.enabled && (
            <div className="setting">
              <div>
                <strong>Remind me at</strong>
              </div>
              <select className="select" style={{ width: 120 }} value={prefs.hour} onChange={(e) => setHour(Number(e.target.value))}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        <section className="panel">
          <h2 style={{ marginBottom: 4 }}>Your data</h2>
          <div className="setting">
            <div>
              <strong>Export</strong>
              <p className="d">A JSON backup, or Markdown you can read anywhere.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => doExport('json')}>
                <Icon name="download" size={16} /> JSON
              </button>
              <button className="btn" onClick={() => doExport('md')}>
                <Icon name="download" size={16} /> Markdown
              </button>
            </div>
          </div>
          <div className="setting">
            <div>
              <strong>Import</strong>
              <p className="d">Load a JSON export into this view.</p>
            </div>
            <label className="btn" style={{ cursor: 'pointer' }}>
              <Icon name="upload" size={16} /> Choose file
              <input
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
              />
            </label>
          </div>
        </section>

        <section className="panel">
          <h2 style={{ marginBottom: 4 }}>Account</h2>
          <div className="setting">
            <div>
              <strong>{demo ? 'Demo mode' : (email ?? 'Signed in')}</strong>
              <p className="d">
                {demo
                  ? 'No account — data resets on reload. Add Supabase keys to save everything.'
                  : 'Your data is saved to your Supabase project.'}
              </p>
            </div>
            <SignOutButton />
          </div>
        </section>
      </div>
    </div>
  );
}