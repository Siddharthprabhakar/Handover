-- Handover schema v8: project meetings, and a private calendar feed address per lab.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run twice.

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references labs on delete cascade,
  project_id uuid references projects on delete cascade,
  title text not null,
  weekday int check (weekday between 0 and 6), -- 0 = Monday; set for a weekly meeting
  on_date date,                                  -- set for a one-off meeting
  starts text not null,                          -- "13:30", local time
  duration_min int not null default 60,
  place text,
  created_at timestamptz not null default now(),
  check ((weekday is not null) <> (on_date is not null))
);
alter table meetings enable row level security;

-- the secret in the address Google Calendar or Outlook subscribes to
alter table labs add column if not exists calendar_token text not null default replace(gen_random_uuid()::text, '-', '');
