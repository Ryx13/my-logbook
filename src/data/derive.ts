import type { Entry, Format, Project } from './types';
import { formats, projects } from './mock';

/**
 * "Now" for the app. Read once when the app loads, so a page open across
 * midnight picks up the new day on its next reload. Everything date-related
 * (Today, the tracker grids, the calendar, streaks) keys off this.
 */
export const TODAY = new Date();

export const projectById = (id: string): Project | undefined => projects.find((p) => p.id === id);
export const formatById = (id: string): Format | undefined => formats.find((f) => f.id === id);
export const formatsFor = (projectId: string): Format[] => formats.filter((f) => f.projectId === projectId);
export const entriesFor = (projectId: string, list: Entry[]): Entry[] =>
  list.filter((e) => e.projectId === projectId);

export function dayKey(d: Date): string {
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

export function formatDuration(min: number): string {
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatDay(iso: string): string {
  const d = new Date(iso);
  const diff = Math.round((+startOfDay(TODAY) - +startOfDay(d)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Headline text for an entry, taken from its format's title field. */
export function entryTitle(entry: Entry): string {
  const fmt = formatById(entry.formatId);
  const v = fmt ? entry.values[fmt.titleField] : undefined;
  if (v === undefined || v === null || v === '') return fmt?.name ?? 'Entry';
  if (fmt && fmt.fields.find((f) => f.id === fmt.titleField)?.unit) {
    return `${v} ${fmt.fields.find((f) => f.id === fmt.titleField)!.unit}`;
  }
  return String(v);
}

/** Group entries by calendar day, newest first. */
export function groupByDay(list: Entry[]): [string, Entry[]][] {
  const map = new Map<string, Entry[]>();
  [...list]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .forEach((e) => {
      const k = dayKey(new Date(e.at));
      map.set(k, [...(map.get(k) ?? []), e]);
    });
  return [...map.entries()];
}

/** Last N days, oldest first, as Date objects. */
export function lastDays(n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = startOfDay(TODAY);
    d.setDate(d.getDate() - (n - 1 - i));
    return d;
  });
}

/**
 * Habit grid: for each project, which of the last N days have at least one entry.
 * In the real app this is computed from the entry log, never ticked by hand.
 * The wireframe fills older days with a deterministic pattern so the grid
 * isn't mostly empty.
 */
export function habitGrid(
  days: number,
  list: Entry[],
): { project: Project; cells: boolean[]; streak: number }[] {
  const range = lastDays(days);
  return projects.map((project, pi) => {
    const logged = new Set(entriesFor(project.id, list).map((e) => dayKey(new Date(e.at))));
    const cells = range.map((d, i) => {
      if (logged.has(dayKey(d))) return true;
      if (i >= days - 9) return false; // recent days: real sample data only
      return (i * 7 + pi * 3) % 5 < 3; // filler for older days
    });
    let streak = 0;
    for (let i = cells.length - 1; i >= 0; i--) {
      if (cells[i]) streak++;
      else if (i === cells.length - 1) continue; // today not logged yet is fine
      else break;
    }
    return { project, cells, streak };
  });
}

/** Minutes logged per project over the last 7 days. */
export function weekMinutes(list: Entry[]): { project: Project; minutes: number }[] {
  const since = startOfDay(TODAY);
  since.setDate(since.getDate() - 6);
  return projects.map((project) => ({
    project,
    minutes: entriesFor(project.id, list)
      .filter((e) => new Date(e.at) >= since)
      .reduce((s, e) => s + e.durationMin, 0),
  }));
}

/**
 * Finisher output over time, computed from your entries. Each finisher entry
 * becomes a point: total reps (rounds × reps) when both are present, else reps,
 * else the logged minutes. Returns the most recent `limit` points, oldest first.
 */
export function finisherSeries(list: Entry[], limit = 12): { label: string; value: number }[] {
  return list
    .filter((e) => (e.formatKey ?? e.formatId) === 'finisher')
    .sort((a, b) => +new Date(a.at) - +new Date(b.at))
    .map((e) => {
      const rounds = Number(e.values.rounds);
      const reps = Number(e.values.reps);
      const total =
        Number.isFinite(rounds) && Number.isFinite(reps) && rounds && reps
          ? rounds * reps
          : Number.isFinite(reps) && reps
            ? reps
            : e.durationMin;
      return {
        label: new Date(e.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        value: total,
      };
    })
    .slice(-limit);
}