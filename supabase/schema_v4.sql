-- Handover schema v4: who moved a project to the next phase, and when.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run twice.

alter table projects add column if not exists phase_log jsonb not null default '[]'::jsonb;
