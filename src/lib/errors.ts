/** A message a person can act on when a database write fails. A missing column almost always means a supabase/schema_vN.sql file has not been run yet. */
export function dbMessage(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/column|schema cache/i.test(m)) return "The database is missing a recent update. Open the Supabase SQL Editor, run the newest supabase/schema_v*.sql files (v5, v6 and v7), then try again.";
  return `Something went wrong saving that. ${m.slice(0, 160)}`;
}
