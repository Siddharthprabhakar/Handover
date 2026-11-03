-- Handover schema v7: due dates per phase, and notes taken from an imported project plan.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run twice.

-- one entry per phase, in order: "YYYY-MM-DD" or null
alter table projects add column if not exists phase_due jsonb not null default '[]'::jsonb;
-- { "resources": [...], "communication": [...] } read from a Word or Excel plan
alter table projects add column if not exists notes jsonb;
