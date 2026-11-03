-- Clears everything in the app EXCEPT the professor account(s) and their labs, so you can sign in and click "Load demo lab".
-- Paste into the Supabase SQL editor. Deleting is permanent. Uploaded audio files in Storage are not touched here
-- (empty the "recordings" bucket in Storage > recordings if you uploaded real ones).
-- Tables from newer updates (v3, v8, v9, v11) are skipped if you have not created them yet.

do $$
declare t text;
begin
  foreach t in array array['files', 'participants', 'meetings', 'calendar_links', 'digests', 'handoffs'] loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from %I', t);
    end if;
  end loop;
end $$;

delete from projects;                          -- also removes tasks, members and blockers
delete from people where role <> 'professor';  -- also removes check-ins and overtime
