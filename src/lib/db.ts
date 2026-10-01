import { supabase } from './supabase';
import type { Entry, Format, Project, SavedStat, Task } from '../data/types';
import type { DailyMeta, Habit, Ticks } from '../data/tracker';
import { defaultHabits } from '../data/tracker';
import { defaultFormats, defaultProjects } from '../data/mock';

/**
 * The persistence layer. Every function talks to Supabase as the signed-in
 * user; row-level security makes sure that only ever touches their own rows.
 * Mappers translate between the database's snake_case rows and the app's types.
 */

export interface Snapshot {
  projects: Project[];
  formats: Format[];
  entries: Entry[];
  habits: Habit[];
  ticks: Ticks;
  daily: DailyMeta;
  tasks: Task[];
  savedStats: SavedStat[];
}

let uid = '';
export function setUid(id: string) {
  uid = id;
}
const db = () => {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
};

/* ---------- mappers ---------- */
const toProject = (r: any): Project => ({
  id: r.id,
  name: r.name,
  description: r.description ?? '',
  color: r.color,
  archived: r.archived,
  createdAt: r.created_at,
});
const toFormat = (r: any): Format => ({
  id: r.id,
  key: r.key ?? r.id,
  projectId: r.project_id,
  name: r.name,
  version: r.version,
  titleField: r.title_field,
  timed: r.timed,
  fields: r.fields ?? [],
  history: r.history ?? [],
});
const toHabit = (r: any): Habit => ({
  id: r.id,
  group: r.grp,
  section: r.section ?? undefined,
  label: r.label,
  detail: r.detail ?? undefined,
  days: r.days ?? [],
  counts: r.counts ?? undefined,
  autoFrom: r.auto_from ?? undefined,
  noScore: r.no_score ?? undefined,
});
const toTask = (r: any): Task => ({
  id: r.id,
  projectId: r.project_id,
  title: r.title,
  due: r.due ?? undefined,
  status: r.status,
  note: r.note ?? undefined,
});

/* ---------- load ---------- */
export async function loadAll(): Promise<Snapshot> {
  const s = db();
  const [proj, fmt, ent, hab, tck, day, tsk, stat] = await Promise.all([
    s.from('projects').select('*').order('sort'),
    s.from('formats').select('*').order('sort'),
    s.from('entries').select('*').order('at', { ascending: false }),
    s.from('habits').select('*').eq('archived', false).order('sort'),
    s.from('ticks').select('*'),
    s.from('daily').select('*'),
    s.from('tasks').select('*').order('sort'),
    s.from('saved_stats').select('*').order('sort'),
  ]);
  const err = [proj, fmt, ent, hab, tck, day, tsk, stat].find((r) => r.error)?.error;
  if (err) throw err;

  const formats = (fmt.data ?? []).map(toFormat);
  const keyById = new Map(formats.map((f) => [f.id, f.key!]));
  const entries: Entry[] = (ent.data ?? []).map((r: any) => ({
    id: r.id,
    projectId: r.project_id,
    formatId: r.format_id,
    formatKey: keyById.get(r.format_id),
    formatVersion: r.format_version,
    at: r.at,
    durationMin: r.duration_min,
    values: r.values ?? {},
    revisions: r.revisions ?? 0,
  }));
  const ticks: Ticks = {};
  (tck.data ?? []).forEach((r: any) => {
    ticks[`${r.day}|${r.habit_id}`] = r.source;
  });
  const daily: DailyMeta = {};
  (day.data ?? []).forEach((r: any) => {
    daily[r.day] = { mood: r.mood ?? undefined, sleep: r.sleep ?? undefined };
  });

  return {
    projects: (proj.data ?? []).map(toProject),
    formats,
    entries,
    habits: (hab.data ?? []).map(toHabit),
    ticks,
    daily,
    tasks: (tsk.data ?? []).map(toTask),
    savedStats: (stat.data ?? []).map((r: any) => ({ id: r.id, name: r.name, expr: r.expr, result: '', detail: '' })),
  };
}

