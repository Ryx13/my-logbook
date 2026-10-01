/**
 * Core data model.
 *
 * The wireframe runs on hardcoded data, but these types are the real model:
 *  - A Project owns one or more Formats (the shape of an entry).
 *  - A Format is versioned. Every Entry is pinned to the format version it
 *    was written under, so changing a format never breaks old entries.
 *  - Entries are the record. Statistics are always derived from entries,
 *    never typed in by hand.
 */

export type FieldType =
  | 'text'
  | 'longtext'
  | 'number'
  | 'duration'
  | 'select'
  | 'tags'
  | 'checkbox'
  | 'rating'
  | 'link'
  | 'checklist'
  | 'entryref'
  | 'computed';

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  required?: boolean;
  options?: string[]; // select
  unit?: string; // number
  max?: number; // rating
  /** How the capture form fills this field before you type. */
  prefill?: 'last' | 'none' | { value: FieldValue };
  /** Expression for computed fields, e.g. "total_reps / rounds". */
  expr?: string;
}

export type FieldValue = string | number | boolean | string[] | ChecklistItem[] | null;

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface FormatVersion {
  version: number;
  date: string; // ISO date
  note: string; // what changed
}

export interface Format {
  id: string;
  /** Stable slug (e.g. "lab-attempt"), kept across DB ids so auto-ticks map. */
  key?: string;
  projectId: string;
  name: string;
  version: number;
  /** Field whose value is shown as the entry's headline. */
  titleField: string;
  fields: Field[];
  history: FormatVersion[];
  /** Whether this format tracks time. Almost all do. */
  timed: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  /** Index into the categorical palette (fixed order, see styles.css). */
  color: 1 | 2 | 3 | 4;
  archived: boolean;
  createdAt: string;
}

export interface Entry {
  id: string;
  projectId: string;
  formatId: string;
  /** The format's stable key at log time, used to auto-tick the right habit. */
  formatKey?: string;
  formatVersion: number;
  /** When the work ended (capture time). */
  at: string;
  durationMin: number;
  values: Record<string, FieldValue>;
  /** Set when the entry has been corrected; the old version is kept. */
  revisions?: number;
}

export type TaskStatus = 'todo' | 'doing' | 'done';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  due?: string; // ISO date
  status: TaskStatus;
  note?: string;
}

export interface SavedStat {
  id: string;
  name: string;
  expr: string;
  result: string;
  detail: string;
}
