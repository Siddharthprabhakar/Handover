-- Handover schema v9: calendar links a professor pastes in (Canvas, Google Calendar, Outlook), read-only.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run twice.

create table if not exists calendar_links (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references labs on delete cascade,
  person_id uuid not null references people on delete cascade,
  label text not null default 'Calendar',
  url text not null, -- a secret feed address: treat like a password, never show it back in full
  created_at timestamptz not null default now()
);
alter table calendar_links enable row level security;
