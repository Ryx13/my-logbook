-- Logbook schema. Run this in the Supabase SQL editor (or via the CLI) once,
-- against your project. Every table is owned per-user and locked down with
-- row-level security, so a signed-in person can only ever see their own rows.

-- Projects --------------------------------------------------------------------
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  description text default '',
  color       int  not null default 1,
  archived    boolean not null default false,
  sort        int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Entry formats (versioned) ---------------------------------------------------
create table if not exists formats (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  project_id  uuid not null references projects on delete cascade,
  name        text not null,
  version     int  not null default 1,
  title_field text not null default '',
  timed       boolean not null default true,
  fields      jsonb not null default '[]',
  history     jsonb not null default '[]',
  sort        int  not null default 0
);

-- Entries (the record) --------------------------------------------------------
create table if not exists entries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  project_id     uuid not null references projects on delete cascade,
  format_id      uuid not null references formats on delete cascade,
  format_version int  not null default 1,
  at             timestamptz not null default now(),
  duration_min   int  not null default 0,
  values         jsonb not null default '{}',
  revisions      int  not null default 0
);
create index if not exists entries_user_at on entries (user_id, at desc);

-- Habits (editable) -----------------------------------------------------------
create table if not exists habits (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users on delete cascade,
  grp       text not null,                 -- 'sec' | 'body' | 'mind' | 'life'
  section   text default '',
  label     text not null,
  detail    text default '',
  days      int[] not null default '{0,1,2,3,4,5,6}',
  counts    text,                          -- 'mobility' | 'training' | 'sec' | null
  auto_from text[] not null default '{}',
  no_score  boolean not null default false,
  archived  boolean not null default false,
  sort      int not null default 0
);

-- Habit ticks (one per habit per day) -----------------------------------------
create table if not exists ticks (
  user_id  uuid not null references auth.users on delete cascade,
  day      date not null,
  habit_id uuid not null references habits on delete cascade,
  source   text not null default 'hand',   -- 'hand' | 'entry'
  primary key (user_id, day, habit_id)
);

-- Daily mood & sleep ----------------------------------------------------------
create table if not exists daily (
  user_id uuid not null references auth.users on delete cascade,
  day     date not null,
  mood    int,
  sleep   numeric,
  primary key (user_id, day)
);

-- Tasks -----------------------------------------------------------------------
create table if not exists tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  project_id uuid references projects on delete set null,
  title      text not null,
  due        date,
  status     text not null default 'todo', -- 'todo' | 'doing' | 'done'
  note       text default '',
  sort       int not null default 0
);

-- Saved statistics ------------------------------------------------------------
create table if not exists saved_stats (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name    text not null,
  expr    text not null default '',
  sort    int not null default 0
);

-- Reviews ---------------------------------------------------------------------
create table if not exists reviews (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  kind       text not null default 'week', -- 'week' | 'month'
  period     date not null,
  fields     jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Row-level security ----------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['projects','formats','entries','habits','ticks','daily','tasks','saved_stats','reviews']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists own_rows on %I;', t);
    execute format(
      'create policy own_rows on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t
    );
  end loop;
end $$;
