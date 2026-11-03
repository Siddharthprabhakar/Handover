-- Handover schema v11: who signed up for each study, and Muse's suggestion for where a recording belongs.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run twice.

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references labs on delete cascade,
  project_id uuid not null references projects on delete cascade,
  label text not null, -- "P1": a label, never a real name
  status text not null default 'signed_up' check (status in ('signed_up', 'scheduled', 'withdrew')),
  created_at timestamptz not null default now(),
  unique (project_id, label)
);
alter table participants enable row level security;

alter table files add column if not exists suggestion jsonb; -- { project_id, title, reason }
