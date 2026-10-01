import type { Entry } from './types';
import { dayKey, startOfDay, TODAY } from './derive';

/**
 * The tick-box tracker from the Operating Protocol (p.12–13).
 *
 * The weekly habit grid lists every habit, Mon–Sun. Some habits only apply on
 * certain days (e.g. the Wednesday striking session); the other days are shown
 * greyed out rather than as empty boxes, so an unticked box always means
 * "missed", never "not scheduled".
 *
 * The monthly consistency grid is not ticked separately. It is filled in from
 * the weekly ticks: a day counts for "mobility", "a training session" or
 * "a SEC block" when any habit in that group is ticked.
 */

export type HabitGroup = 'sec' | 'body' | 'mind' | 'life';
export type CoreHabit = 'mobility' | 'training' | 'sec';

export interface Habit {
  id: string;
  group: HabitGroup;
  label: string;
  /** The specifics: sets × reps, time, or how to do it. Shown under the name. */
  detail?: string;
  /** A sub-heading within the group, e.g. "Core" or "Wed finisher". */
  section?: string;
  /** Days this habit is scheduled, 0 = Monday … 6 = Sunday. */
  days: number[];
  /** Which of the three monthly non-negotiables a tick counts towards. */
  counts?: CoreHabit;
  /** Formats whose entries tick this box automatically. */
  autoFrom?: string[];
  /** "If applicable" reps that are shown but don't count towards a day's score. */
  noScore?: boolean;
}

const ALL = [0, 1, 2, 3, 4, 5, 6];

/**
 * Every habit is a specific action with its own sets/reps/time, not an umbrella.
 * Days: 0 = Mon … 6 = Sun. The Body track is built around a lean, visible
 * six-pack: skill sessions and finishers for conditioning, dedicated core work
 * for the abs themselves, and the two nutrition levers that actually make them
 * show. Everything here comes from the Operating Protocol (pp. 3–10).
 */
