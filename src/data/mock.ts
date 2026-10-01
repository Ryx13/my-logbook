import type { Project, Format, Entry, Task, SavedStat } from './types';

/**
 * Hardcoded sample data for the wireframe. Modelled on the four projects in the
 * Operating Protocol so the screens show something realistic. None of this is
 * saved anywhere — reloading the page resets it. It gets replaced by the
 * database layer once the design is signed off.
 */

const defaultProjects: Project[] = [
  {
    id: 'sec',
    name: 'SEC',
    description: 'Offensive-security labs and machine write-ups.',
    color: 1,
    archived: false,
    createdAt: '2026-01-06',
  },
  {
    id: 'body',
    name: 'Body',
    description: 'Training sessions, finishers and weekly check-ins.',
    color: 4,
    archived: false,
    createdAt: '2026-01-06',
  },
  {
    id: 'mind',
    name: 'Mind',
    description: 'Observation reps and the Tuesday journal.',
    color: 3,
    archived: false,
    createdAt: '2026-01-06',
  },
  {
    id: 'oscp',
    name: 'OSCP',
    description: 'Certification prep, tracked as milestones.',
    color: 2,
    archived: false,
    createdAt: '2026-02-01',
  },
];

const defaultFormats: Format[] = [
  {
    id: 'lab-attempt',
    key: 'lab-attempt',
    projectId: 'sec',
    name: 'Lab attempt',
    version: 2,
    titleField: 'target',
    timed: true,
    history: [
      { version: 1, date: '2026-01-06', note: 'Created: target, difficulty, notes.' },
      { version: 2, date: '2026-03-14', note: 'Added technique tag and write-up link.' },
    ],
    fields: [
      { id: 'target', name: 'Target', type: 'text', required: true, prefill: 'none' },
      {
        id: 'difficulty',
        name: 'Difficulty',
        type: 'select',
        options: ['Easy', 'Medium', 'Hard', 'Insane'],
        required: true,
      },
      { id: 'technique', name: 'Key technique', type: 'tags' },
      { id: 'rooted', name: 'Rooted', type: 'checkbox' },
      { id: 'writeup', name: 'Write-up', type: 'link' },
      { id: 'notes', name: 'Notes', type: 'longtext' },
    ],
  },
  {
    id: 'session',
    key: 'session',
    projectId: 'body',
    name: 'Training session',
    version: 1,
    titleField: 'focus',
    timed: true,
    history: [{ version: 1, date: '2026-01-06', note: 'Created.' }],
    fields: [
      {
        id: 'focus',
        name: 'Focus',
        type: 'select',
        options: ['Push', 'Pull', 'Legs', 'Conditioning', 'Mobility'],
        required: true,
      },
      { id: 'rpe', name: 'Effort (RPE)', type: 'rating', max: 10 },
      { id: 'notes', name: 'Notes', type: 'longtext' },
    ],
  },
  {
    id: 'finisher',
    key: 'finisher',
    projectId: 'body',
    name: 'Finisher',
    version: 2,
    titleField: 'circuit',
    timed: true,
    history: [
      { version: 1, date: '2026-01-06', note: 'Created: circuit, total reps.' },
      { version: 2, date: '2026-04-02', note: 'Split reps per round; added clean-form flag.' },
    ],
    fields: [
      { id: 'circuit', name: 'Circuit', type: 'text', required: true },
      { id: 'rounds', name: 'Rounds', type: 'number', prefill: 'last' },
      { id: 'reps', name: 'Reps per round', type: 'number', unit: 'reps' },
      { id: 'clean', name: 'Clean form throughout', type: 'checkbox' },
      { id: 'output', name: 'Total reps', type: 'computed', expr: 'rounds * reps' },
    ],
  },
  {
    id: 'checkin',
    key: 'checkin',
    projectId: 'body',
    name: 'Body check-in',
    version: 1,
    titleField: 'weight',
    timed: false,
    history: [{ version: 1, date: '2026-01-06', note: 'Created.' }],
    fields: [
      { id: 'weight', name: 'Weight', type: 'number', unit: 'kg' },
      { id: 'sleep', name: 'Sleep', type: 'duration' },
      { id: 'mood', name: 'Mood', type: 'rating', max: 5 },
    ],
  },
  {
    id: 'observation',
    key: 'observation',
    projectId: 'mind',
    name: 'Observation rep',
    version: 1,
    titleField: 'prompt',
    timed: false,
    history: [{ version: 1, date: '2026-01-06', note: 'Created.' }],
    fields: [
      { id: 'prompt', name: 'What I noticed', type: 'text', required: true },
      { id: 'tags', name: 'Tags', type: 'tags' },
    ],
  },
  {
    id: 'journal',
    key: 'journal',
    projectId: 'mind',
    name: 'Journal',
    version: 1,
    titleField: 'title',
    timed: false,
    history: [{ version: 1, date: '2026-01-06', note: 'Created.' }],
    fields: [
      { id: 'title', name: 'Title', type: 'text', required: true },
      { id: 'body', name: 'Entry', type: 'longtext', required: true },
    ],
  },
  {
    id: 'milestone',
    key: 'milestone',
    projectId: 'oscp',
    name: 'Milestone',
    version: 1,
    titleField: 'name',
    timed: false,
    history: [{ version: 1, date: '2026-02-01', note: 'Created.' }],
    fields: [
      { id: 'name', name: 'Milestone', type: 'text', required: true },
      { id: 'done', name: 'Reached', type: 'checkbox' },
    ],
  },
];

