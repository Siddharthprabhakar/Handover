-- Handover schema v10: research questions per study, and the saved synthesis across interviews.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run twice.

alter table projects add column if not exists research_questions jsonb not null default '[]'::jsonb;
alter table projects add column if not exists synthesis jsonb;