/* ---------- first-run seeding ---------- */
export async function seedDefaults(): Promise<void> {
  const s = db();
  // Idempotency guard: never seed if this user already has projects or habits.
  const [{ count: pCount }, { count: hCount }] = await Promise.all([
    s.from('projects').select('id', { count: 'exact', head: true }),
    s.from('habits').select('id', { count: 'exact', head: true }),
  ]);
  if ((pCount ?? 0) > 0 || (hCount ?? 0) > 0) return;
  // Projects, keeping a slug → new id map so formats can point at them.
  const projectRows = defaultProjects.map((p, i) => ({
    user_id: uid,
    name: p.name,
    description: p.description,
    color: p.color,
    archived: p.archived,
    sort: i,
  }));
  const { data: proj, error: pe } = await s.from('projects').insert(projectRows).select();
  if (pe) throw pe;
  const idByName = new Map((proj ?? []).map((r: any) => [r.name, r.id]));
  const idBySlug = new Map(defaultProjects.map((p) => [p.id, idByName.get(p.name)]));

  const formatRows = defaultFormats.map((f, i) => ({
    user_id: uid,
    project_id: idBySlug.get(f.projectId),
    name: f.name,
    version: f.version,
    title_field: f.titleField,
    timed: f.timed,
    fields: f.fields,
    history: f.history,
    sort: i,
  }));
  const habitRows = defaultHabits.map((h, i) => ({
    user_id: uid,
    grp: h.group,
    section: h.section ?? '',
    label: h.label,
    detail: h.detail ?? '',
    days: h.days,
    counts: h.counts ?? null,
    auto_from: h.autoFrom ?? [],
    no_score: h.noScore ?? false,
    sort: i,
  }));
  const [fe, he] = await Promise.all([
    s.from('formats').insert(formatRows),
    s.from('habits').insert(habitRows),
  ]);
  if (fe.error) throw fe.error;
  if (he.error) throw he.error;
}

/* ---------- writes ---------- */
export async function saveEntry(e: Entry): Promise<string | undefined> {
  const { data, error } = await db()
    .from('entries')
    .insert({
      user_id: uid,
      project_id: e.projectId,
      format_id: e.formatId,
      format_version: e.formatVersion,
      at: e.at,
      duration_min: e.durationMin,
      values: e.values,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data?.id;
}

export async function setTickRow(day: string, habitId: string, on: boolean, source: 'hand' | 'entry') {
  const s = db();
  if (on) {
    const { error } = await s.from('ticks').upsert({ user_id: uid, day, habit_id: habitId, source });
    if (error) throw error;
  } else {
    const { error } = await s.from('ticks').delete().match({ user_id: uid, day, habit_id: habitId });
    if (error) throw error;
  }
}

export async function setDailyRow(day: string, mood?: number, sleep?: number) {
  const { error } = await db()
    .from('daily')
    .upsert({ user_id: uid, day, mood: mood ?? null, sleep: sleep ?? null });
  if (error) throw error;
}

export async function saveHabit(h: Habit): Promise<string | undefined> {
  const row = {
    user_id: uid,
    grp: h.group,
    section: h.section ?? '',
    label: h.label,
    detail: h.detail ?? '',
    days: h.days,
    counts: h.counts ?? null,
    auto_from: h.autoFrom ?? [],
    no_score: h.noScore ?? false,
  };
  const s = db();
  // A real uuid means update; anything else is a new habit.
  const isUuid = /^[0-9a-f-]{36}$/.test(h.id);
  if (isUuid) {
    const { error } = await s.from('habits').update(row).eq('id', h.id);
    if (error) throw error;
    return h.id;
  }
  const { data, error } = await s.from('habits').insert(row).select('id').single();
  if (error) throw error;
  return data?.id;
}

export async function deleteHabit(id: string) {
  const { error } = await db().from('habits').update({ archived: true }).eq('id', id);
  if (error) throw error;
}

export async function saveTask(t: Task): Promise<string | undefined> {
  const row = {
    user_id: uid,
    project_id: t.projectId || null,
    title: t.title,
    due: t.due ?? null,
    status: t.status,
    note: t.note ?? '',
  };
  const s = db();
  if (/^[0-9a-f-]{36}$/.test(t.id)) {
    const { error } = await s.from('tasks').update(row).eq('id', t.id);
    if (error) throw error;
    return t.id;
  }
  const { data, error } = await s.from('tasks').insert(row).select('id').single();
  if (error) throw error;
  return data?.id;
}

export async function saveStat(st: SavedStat): Promise<string | undefined> {
  const row = { user_id: uid, name: st.name, expr: st.expr };
  const s = db();
  if (/^[0-9a-f-]{36}$/.test(st.id)) {
    const { error } = await s.from('saved_stats').update(row).eq('id', st.id);
    if (error) throw error;
    return st.id;
  }
  const { data, error } = await s.from('saved_stats').insert(row).select('id').single();
  if (error) throw error;
  return data?.id;
}

export async function saveReview(kind: string, period: string, fields: Record<string, string>) {
  const { error } = await db()
    .from('reviews')
    .upsert({ user_id: uid, kind, period, fields }, { onConflict: 'user_id,kind,period' });
  if (error) throw error;
}