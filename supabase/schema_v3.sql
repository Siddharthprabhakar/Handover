-- Handover schema v3: Files (voice check-ins, interviews, uploads).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run twice.

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references labs(id) on delete cascade,
  kind text not null check (kind in ('voice_checkin', 'interview', 'upload')),
  person_id uuid references people(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  checkin_id uuid references checkins(id) on delete set null,
  title text not null default 'Untitled recording',
  storage_path text not null,
  duration_sec integer,
  size_bytes integer,
  consent boolean not null default false,
  participant_label text,
  transcript jsonb,
  transcript_text text,
  analysis jsonb,
  status text not null default 'uploaded' check (status in ('uploaded', 'transcribing', 'ready', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists files_lab_created on files (lab_id, created_at desc);

-- Same rule as the other tables: RLS on, no policies. Only the server (service role) reads and writes.
alter table files enable row level security;

-- Private bucket for the audio. Playback uses short-lived signed links made by the server.
-- 12 MB covers 5 minutes of 16 kHz mono WAV (about 9.6 MB). Raise it if you raise FILES_MAX_SEC (10 minutes needs 20 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recordings', 'recordings', false, 12582912, array['audio/wav', 'audio/x-wav', 'audio/wave'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
