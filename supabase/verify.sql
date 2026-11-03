-- Read-only check that every database update (schema.sql, v3 to v11) has been applied.
-- Paste into the Supabase SQL editor. Every row should say "ok". Any "MISSING" names the update to run.

with need(item, update_file, ok) as (
  select 'table ' || t, f, to_regclass('public.' || t) is not null
  from (values
    ('labs', 'schema.sql'), ('people', 'schema.sql'), ('projects', 'schema.sql'), ('project_members', 'schema.sql'),
    ('tasks', 'schema.sql'), ('checkins', 'schema.sql'), ('blockers', 'schema.sql'), ('overtime', 'schema.sql'),
    ('handoffs', 'schema.sql'), ('digests', 'schema.sql'), ('files', 'schema_v3.sql'), ('meetings', 'schema_v8.sql'),
    ('calendar_links', 'schema_v9.sql'), ('participants', 'schema_v11.sql')
  ) as x(t, f)
  union all
  select 'column ' || t || '.' || c, f,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = c)
  from (values
    ('projects', 'phase_log', 'schema_v4.sql'), ('people', 'program', 'schema_v5.sql'),
    ('projects', 'irb_status', 'schema_v6.sql'), ('projects', 'irb_ref', 'schema_v6.sql'), ('projects', 'irb_date', 'schema_v6.sql'),
    ('projects', 'participant_target', 'schema_v6.sql'), ('projects', 'phase_due', 'schema_v7.sql'), ('projects', 'notes', 'schema_v7.sql'),
    ('labs', 'calendar_token', 'schema_v8.sql'), ('projects', 'research_questions', 'schema_v10.sql'), ('projects', 'synthesis', 'schema_v10.sql'),
    ('files', 'suggestion', 'schema_v11.sql')
  ) as y(t, c, f)
  union all
  select 'storage bucket recordings', 'schema_v3.sql', exists (select 1 from storage.buckets where id = 'recordings' and public = false)
  union all
  select 'row level security on ' || relname, 'schema.sql', relrowsecurity
  from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
)
select item, update_file as "run this file if missing", case when ok then 'ok' else 'MISSING' end as status
from need
order by ok, item;