const defaultHabits: Habit[] = [
  // ---------------- SEC ----------------
  {
    id: 'sec-study',
    group: 'sec',
    section: 'Study',
    label: 'CPTS study',
    days: ALL,
    counts: 'sec',
  },
  {
    id: 'sec-revisit',
    group: 'sec',
    section: 'Study',
    label: 'Revisit one stuck concept',
    detail: 'The thing that tripped you up this week',
    days: [6],
  },
  {
    id: 'sec-lab',
    group: 'sec',
    section: 'Lab',
    label: 'Lab block — root one box',
    detail: '2–3 hrs · HTB / Proving Grounds',
    days: [5],
    counts: 'sec',
    autoFrom: ['lab-attempt'],
  },
  {
    id: 'sec-writeup',
    group: 'sec',
    section: 'Lab',
    label: 'Write up the box',
    detail: 'In your own words, after each box',
    days: [5],
  },

  // ---------------- BODY ----------------
  {
    id: 'mobility',
    group: 'body',
    section: 'Daily',
    label: 'Morning mobility',
    detail: '10 min · hips, shoulders, wrists, hamstrings',
    days: ALL,
    counts: 'mobility',
  },
  {
    id: 'run-1k',
    group: 'body',
    section: 'Daily',
    label: '1 km run',
    detail: 'Steady pace · adds daily conditioning',
    days: ALL,
  },
  // Core — the abs themselves, trained Mon / Wed / Fri.
  {
    id: 'core-legraise',
    group: 'body',
    section: 'Core (six-pack)',
    label: 'Hanging leg raises',
    detail: '3 × 10–12 · slow, no swing',
    days: [0, 2, 4],
  },
  {
    id: 'core-crunch',
    group: 'body',
    section: 'Core (six-pack)',
    label: 'Band / cable crunch',
    detail: '3 × 15 · black band, controlled',
    days: [0, 2, 4],
  },
  {
    id: 'core-plank',
    group: 'body',
    section: 'Core (six-pack)',
    label: 'Plank',
    detail: '3 × 45s · hips square',
    days: [0, 2, 4],
  },
  {
    id: 'core-twist',
    group: 'body',
    section: 'Core (six-pack)',
    label: 'Bicycle crunches',
    detail: '3 × 20 · slow, full rotation',
    days: [0, 4],
  },
  {
    id: 'core-wheel',
    group: 'body',
    section: 'Core (six-pack)',
    label: 'Ab-wheel rollouts',
    detail: '3 × 8–10 · from knees, flat back',
    days: [0, 2, 4],
  },
  // Wednesday — striking, then the light-medium band finisher.
  {
    id: 'wed-shadow',
    group: 'body',
    section: 'Wed — striking',
    label: 'Shadowboxing rounds',
    detail: '3 × 3 min · one focus per round',
    days: [2],
    counts: 'training',
    autoFrom: ['session'],
  },
  {
    id: 'wed-rope',
    group: 'body',
    section: 'Wed — striking',
    label: 'Jump rope warm-up',
    detail: '5 min · single-unders',
    days: [2],
  },
  {
    id: 'wed-fin-punch',
    group: 'body',
    section: 'Wed finisher · 4 rounds, 30s on / 15s off',
    label: 'Band-resisted punches',
    detail: '4 × 30s · light band, jab-cross at speed',
    days: [2],
  },
  {
    id: 'wed-fin-sqrow',
    group: 'body',
    section: 'Wed finisher · 4 rounds, 30s on / 15s off',
    label: 'Band squat-to-row',
    detail: '4 × 30s · squat, drive up into a row',
    days: [2],
  },
  {
    id: 'wed-fin-climb',
    group: 'body',
    section: 'Wed finisher · 4 rounds, 30s on / 15s off',
    label: 'Mountain climbers',
    detail: '4 × 30s · fast, knees to chest',
    days: [2],
  },
  {
    id: 'wed-fin-rope',
    group: 'body',
    section: 'Wed finisher · 4 rounds, 30s on / 15s off',
    label: 'Jump rope, high cadence',
    detail: '4 × 30s · all-out',
    days: [2],
  },
  // Friday — gymnastics, then the light-band finisher.
  {
    id: 'fri-handstand',
    group: 'body',
    section: 'Fri — gymnastics',
    label: 'Handstand hold',
    detail: '3 × 45s · chest- or back-to-wall',
    days: [4],
    counts: 'training',
    autoFrom: ['session'],
  },
  {
    id: 'fri-bridge',
    group: 'body',
    section: 'Fri — gymnastics',
    label: 'Bridge hold',
    detail: '3 × 30s · shoulders/back',
    days: [4],
  },
  {
    id: 'fri-fin-push',
    group: 'body',
    section: 'Fri finisher · 4 rounds, 30s on / 15s off',
    label: 'Banded push-ups',
    detail: '4 × 30s · light band across the back',
    days: [4],
  },
  {
    id: 'fri-fin-apart',
    group: 'body',
    section: 'Fri finisher · 4 rounds, 30s on / 15s off',
    label: 'Band pull-aparts',
    detail: '4 × 30s · full extension',
    days: [4],
  },
  {
    id: 'fri-fin-hollow',
    group: 'body',
    section: 'Fri finisher · 4 rounds, 30s on / 15s off',
    label: 'Hollow-body hold + band press',
    detail: '4 × 30s · press overhead, low back flat',
    days: [4],
  },
  {
    id: 'fri-fin-taps',
    group: 'body',
    section: 'Fri finisher · 4 rounds, 30s on / 15s off',
    label: 'Plank shoulder taps',
    detail: '4 × 30s · hips still',
    days: [4],
  },
  // Saturday — combined session, then the hardest (medium-band) finisher.
  {
    id: 'sat-session',
    group: 'body',
    section: 'Sat — combined',
    label: 'Combined skill session',
    detail: '30–40 min · striking + gymnastics',
    days: [5],
    counts: 'training',
    autoFrom: ['session'],
  },
  {
    id: 'sat-fin-jsquat',
    group: 'body',
    section: 'Sat finisher · 4 rounds, 30s on / 15s off',
    label: 'Band jump squats',
    detail: '4 × 30s · medium band, explosive',
    days: [5],
  },
  {
    id: 'sat-fin-row',
    group: 'body',
    section: 'Sat finisher · 4 rounds, 30s on / 15s off',
    label: 'Band rows',
    detail: '4 × 30s · full range, squeeze',
    days: [5],
  },
  {
    id: 'sat-fin-knees',
    group: 'body',
    section: 'Sat finisher · 4 rounds, 30s on / 15s off',
    label: 'High knees',
    detail: '4 × 30s · max cadence',
    days: [5],
  },
  {
    id: 'sat-fin-chop',
    group: 'body',
    section: 'Sat finisher · 4 rounds, 30s on / 15s off',
    label: 'Band woodchoppers',
    detail: '4 × 30s · alternate sides each round',
    days: [5],
  },
  // Pull-up bar — twice a week (Wed + Sat).
  {
    id: 'pull-ups',
    group: 'body',
    section: 'Pull-up bar · 2× week',
    label: 'Pull-ups',
    detail: '3 × max · full dead hang',
    days: [2, 5],
  },
  {
    id: 'pull-kneeraise',
    group: 'body',
    section: 'Pull-up bar · 2× week',
    label: 'Hanging knee raises',
    detail: '3 × 12 · controlled',
    days: [2, 5],
  },
  // Flexibility — two dedicated sessions (Tue + Fri).
  {
    id: 'flex',
    group: 'body',
    section: 'Flexibility · 2× week',
    label: 'Flexibility session',
    detail: '15–20 min · hip flexors, hamstrings, thoracic',
    days: [1, 4],
  },
  // Nutrition — what actually makes the six-pack visible.
  {
    id: 'nut-protein',
    group: 'body',
    section: 'Nutrition for leanness',
    label: 'Protein at every meal',
    detail: 'Eggs, lean meat, fish, legumes, dairy',
    days: ALL,
  },
  {
    id: 'nut-deficit',
    group: 'body',
    section: 'Nutrition for leanness',
    label: 'Hold the deficit',
    detail: 'Veg first · no late-night snacking',
    days: ALL,
  },

  // ---------------- MIND ----------------
  {
    id: 'observation',
    group: 'mind',
    section: 'Daily reps',
    label: 'Observation rep',
    detail: 'Note two things about someone before you speak',
    days: ALL,
    autoFrom: ['observation'],
  },
  {
    id: 'fewer-words',
    group: 'mind',
    section: 'Daily reps',
    label: 'Fewer-words rep',
    detail: 'Answer one exchange in fewer words than feels natural',
    days: ALL,
  },
  {
    id: 'close-warm',
    group: 'mind',
    section: 'Daily reps',
    label: 'Close warm',
    detail: 'End one interaction on a genuine warm beat',
    days: ALL,
  },
  {
    id: 'group-pause',
    group: 'mind',
    section: 'Group settings (as they come up)',
    label: 'Three-second pause',
    detail: 'Pause 3s before grabbing control',
    days: ALL,
    noScore: true,
  },
  {
    id: 'group-reframe',
    group: 'mind',
    section: 'Group settings (as they come up)',
    label: 'Reframe as an offer',
    detail: '"What if we tried X?" then let silence work',
    days: ALL,
    noScore: true,
  },
  {
    id: 'group-wait',
    group: 'mind',
    section: 'Group settings (as they come up)',
    label: 'Wait one full turn',
    detail: 'Let two others speak before you',
    days: ALL,
    noScore: true,
  },
  {
    id: 'tue-journal',
    group: 'mind',
    section: 'Weekly',
    label: 'Mindset journal',
    detail: '2–3 sentences · one calm moment, one overexert',
    days: [1],
    autoFrom: ['journal'],
  },
  {
    id: 'sun-reflection',
    group: 'mind',
    section: 'Weekly',
    label: 'Weekly reflection',
    detail: 'Review the week, plan the next',
    days: [6],
  },

  // ---------------- LIFE (daily keystone habits) ----------------
  {
    id: 'life-water',
    group: 'life',
    section: 'Health',
    label: 'Drink 3 L water',
    detail: 'Bottle on hand through the day',
    days: ALL,
  },
  {
    id: 'life-cold-shower',
    group: 'life',
    section: 'Health',
    label: 'Cold morning shower',
    detail: 'Finish cold, 1–2 min',
    days: ALL,
  },
  {
    id: 'life-sunlight',
    group: 'life',
    section: 'Health',
    label: 'Sunlight / short walk',
    detail: '10 min outside',
    days: ALL,
  },
  {
    id: 'life-skin-am',
    group: 'life',
    section: 'Grooming',
    label: 'Morning skincare',
    detail: 'Cleanse, moisturise, SPF',
    days: ALL,
  },
  {
    id: 'life-skin-pm',
    group: 'life',
    section: 'Grooming',
    label: 'Night skincare',
    detail: 'Cleanse, treat, moisturise',
    days: ALL,
  },
  {
    id: 'life-tidy',
    group: 'life',
    section: 'Grooming',
    label: 'Tidy your space',
    detail: '10 min reset',
    days: ALL,
  },
  {
    id: 'life-reading',
    group: 'life',
    section: 'Read & learn',
    label: 'Read 5+ pages',
    detail: 'A book, not a screen',
    days: ALL,
  },
];

