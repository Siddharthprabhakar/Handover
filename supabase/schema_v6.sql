-- Handover schema v6: ethics review (IRB) status and a participant target per project.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run twice.

alter table projects add column if not exists irb_status text check (irb_status in ('pending', 'approved', 'exempt'));
alter table projects add column if not exists irb_ref text;
alter table projects add column if not exists irb_date date;
alter table projects add column if not exists participant_target integer check (participant_target > 0);
