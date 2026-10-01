import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { milestones } from '../data/mock';
import {
  entriesFor,
  formatsFor,
  formatDuration,
  projectById,
  finisherSeries,
} from '../data/derive';
import { useApp } from '../state';
import { DayGroups } from '../components/Entries';
import { LineChart } from '../components/Charts';
import { Icon } from '../components/Icon';

export function Projects() {
  const { entries, projects, notify } = useApp();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Projects</h1>
          <p className="sub">Each project has its own entry formats, tasks and statistics.</p>
        </div>
      </div>
      <div className="project-list">
        {projects.map((p) => {
          const list = entriesFor(p.id, entries);
          const mins = list.reduce((s, e) => s + e.durationMin, 0);
          const last = list.sort((a, b) => +new Date(b.at) - +new Date(a.at))[0];
          return (
            <Link key={p.id} to={`/projects/${p.id}`} className={`project-card pc-${p.color}`}>
              <h2>{p.name}</h2>
              <p className="desc">{p.description}</p>
              <div className="facts">
                <span>
                  <b>{list.length}</b> entries
                </span>
                {mins > 0 && (
                  <span>
                    <b>{formatDuration(mins)}</b> logged
                  </span>
                )}
                <span>{formatsFor(p.id).length} formats</span>
              </div>
              {last && (
                <p className="hint">
                  Last entry {new Date(last.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </Link>
          );
        })}
        <button className="new-card" onClick={() => notify('Project creation arrives with the database')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="plus" /> New project
          </span>
        </button>
      </div>
    </>
  );
}

type Tab = 'entries' | 'formats' | 'tasks' | 'stats';

export function ProjectDetail() {
  const { id = '' } = useParams();
  const { entries, tasks, openCapture, notify } = useApp();
  const [tab, setTab] = useState<Tab>('entries');
  const project = projectById(id);
  if (!project) return <p className="empty">That project doesn't exist.</p>;

  const list = entriesFor(project.id, entries);
  const fmts = formatsFor(project.id);
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const mins = list.reduce((s, e) => s + e.durationMin, 0);

  return (
    <div className={`pc-${project.color}`}>
      <div className="project-hero">
        <div>
          <h1>
            <span className="dot" />
            {project.name}
          </h1>
          <p className="sub" style={{ color: 'var(--muted)', marginTop: 6 }}>
            {project.description} {list.length} entries{mins ? `, ${formatDuration(mins)} logged` : ''}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => notify('Export arrives with the database')}>
            <Icon name="download" size={16} /> Export
          </button>
          <button className="log-btn" onClick={() => openCapture(project.id)}>
            <Icon name="plus" size={18} /> Log to {project.name}
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {(
          [
            ['entries', 'Entries'],
            ['formats', 'Formats'],
            ['tasks', project.name === 'OSCP' ? 'Milestones' : 'Tasks'],
            ['stats', 'Statistics'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'entries' && <DayGroups entries={list} showProject={false} />}

      {tab === 'formats' && (
        <section className="panel">
          <div className="panel-head">
            <h2>Entry formats</h2>
            <button className="btn small" onClick={() => notify('Format creation arrives with the database')}>
              <Icon name="plus" size={16} /> New format
            </button>
          </div>
          {fmts.map((f) => (
            <div key={f.id} className="format-row">
              <div>
                <strong>{f.name}</strong>
                <p className="hint">
                  Version {f.version}, {f.fields.length} fields. {f.fields.map((x) => x.name).join(', ')}.
                </p>
              </div>
              <Link to={`/formats/${f.id}`} className="btn small">
                Edit
              </Link>
            </div>
          ))}
        </section>
      )}

      {tab === 'tasks' && project.name === 'OSCP' && <Milestones />}
      {tab === 'tasks' && project.name !== 'OSCP' && (
        <section className="panel">
          <div className="panel-head">
            <h2>Tasks</h2>
            <Link to="/tasks">Open board</Link>
          </div>
          {projectTasks.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projectTasks.map((t) => (
                <div key={t.id} className={`task${t.status === 'done' ? ' done' : ''}`}>
                  <div className="t">{t.title}</div>
                  <div className="m">
                    <span>{t.status === 'todo' ? 'To do' : t.status === 'doing' ? 'In progress' : 'Done'}</span>
                    {t.due && <span>Due {t.due}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="hint">No tasks for this project.</p>
          )}
        </section>
      )}

      {tab === 'stats' && <ProjectStats name={project.name} />}
    </div>
  );
}

function Milestones() {
  const done = milestones.filter((m) => m.done).length;
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Milestones</h2>
        <span className="hint">
          {done} of {milestones.length} reached
        </span>
      </div>
      <div className="progress" aria-hidden>
        <div style={{ width: `${(done / milestones.length) * 100}%` }} />
      </div>
      <p className="hint" style={{ marginBottom: 12 }}>
        No dates. A milestone is only marked reached when it's actually true.
      </p>
      <ul className="milestones">
        {milestones.map((m) => (
          <li key={m.label} className={m.done ? 'done' : ''}>
            <span className="box">{m.done && <Icon name="check" size={12} />}</span>
            <span>{m.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProjectStats({ name }: { name: string }) {
  const { entries } = useApp();
  if (name === 'Body') {
    const finisher = finisherSeries(entries);
    return (
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
      </div>
    );
  }
  if (name === 'SEC') {
    return (
      <section className="panel">
        <div className="panel-head">
          <h2>Lab attempts by difficulty</h2>
          <span className="hint">From your lab-attempt entries</span>
        </div>
        <LabDifficulty entries={entries} />
      </section>
    );
  }
  return (
    <div className="empty">
      <p>No statistics defined for this project yet.</p>
      <p>
        <Link to="/stats">Create one on the Statistics page.</Link>
      </p>
    </div>
  );
}

function LabDifficulty({ entries }: { entries: import('../data/types').Entry[] }) {
  const labs = entries.filter((e) => (e.formatKey ?? e.formatId) === 'lab-attempt');
  const order = ['Easy', 'Medium', 'Hard', 'Insane'];
  const rows = order
    .map((d) => {
      const group = labs.filter((e) => e.values.difficulty === d);
      if (!group.length) return null;
      const rooted = group.filter((e) => e.values.rooted === true).length;
      const avg = Math.round(group.reduce((s, e) => s + e.durationMin, 0) / group.length);
      return { d, attempts: group.length, rooted, avg: formatDuration(avg) || '—' };
    })
    .filter(Boolean) as { d: string; attempts: number; rooted: number; avg: string }[];

  if (!rows.length) return <p className="hint">Log a lab attempt and this fills in.</p>;

  return (
    <table className="field-list" style={{ display: 'table', width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr className="hint" style={{ textAlign: 'left' }}>
          <th style={{ fontWeight: 600, paddingBottom: 8 }}>Difficulty</th>
          <th style={{ fontWeight: 600, paddingBottom: 8 }}>Attempts</th>
          <th style={{ fontWeight: 600, paddingBottom: 8 }}>Rooted</th>
          <th style={{ fontWeight: 600, paddingBottom: 8 }}>Avg time</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.d} style={{ borderTop: '1px solid var(--line)' }}>
            <td style={{ padding: '10px 0' }}>{r.d}</td>
            <td style={{ fontVariantNumeric: 'tabular-nums' }}>{r.attempts}</td>
            <td style={{ fontVariantNumeric: 'tabular-nums' }}>{r.rooted}</td>
            <td style={{ fontVariantNumeric: 'tabular-nums' }}>{r.avg}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}