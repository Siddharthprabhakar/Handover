import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { seed, type Tables } from "./seed";

export type TableName = keyof Tables;
type Row<K extends TableName> = Tables[K][number];
/** Filter by one column: equal to a value, or one of several values. */
export type Where = { col: string; eq?: string; in?: string[] };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const usingSupabase = Boolean(url && key);

// Next.js memoizes identical GET fetches within one render, which would hide our own writes from a re-read.
// Passing an AbortSignal opts out (see the fetch docs, "Memoization").
const freshFetch: typeof fetch = (input, init) => fetch(input, { ...init, signal: init?.signal ?? new AbortController().signal });

const sb: SupabaseClient | null = usingSupabase ? createClient(url!, key!, { auth: { persistSession: false }, global: { fetch: freshFetch } }) : null;

// shortcut: without Supabase env vars the app runs on in-memory demo data that resets on restart.
const g = globalThis as { __handoverMem?: Tables };
const mem: Tables = (g.__handoverMem ??= structuredClone(seed));

const matches = (row: object, w?: Where) => {
  if (!w) return true;
  const v = (row as Record<string, unknown>)[w.col] as string;
  return w.eq !== undefined ? v === w.eq : w.in ? w.in.includes(v) : true;
};

export async function list<K extends TableName>(t: K, where?: Where): Promise<Tables[K]> {
  if (where?.in && where.in.length === 0) return [] as unknown as Tables[K];
  if (!sb) return structuredClone((mem[t] as object[]).filter((r) => matches(r, where))) as Tables[K];
  let q = sb.from(t).select("*");
  if (where?.eq !== undefined) q = q.eq(where.col, where.eq);
  if (where?.in) q = q.in(where.col, where.in);
  const { data, error } = await q;
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

export async function remove<K extends TableName>(t: K, id: string): Promise<void> {
  if (!sb) {
    const rows = mem[t] as { id: string }[];
    const i = rows.findIndex((x) => x.id === id);
    if (i >= 0) rows.splice(i, 1);
    return;
  }
  const { error } = await sb.from(t).delete().eq("id", id);
  if (error) throw new Error(`remove ${t}: ${error.message}`);
}
