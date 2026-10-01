import { useEffect } from 'react';
import type { Entry, FieldValue } from '../data/types';
import {
  entryTitle,
  formatById,
  formatDay,
  formatDuration,
  formatTime,
  groupByDay,
  projectById,
} from '../data/derive';
import { useApp } from '../state';
import { Icon } from './Icon';

/** One row in a timeline. */
export function EntryRow({
  entry,
  showProject = true,
  showDay = false,
}: {
  entry: Entry;
  showProject?: boolean;
  showDay?: boolean;
}) {
  const { select } = useApp();
  const project = projectById(entry.projectId);
  const format = formatById(entry.formatId);
  const snippet = (entry.values.notes ?? entry.values.body) as string | undefined;
  const tags = (entry.values.technique ?? entry.values.tags) as string[] | undefined;

  return (
    <button className={`entry pc-${project?.color}`} onClick={() => select(entry)}>
      <span className="entry-time">
        {showDay && (
          <>
            {shortDay(entry.at)}
            <br />
          </>
        )}
        {formatTime(entry.at)}
      </span>
      <span className="entry-bar" aria-hidden />
      <span>
        <span className="entry-title">{entryTitle(entry)}</span>
        <span className="entry-meta">
          {showProject && <span>{project?.name}</span>}
          <span>{format?.name}</span>
          {entry.values.difficulty && <span>{String(entry.values.difficulty)}</span>}
          {entry.values.rooted === true && <span>Rooted</span>}
          {tags?.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </span>
        {snippet && <span className="entry-snippet">{snippet}</span>}
      </span>
      <span className="entry-side">{formatDuration(entry.durationMin)}</span>
    </button>
  );
}

function shortDay(iso: string): string {
  const d = formatDay(iso);
  if (d === 'Today' || d === 'Yesterday') return d === 'Today' ? 'Today' : 'Yday';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
}

/** Entries grouped under day headings, with the day's total time. */
export function DayGroups({ entries, showProject = true }: { entries: Entry[]; showProject?: boolean }) {
  const groups = groupByDay(entries);
  if (!groups.length) {
    return (
      <div className="empty">
        <p>Nothing logged here yet.</p>
        <p>Use Log entry to add the first one.</p>
      </div>
    );
  }
  return (
    <div>
      {groups.map(([day, list]) => {
        const total = list.reduce((s, e) => s + e.durationMin, 0);
        return (
          <section key={day} className="day-group">
            <h2 className="day-title">
              {formatDay(list[0].at)}
              <span>
                {list.length} {list.length === 1 ? 'entry' : 'entries'}
                {total ? `, ${formatDuration(total)}` : ''}
              </span>
            </h2>
            {list.map((e) => (
              <EntryRow key={e.id} entry={e} showProject={showProject} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function show(v: FieldValue | undefined): React.ReactNode {
  if (v === undefined || v === null || v === '') return <span className="hint">Empty</span>;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) {
    return (
      <span className="chip-row">
        {v.map((t) =>
          typeof t === 'string' ? (
            <span key={t} className="tag">
              {t}
            </span>
          ) : null,
        )}
      </span>
    );
  }
  if (typeof v === 'string' && v.startsWith('http')) {
    return (
      <a href={v} target="_blank" rel="noreferrer">
        {v.replace(/^https?:\/\//, '')}
      </a>
    );
  }
  return String(v);
}

/** Side drawer with every field of one entry, plus its format version. */
export function EntryDrawer() {
  const { selected, select, notify } = useApp();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && select(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [select]);

  if (!selected) return null;
  const project = projectById(selected.projectId);
  const format = formatById(selected.formatId);
  const outdated = format && selected.formatVersion < format.version;

  // Fields that existed in the version this entry was written under.
  const fields = format?.fields.filter((f) => {
    if (!outdated) return true;
    return f.id in selected.values || f.type === 'computed';
  });

  return (
    <>
      <div className="scrim" onClick={() => select(null)} />
      <aside className={`drawer pc-${project?.color}`} role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-head">
          <div>
            <div className="entry-meta" style={{ marginTop: 0, marginBottom: 6 }}>
              <span className="dot" style={{ alignSelf: 'center' }} />
              <span>{project?.name}</span>
              <span>{format?.name}</span>
            </div>
            <h2 id="drawer-title" style={{ fontSize: '1.35rem' }}>
              {entryTitle(selected)}
            </h2>
            <p className="hint" style={{ marginTop: 6 }}>
              {formatDay(selected.at)} at {formatTime(selected.at)}
              {selected.durationMin ? `, ${formatDuration(selected.durationMin)}` : ''}
            </p>
          </div>
          <button className="btn ghost small" onClick={() => select(null)} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="drawer-body stack">
          {outdated && (
            <p className="notice">
              Written under {format?.name} v{selected.formatVersion}. Fields added later are hidden here, not blank.
            </p>
          )}
          <dl className="field-list">
            {fields?.map((f) => (
              <div key={f.id} style={{ display: 'contents' }}>
                <dt>{f.name}</dt>
                <dd>
                  {f.type === 'computed' && f.expr
                    ? computeSimple(f.expr, selected.values) ?? <span className="hint">Empty</span>
                    : show(selected.values[f.id])}
                </dd>
              </div>
            ))}
          </dl>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => notify('Editing arrives with the database')}>
              <Icon name="edit" size={16} /> Correct entry
            </button>
            <button className="btn ghost" onClick={() => notify('History arrives with the database')}>
              <Icon name="history" size={16} /> {selected.revisions ? `${selected.revisions} earlier versions` : 'History'}
            </button>
          </div>
          <p className="hint">Corrections keep the original. You can always see what this entry said before.</p>
        </div>
      </aside>
    </>
  );
}

function computeSimple(expr: string, values: Record<string, FieldValue>): string | null {
  const m = expr.match(/^(\w+)\s*\*\s*(\w+)$/);
  if (!m) return null;
  const a = values[m[1]];
  const b = values[m[2]];
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  return String(a * b);
}
