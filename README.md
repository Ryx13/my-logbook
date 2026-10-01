# Logbook

A personal logbook: projects, custom entry formats, a tick-box habit tracker
(weekly grid, month sheet, and the three non-negotiables), a calendar, tasks,
statistics computed from your entries, and weekly/monthly reviews. Built around
the Operating Protocol (SEC, Body, Mind, Life).

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

Without Supabase keys it runs in **demo mode**: sample data, nothing saved.
Add your keys (below) and it requires sign-in and saves everything.

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Type-check + production build to `dist/` (Netlify deploys this) |
| `npm run build:preview` | One self-contained `dist-preview/index.html` to open directly |
| `npm run typecheck` | Type-check only |

## Making it persistent (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. In the project's **SQL Editor**, paste and run `supabase/migrations/0001_init.sql`.
   That creates every table with row-level security, so each user only sees
   their own rows.
3. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.
4. Create a `.env` file (copy from `.env.example`):

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

5. `npm run dev`, create an account, and your logbook seeds itself with the
   default projects, formats and habits. Everything you do from then on is saved.

Email sign-up confirmation is on by default in Supabase. Turn it off under
**Authentication → Providers → Email** if you want instant sign-up while testing.

## Deploying to Netlify

1. Push this repo to GitHub.
2. In Netlify, **Add new site → Import from GitHub**, pick the repo.
3. Build command `npm run build`, publish directory `dist` (also in `netlify.toml`).
4. **Site settings → Environment variables**: add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (same values as `.env`).
5. In Supabase **Authentication → URL Configuration**, add your Netlify URL to
   the allowed redirect URLs.
6. Deploy.

## Layout

```
supabase/migrations/0001_init.sql   Database schema + row-level security
src/
  lib/
    supabase.ts   Client, built from env vars (demo mode when absent)
    db.ts         Load, seed, and all read/write functions
    stats.ts      The statistics expression language (count/sum/avg/pct…)
    io.ts         Export (JSON + Markdown) and import
    reminders.ts  Browser notification reminders
  data/
    types.ts      Data model
    mock.ts       Default projects/formats + demo sample data
    tracker.ts    Habits, scoring, streaks, the month helpers
    derive.ts     Values computed from entries
  components/      Layout, AuthGate, CaptureSheet, Tracker, MonthSheet, Charts…
  pages/          Today, Tracker, Calendar, Timeline, Projects, FormatEditor,
                  Habits, Tasks, Statistics, Review, Settings
  state.tsx       App state: loads from and writes to Supabase (or in-memory demo)
```

## What's included

- **Persistence** through Supabase, with email/password auth and per-user RLS.
- **Editable habits** — add, rename, reschedule or retire habits in the app (Habits page).
- **Streaks** — current and best run, on Today.
- **Reminders** — a daily browser notification while the app is open (Settings).
- **Statistics engine** — a small, safe expression language over your entries.
- **Export / import** — JSON backup, Markdown copy, and JSON restore (Settings).
- **Charts** — consistency grids, finisher trend, time-per-project bars.

## Later

- Web Push for reminders when the app is closed (needs a service worker + a small server).
- Offline capture with a sync queue (currently online-only).
- Richer per-project statistics and chart types.