/**
 * `habits` is a live binding the app can replace at runtime (editable habits,
 * or a list loaded from Supabase). Helpers below read it, and importing modules
 * see updates because it is a `let` export. `defaultHabits` seeds a new account.
 */
export let habits: Habit[] = defaultHabits.map((h) => ({ ...h }));
export function setHabits(next: Habit[]): void {
  habits = next;
}
export { defaultHabits };

export const groupLabels: Record<HabitGroup, { name: string; color: number }> = {
  sec: { name: 'SEC', color: 1 },
  body: { name: 'BODY', color: 4 },
  mind: { name: 'MIND', color: 3 },
  life: { name: 'LIFE', color: 2 },
};

export const coreLabels: Record<CoreHabit, { name: string; rule: string }> = {
  mobility: { name: 'Mobility', rule: 'Daily, any day counts' },
  training: { name: 'A training session', rule: 'Striking, gymnastics or combined; any one counts' },
  sec: { name: 'A SEC block', rule: 'Review, study or lab time; any one counts' },
};

/** The weekly schedule from p.2, shown as "planned" on the calendar. */
export const weeklyPlan: Record<number, { time: string; what: string; projectId: string }[]> = {
  0: [
    { time: 'Morning', what: 'Mobility, 10 min', projectId: 'body' },
    { time: '16:30', what: 'CPTS review / notes, 30–40 min', projectId: 'sec' },
  ],
  1: [
    { time: 'Morning', what: 'Mobility, 10 min', projectId: 'body' },
    { time: '17:30', what: 'Weekly mindset journal', projectId: 'mind' },
  ],
  2: [
    { time: 'Morning', what: 'Mobility, 10 min', projectId: 'body' },
    { time: '16:00', what: 'Striking + footwork, 35–40 min + band finisher', projectId: 'body' },
  ],
  3: [
    { time: 'Morning', what: 'Mobility, 10 min', projectId: 'body' },
    { time: '16:00', what: 'CPTS study, 45–60 min, AD-focused', projectId: 'sec' },
  ],
  4: [
    { time: 'Morning', what: 'Mobility, 10 min', projectId: 'body' },
    { time: '16:00', what: 'Gymnastics, 30–40 min + band finisher (flexible)', projectId: 'body' },
  ],
  5: [
    { time: 'Morning', what: 'Mobility, 10 min', projectId: 'body' },
    { time: 'Day', what: 'Home lab / Pro Lab / write-up, 2–3 hrs', projectId: 'sec' },
    { time: 'After', what: 'Combined session + finisher, if energy allows', projectId: 'body' },
  ],
  6: [
    { time: 'Morning', what: 'Light mobility', projectId: 'body' },
    { time: 'Evening', what: 'Weekly reflection + plan ahead', projectId: 'mind' },
  ],
};

