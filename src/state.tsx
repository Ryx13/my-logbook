import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Entry, Project, SavedStat, Task } from './data/types';
import {
  entries as seedEntries,
  projects as liveProjects,
  setFormats,
  setProjects,
  tasks as seedTasks,
} from './data/mock';
import { savedStats as seedStats } from './data/mock';
import {
  defaultHabits,
  habits as liveHabits,
  seedDaily,
  seedTicks,
  setHabits,
  ticksFromEntries,
  tickKey,
  type DailyMeta,
  type DayMeta,
  type Habit,
  type Ticks,
} from './data/tracker';
import { dayKey } from './data/derive';
import { isSupabase, supabase } from './lib/supabase';
import * as db from './lib/db';

/**
 * App state. In demo mode (no Supabase keys) it holds sample data in memory,
 * exactly as the wireframe did. With Supabase configured and a user signed in,
 * it loads everything from the database on mount and writes every change back,
 * so nothing is lost on reload or on another device.
 */
interface AppState {
  ready: boolean;
  demo: boolean;
  email: string | null;

  entries: Entry[];
  addEntry: (e: Entry) => void;

  ticks: Ticks;
  toggleTick: (date: Date, habitId: string) => void;

  daily: DailyMeta;
  setDaily: (date: Date, patch: DayMeta) => void;

  habits: Habit[];
  upsertHabit: (h: Habit) => void;
  removeHabit: (id: string) => void;

  projects: Project[];
  tasks: Task[];
  upsertTask: (t: Task) => void;

  savedStats: SavedStat[];
  upsertStat: (s: SavedStat) => void;

  saveReview: (kind: string, period: string, fields: Record<string, string>) => void;
  loadBundle: (b: {
    projects: Project[];
    entries: Entry[];
    habits: Habit[];
    ticks: Ticks;
    daily: DailyMeta;
    tasks: Task[];
    savedStats: SavedStat[];
  }) => void;

  capture: { open: boolean; projectId?: string; formatId?: string };
  openCapture: (projectId?: string, formatId?: string) => void;
  closeCapture: () => void;
  selected: Entry | null;
  select: (e: Entry | null) => void;
  toast: string | null;
  notify: (msg: string) => void;
}

const Ctx = createContext<AppState | null>(null);

// Users whose data has already been loaded this page session (guards against
// duplicate hydrate/seed from strict-mode double-mounts or repeated auth events).
const hydratedUids = new Set<string>();