// Live bindings the app can replace at runtime (data loaded from Supabase).
// Importers see updates because these are `let` exports.
export let projects: Project[] = defaultProjects.map((p) => ({ ...p }));
export let formats: Format[] = defaultFormats.map((f) => ({ ...f }));
export function setProjects(next: Project[]): void {
  projects = next;
}
export function setFormats(next: Format[]): void {
  formats = next;
}
export { defaultProjects, defaultFormats };

// A helper to keep the entry list terse.
function e(
  id: string,
  projectId: string,
  formatId: string,
  formatVersion: number,
  at: string,
  durationMin: number,
  values: Entry['values'],
  revisions?: number,
): Entry {
  return { id, projectId, formatId, formatVersion, at, durationMin, values, revisions };
}

// Dates are relative to "today" = 2026-09-27 in the wireframe.
export const entries: Entry[] = [
  e('n1', 'sec', 'lab-attempt', 2, '2026-09-26T20:10:00+02:00', 145, {
    target: 'Corrosion',
    difficulty: 'Hard',
    technique: ['pivoting', 'kerberoasting'],
    rooted: true,
    writeup: 'https://notes.local/corrosion',
    notes: 'Foothold via exposed SMB share. Roasted a service account, pivoted to DC.',
  }),
  e('n2', 'body', 'finisher', 2, '2026-09-26T07:05:00+02:00', 12, {
    circuit: 'KB swings + burpees',
    rounds: 5,
    reps: 20,
    clean: true,
  }),
  e('n3', 'mind', 'observation', 1, '2026-09-25T22:40:00+02:00', 0, {
    prompt: 'I rush the last hour of a lab and it costs me the write-up.',
    tags: ['focus', 'pattern'],
  }),
  e('n4', 'body', 'session', 1, '2026-09-25T18:00:00+02:00', 58, {
    focus: 'Pull',
    rpe: 8,
    notes: 'Weighted pull-ups moving well.',
  }),
  e('n5', 'sec', 'lab-attempt', 2, '2026-09-24T21:30:00+02:00', 190, {
    target: 'Blackfield',
    difficulty: 'Hard',
    technique: ['asrep-roast', 'bloodhound'],
    rooted: false,
    notes: 'Stuck on privilege escalation. Revisit backup operators group.',
  }),
  e('n6', 'body', 'finisher', 2, '2026-09-24T07:10:00+02:00', 10, {
    circuit: 'Rowing sprints',
    rounds: 4,
    reps: 250,
    clean: true,
  }),
  e('n7', 'mind', 'journal', 1, '2026-09-23T21:00:00+02:00', 0, {
    title: 'On sticking with hard machines',
    body: 'Noticing that quitting a box early feels like relief but reads as avoidance the next day.',
  }),
  e('n8', 'sec', 'lab-attempt', 2, '2026-09-23T20:00:00+02:00', 120, {
    target: 'Return',
    difficulty: 'Easy',
    technique: ['printer-exploit'],
    rooted: true,
    writeup: 'https://notes.local/return',
    notes: 'LDAP passback to grab creds. Clean and quick.',
  }),
  e('n9', 'body', 'session', 1, '2026-09-22T18:30:00+02:00', 62, {
    focus: 'Legs',
    rpe: 9,
    notes: 'Squats up 5kg.',
  }),
  e('n10', 'sec', 'lab-attempt', 1, '2026-09-20T19:00:00+02:00', 160, {
    target: 'Forest',
    difficulty: 'Medium',
    rooted: true,
    notes: '(Logged under v1 of the format — no technique tag existed yet.)',
  }),
  e('n11', 'body', 'checkin', 1, '2026-09-21T08:00:00+02:00', 0, {
    weight: 78.4,
    sleep: '7:15',
    mood: 4,
  }),
  e('n12', 'mind', 'observation', 1, '2026-09-19T23:00:00+02:00', 0, {
    prompt: 'Best focus comes after a morning finisher, not coffee.',
    tags: ['energy'],
  }),
];

export const tasks: Task[] = [
  { id: 't1', projectId: 'oscp', title: 'Finish PEN-200 module 12', due: '2026-09-30', status: 'doing' },
  { id: 't2', projectId: 'oscp', title: 'Root 10 Proving Grounds boxes', status: 'todo', note: '6 of 10 done' },
  { id: 't3', projectId: 'sec', title: 'Write up Blackfield once rooted', status: 'todo' },
  { id: 't4', projectId: 'body', title: 'Deload week', due: '2026-10-05', status: 'todo' },
  { id: 't5', projectId: 'oscp', title: 'Book exam slot', status: 'done' },
];

export const milestones: { label: string; done: boolean }[] = [
  { label: 'Course material complete', done: true },
  { label: 'Buffer overflow chapter', done: true },
  { label: '10 PG Practice boxes', done: false },
  { label: 'Active Directory set', done: false },
  { label: 'First full practice exam', done: false },
  { label: 'Report template ready', done: false },
  { label: 'Second practice exam', done: false },
  { label: 'Exam booked & passed', done: false },
];

// Saved statistics — the "advanced tier". Each is an expression evaluated over
// entries. Shown here with precomputed results to illustrate the idea.
export const savedStats: SavedStat[] = [
  { id: 's1', name: 'Rooted boxes', expr: 'count(sec.lab-attempt where rooted == true)', result: '', detail: '' },
  { id: 's2', name: 'Clean finishers', expr: 'pct(body.finisher where clean == true)', result: '', detail: '' },
  { id: 's3', name: 'Avg lab length (min)', expr: 'avg(sec.durationMin)', result: '', detail: '' },
];
