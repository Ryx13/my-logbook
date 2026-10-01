import { useMemo, useState } from 'react';
import { projects } from '../data/mock';
import { formatDuration } from '../data/derive';
import { useApp } from '../state';
import { DayGroups } from '../components/Entries';
import { Icon } from '../components/Icon';

export function Timeline() {
  const { entries } = useApp();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (active.length && !active.includes(e.projectId)) return false;
      if (!q) return true;
      return JSON.stringify(e.values).toLowerCase().includes(q);
    });
  }, [entries, query, active]);

  const toggle = (id: string) =>
    setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const total = filtered.reduce((s, e) => s + e.durationMin, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Timeline</h1>
          <p className="sub">
            {filtered.length} entries{total ? `, ${formatDuration(total)} logged` : ''}
          </p>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={18} />
          <input
            className="input"
            type="search"
            placeholder="Search every field, e.g. kerberoasting"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search entries"
          />
        </div>
        <div className="chip-row" role="group" aria-label="Filter by project">
          {projects.map((p) => (
            <button
              key={p.id}
              className={`chip pc-${p.color}`}
              aria-pressed={active.includes(p.id)}
              onClick={() => toggle(p.id)}
            >
              <span className="dot" /> {p.name}
            </button>
          ))}
        </div>
      </div>

      <DayGroups entries={filtered} />
    </>
  );
}
