-- Handover schema v5: which program someone is in (PhD, Master's, ...).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run twice.

alter table people add column if not exists program text;
