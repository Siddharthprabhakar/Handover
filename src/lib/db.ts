import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { seed, type Tables } from "./seed";

type TableName = keyof Tables;
type Row<K extends TableName> = Tables[K][number];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const usingSupabase = Boolean(url && key);

const sb: SupabaseClient | null = usingSupabase
  ? createClient(url!, key!, { auth: { persistSession: false } })
  : null;

// shortcut: without Supabase env vars the app runs on in-memory seed data that resets on restart.
const g = globalThis as { __handoverMem?: Tables };
const mem: Tables = (g.__handoverMem ??= structuredClone(seed));

export async function list<K extends TableName>(t: K): Promise<Tables[K]> {
  if (!sb) return structuredClone(mem[t]);
  const { data, error } = await sb.from(t).select("*");
  if (error) throw new Error(`list ${t}: ${error.message}`);
  return data as Tables[K];
}

export async function insert<K extends TableName>(t: K, row: Omit<Row<K>, "id"> & { id?: string }): Promise<Row<K>> {
  if (!sb) {
    const full = { id: crypto.randomUUID(), ...row } as Row<K>;
    (mem[t] as Row<K>[]).push(full);
    return structuredClone(full);
  }
  const { data, error } = await sb.from(t).insert(row).select().single();
  if (error) throw new Error(`insert ${t}: ${error.message}`);
  return data as Row<K>;
}

export async function update<K extends TableName>(t: K, id: string, patch: Partial<Row<K>>): Promise<void> {
  if (!sb) {
    const r = (mem[t] as (Row<K> & { id: string })[]).find((x) => x.id === id);
    if (!r) throw new Error(`update ${t}: ${id} not found`);
    Object.assign(r, patch);
    return;
  }
  const { error } = await sb.from(t).update(patch as never).eq("id", id);
  if (error) throw new Error(`update ${t}: ${error.message}`);
}

// used by `npm run seed`
export async function seedSupabase() {
  if (!sb) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  const order: TableName[] = ["people", "projects", "project_members", "tasks", "checkins", "blockers", "overtime", "handoffs", "digests"];
  for (const t of order) {
    if (!seed[t].length) continue;
    const { error } = await sb.from(t).upsert(seed[t] as never[]);
    if (error) throw new Error(`seed ${t}: ${error.message}`);
  }
}