/** Monday = 0 … Sunday = 6. */
export function weekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function mondayOf(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() - weekday(x));
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export const tickKey = (date: Date, habitId: string) => `${dayKey(date)}|${habitId}`;

export const isScheduled = (h: Habit, date: Date) => h.days.includes(weekday(date));

/** Ticks keyed by "YYYY-MM-DD|habitId". Value says how it was ticked. */
export type Ticks = Record<string, 'hand' | 'entry'>;

/**
 * Sample ticks for the wireframe: about 6 weeks of history, a bit patchy so
 * the grids look like a real month rather than a perfect one.
 */
export function seedTicks(): Ticks {
  const ticks: Ticks = {};
  const today = startOfDay(TODAY);
  for (let back = 1; back <= 42; back++) {
    const d = addDays(today, -back);
    habits.forEach((h, hi) => {
      if (!isScheduled(h, d)) return;
      // Deterministic "mostly done" pattern, with core habits held more often.
      const n = (back * 13 + hi * 7) % 10;
      const threshold = h.counts === 'mobility' ? 8 : h.counts ? 7 : h.noScore ? 3 : 5;
      if (n < threshold) ticks[tickKey(d, h.id)] = 'hand';
    });
  }
  // Today (Sunday): mobility done, reflection still to do.
  ticks[tickKey(today, 'mobility')] = 'hand';
  ticks[tickKey(today, 'observation')] = 'hand';
  return ticks;
}

