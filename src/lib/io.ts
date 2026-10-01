import type { Entry, Project, SavedStat, Task } from '../data/types';
import type { DailyMeta, Habit, Ticks } from '../data/tracker';
import { formats } from '../data/mock';
import { entryTitle, formatDuration, projectById } from '../data/derive';

export interface ExportBundle {
  version: 1;
  exportedAt: string;
  projects: Project[];
  formats: typeof formats;
  entries: Entry[];
  habits: Habit[];
  ticks: Ticks;
  daily: DailyMeta;
  tasks: Task[];
  savedStats: SavedStat[];
}

export function buildBundle(data: Omit<ExportBundle, 'version' | 'exportedAt' | 'formats'>): ExportBundle {
  return { version: 1, exportedAt: new Date().toISOString(), formats, ...data };
}

/** A human-readable Markdown version you can open without the app. */
export function toMarkdown(b: ExportBundle): string {
  const lines: string[] = [`# Logbook export`, ``, `Exported ${new Date(b.exportedAt).toLocaleString('en-GB')}`, ``];
  lines.push(`## Entries (${b.entries.length})`, ``);
  [...b.entries]
    .sort((a, e) => +new Date(e.at) - +new Date(a.at))
    .forEach((e) => {
      const p = projectById(e.projectId)?.name ?? e.projectId;
      const when = new Date(e.at).toLocaleString('en-GB');
      const dur = e.durationMin ? ` · ${formatDuration(e.durationMin)}` : '';
      lines.push(`- **${entryTitle(e)}** — ${p}${dur} · ${when}`);
      Object.entries(e.values).forEach(([k, v]) => {
        if (v !== '' && v != null) lines.push(`  - ${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
      });
    });
  lines.push(``, `## Tasks (${b.tasks.length})`, ``);
  b.tasks.forEach((t) => lines.push(`- [${t.status === 'done' ? 'x' : ' '}] ${t.title}${t.due ? ` (due ${t.due})` : ''}`));
  lines.push(``, `## Habits (${b.habits.length})`, ``);
  b.habits.forEach((h) => lines.push(`- ${h.label}${h.detail ? ` — ${h.detail}` : ''}`));
  return lines.join('\n');
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseBundle(text: string): ExportBundle {
  const b = JSON.parse(text);
  if (b.version !== 1 || !Array.isArray(b.entries)) throw new Error('Not a logbook export');
  return b;
}