export function AppProvider({ children }: { children: ReactNode }) {
  const demo = !isSupabase;

  const [ready, setReady] = useState(demo);
  const [email, setEmail] = useState<string | null>(null);
  const [rev, bump] = useState(0); // force re-render when live bindings change

  const [entries, setEntries] = useState<Entry[]>(demo ? seedEntries : []);
  const [handTicks, setHandTicks] = useState<Ticks>(demo ? seedTicks() : {});
  const [daily, setDailyState] = useState<DailyMeta>(demo ? seedDaily() : {});
  const [habits, setHabitsState] = useState<Habit[]>(demo ? liveHabits : []);
  const [projects, setProjectsState] = useState<Project[]>(demo ? liveProjects : []);
  const [tasks, setTasks] = useState<Task[]>(demo ? seedTasks : []);
  const [savedStats, setStats] = useState<SavedStat[]>(demo ? seedStats : []);

  const [capture, setCapture] = useState<AppState['capture']>({ open: false });
  const [selected, select] = useState<Entry | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  // Keep the module-level live bindings in step, so the scoring helpers and any
  // component importing them directly see the current data.
  const applyHabits = useCallback((h: Habit[]) => {
    setHabits(h);
    setHabitsState(h);
    bump((n) => n + 1);
  }, []);

  /* ---------- initial load (Supabase mode) ---------- */
  const hydrate = useCallback(async () => {
    try {
      let snap = await db.loadAll();
      if (snap.projects.length === 0) {
        await db.seedDefaults();
        snap = await db.loadAll();
      }
      setProjects(snap.projects);
      setProjectsState(snap.projects);
      setFormats(snap.formats);
      setEntries(snap.entries);
      applyHabits(snap.habits.length ? snap.habits : defaultHabits);
      setHandTicks(snap.ticks);
      setDailyState(snap.daily);
      setTasks(snap.tasks);
      setStats(snap.savedStats);
    } catch (e) {
      console.error(e);
      notify('Could not load your data');
    } finally {
      setReady(true);
    }
  }, [applyHabits, notify]);

  useEffect(() => {
    if (demo || !supabase) return;
    // Supabase emits the current session on subscribe (INITIAL_SESSION), so this
    // one listener covers both first load and later sign-in/out. A per-user guard
    // makes sure hydrate (and its first-run seeding) runs exactly once per user,
    // even with React's strict-mode double-mount.
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const user = session?.user;
      if (user) {
        if (hydratedUids.has(user.id)) {
          setEmail(user.email ?? null);
          setReady(true);
          return;
        }
        hydratedUids.add(user.id);
        db.setUid(user.id);
        setEmail(user.email ?? null);
        setReady(false);
        hydrate();
      } else {
        hydratedUids.clear();
        setEmail(null);
        setReady(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [demo, hydrate]);

  // Entry ticks always win over hand ticks.
  const ticks = useMemo<Ticks>(
    () => ({ ...handTicks, ...ticksFromEntries(entries) }),
    [handTicks, entries],
  );

  /* ---------- mutations ---------- */
  const addEntry = useCallback(
    (e: Entry) => {
      setEntries((list) => [e, ...list]);
      if (!demo)
        db.saveEntry(e).then((id) => {
          if (id) setEntries((list) => list.map((x) => (x.id === e.id ? { ...x, id } : x)));
        }).catch(() => notify('Could not save entry'));
    },
    [demo, notify],
  );

  const toggleTick = useCallback(
    (date: Date, habitId: string) => {
      const key = tickKey(date, habitId);
      if (ticks[key] === 'entry') {
        notify('Ticked by a logged entry. Remove the entry to untick it.');
        return;
      }
      const on = !handTicks[key];
      setHandTicks((t) => {
        const next = { ...t };
        if (on) next[key] = 'hand';
        else delete next[key];
        return next;
      });
      if (!demo) db.setTickRow(dayKey(date), habitId, on, 'hand').catch(() => notify('Could not save tick'));
    },
    [ticks, handTicks, demo, notify],
  );

  const setDaily = useCallback(
    (date: Date, patch: DayMeta) => {
      const k = dayKey(date);
      setDailyState((d) => {
        const merged = { ...d, [k]: { ...d[k], ...patch } };
        if (!demo) db.setDailyRow(k, merged[k].mood, merged[k].sleep).catch(() => notify('Could not save'));
        return merged;
      });
    },
    [demo, notify],
  );

  const upsertHabit = useCallback(
    (h: Habit) => {
      const exists = habits.some((x) => x.id === h.id);
      const next = exists ? habits.map((x) => (x.id === h.id ? h : x)) : [...habits, h];
      applyHabits(next);
      if (!demo)
        db.saveHabit(h).then((id) => {
          if (id && id !== h.id) applyHabits(next.map((x) => (x.id === h.id ? { ...x, id } : x)));
        }).catch(() => notify('Could not save habit'));
    },
    [habits, applyHabits, demo, notify],
  );

  const removeHabit = useCallback(
    (id: string) => {
      applyHabits(habits.filter((x) => x.id !== id));
      if (!demo) db.deleteHabit(id).catch(() => notify('Could not remove habit'));
    },
    [habits, applyHabits, demo, notify],
  );

  const upsertTask = useCallback(
    (t: Task) => {
      setTasks((list) => (list.some((x) => x.id === t.id) ? list.map((x) => (x.id === t.id ? t : x)) : [t, ...list]));
      if (!demo)
        db.saveTask(t).then((id) => {
          if (id && id !== t.id) setTasks((list) => list.map((x) => (x.id === t.id ? { ...x, id } : x)));
        }).catch(() => notify('Could not save task'));
    },
    [demo, notify],
  );

  const upsertStat = useCallback(
    (st: SavedStat) => {
      setStats((list) => (list.some((x) => x.id === st.id) ? list.map((x) => (x.id === st.id ? st : x)) : [...list, st]));
      if (!demo) db.saveStat(st).catch(() => notify('Could not save statistic'));
    },
    [demo, notify],
  );

  const saveReview = useCallback(
    (kind: string, period: string, fields: Record<string, string>) => {
      if (!demo) db.saveReview(kind, period, fields).catch(() => notify('Could not save review'));
      notify('Review saved');
    },
    [demo, notify],
  );

  const loadBundle = useCallback(
    (b: {
      projects: Project[];
      entries: Entry[];
      habits: Habit[];
      ticks: Ticks;
      daily: DailyMeta;
      tasks: Task[];
      savedStats: SavedStat[];
    }) => {
      setProjects(b.projects);
      setProjectsState(b.projects);
      setEntries(b.entries);
      applyHabits(b.habits);
      setHandTicks(b.ticks);
      setDailyState(b.daily);
      setTasks(b.tasks);
      setStats(b.savedStats);
      notify('Import loaded into this view');
    },
    [applyHabits, notify],
  );

  const value = useMemo<AppState>(
    () => ({
      ready,
      demo,
      email,
      entries,
      addEntry,
      ticks,
      toggleTick,
      daily,
      setDaily,
      habits,
      upsertHabit,
      removeHabit,
      projects,
      tasks,
      upsertTask,
      savedStats,
      upsertStat,
      saveReview,
      loadBundle,
      capture,
      openCapture: (projectId, formatId) => setCapture({ open: true, projectId, formatId }),
      closeCapture: () => setCapture({ open: false }),
      selected,
      select,
      toast,
      notify,
    }),
    // rev is included so consumers re-render when live bindings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, demo, email, entries, ticks, daily, habits, projects, tasks, savedStats, capture, selected, toast, rev, addEntry, toggleTick, setDaily, upsertHabit, removeHabit, upsertTask, upsertStat, saveReview, loadBundle, notify],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}