/** Ticks implied by logged entries (e.g. a finisher entry ticks the finisher box). */
export function ticksFromEntries(entries: Entry[]): Ticks {
  const out: Ticks = {};
  entries.forEach((e) => {
    const d = new Date(e.at);
    const key = e.formatKey ?? e.formatId;
    const h = habits.find((x) => x.autoFrom?.includes(key) && isScheduled(x, d));
    if (h) out[tickKey(d, h.id)] = 'entry';
    // A rooted box with a write-up link also ticks the write-up habit.
    if ((e.formatKey ?? e.formatId) === 'lab-attempt' && e.values.writeup) out[tickKey(d, 'writeup')] = 'entry';
  });
  return out;
}

/** Whether a core habit was held on a given day (any habit in that group ticked). */
export function coreHeld(core: CoreHabit, date: Date, ticks: Ticks): boolean {
  return habits.some((h) => h.counts === core && !!ticks[tickKey(date, h.id)]);
}

/** Whether any habit feeding this core habit is scheduled on that day. */
export function corePlanned(core: CoreHabit, date: Date): boolean {
  return habits.some((h) => h.counts === core && isScheduled(h, date));
}

/** Five Monday-start weeks covering the month that contains `d`. */
export function monthWeeks(d: Date): Date[][] {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const start = mondayOf(first);
  return Array.from({ length: 5 }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i)));
}

/** Scheduled vs ticked boxes for one day. */
export function dayScore(date: Date, ticks: Ticks): { done: number; due: number } {
  const due = habits.filter((h) => isScheduled(h, date) && scored(h));
  return { due: due.length, done: due.filter((h) => ticks[tickKey(date, h.id)]).length };
}

/* ---------- Month sheet (spreadsheet-style month view) ---------- */

/** Every day of the month containing `d`. */
export function daysInMonth(d: Date): Date[] {
  const y = d.getFullYear();
  const m = d.getMonth();
  const n = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) => new Date(y, m, i + 1));
}

/** Habits that count towards scores ("if applicable" ones are shown but not scored). */
export const scored = (h: Habit) => !h.noScore;

/** Mood (1–5) and hours of sleep, one per day. */
export interface DayMeta {
  mood?: number;
  sleep?: number;
}
export type DailyMeta = Record<string, DayMeta>;

/** Sample mood and sleep for the last six weeks. */
export function seedDaily(): DailyMeta {
  const out: DailyMeta = {};
  const today = startOfDay(TODAY);
  for (let back = 1; back <= 42; back++) {
    const d = addDays(today, -back);
    out[dayKey(d)] = {
      mood: 2 + ((back * 7) % 4),
      sleep: 6 + ((back * 3) % 5) * 0.5,
    };
  }
  return out;
}

/* ---------- Streaks ---------- */

/** Current and best run of consecutive days with at least one box ticked. */
export function overallStreak(ticks: Ticks, upto: Date): { current: number; best: number } {
  const hasTick = (d: Date) => {
    const k = dayKey(d);
    return habits.some((h) => ticks[`${k}|${h.id}`]);
  };
  // Current: walk back from today (today not yet ticked is allowed to be 0).
  let current = 0;
  for (let i = 0; i < 400; i++) {
    const d = addDays(startOfDay(upto), -i);
    if (hasTick(d)) current++;
    else if (i === 0) continue; // today still open
    else break;
  }
  // Best over the last ~180 days.
  let best = 0;
  let run = 0;
  for (let i = 180; i >= 0; i--) {
    const d = addDays(startOfDay(upto), -i);
    if (hasTick(d)) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return { current, best };
}

/** Streak for one specific habit (days it was scheduled and ticked). */
export function habitStreak(habitId: string, ticks: Ticks, upto: Date): number {
  const h = habits.find((x) => x.id === habitId);
  if (!h) return 0;
  let current = 0;
  for (let i = 0; i < 400; i++) {
    const d = addDays(startOfDay(upto), -i);
    if (!isScheduled(h, d)) continue;
    if (ticks[`${dayKey(d)}|${habitId}`]) current++;
    else if (i === 0) continue;
    else break;
  }
  return current;
}
