import type { z } from "zod";
import { museJson } from "./muse";
import { digestPrompt } from "./prompts";
import type { Digest } from "./schemas";
import type { Lab } from "./lab";
import type { Parsed } from "./checkin";

export type DigestResult = z.infer<typeof Digest>;
type Row = { name: string; projects: string[]; checkin: string | null; reminders: number; openTasks: number; hours: number; weeklyHours: number; needsTasks: boolean; support: string[] };
type Blocker = { person: string; project: string; quote: string };

// shortcut: in-memory cache so every page load does not call Muse. Resets on restart; keyed by the data it summarises.
const g = globalThis as { __digestCache?: Map<string, DigestResult> };
const cache = (g.__digestCache ??= new Map());

/** Rule-based digest for mock mode, built from the real data. */
function heuristicDigest(rows: Row[], blockers: Blocker[]): DigestResult {
  const first = (n: string) => n.split(" ")[0];
  const stuck = blockers.map((b) => ({ person: b.person, quote: b.quote }));
  const missing = rows.filter((r) => !r.checkin).map((r) => r.name);
  const needs = rows.filter((r) => r.needsTasks).map((r) => r.name);
  const flagged = new Set([...stuck.map((s) => s.person), ...missing, ...needs]);
  const sentences = [`${rows.length - missing.length} of ${rows.length} check-ins are in.`];
  if (stuck.length) sentences.push(`${[...new Set(stuck.map((s) => first(s.person)))].join(" and ")} reported a blocker${blockers[0] ? ` on ${blockers[0].project}` : ""}.`);
  if (needs.length) sentences.push(`${needs.map(first).join(" and ")} asked for more tasks.`);
  if (missing.length) sentences.push(`${missing.map(first).join(" and ")} has not checked in.`);
  if (sentences.length === 1) sentences.push("Everyone is on track.");
  return {
    summary: sentences.join(" "),
    on_track: rows.filter((r) => !flagged.has(r.name)).map((r) => r.name),
    stuck, needs_tasks: needs, missing,
    support: rows.flatMap((r) => r.support.map((s) => `${s} (${first(r.name)})`)),
  };
}

export async function getDigest(lab: Lab): Promise<DigestResult> {
  const rows: Row[] = lab.ras.map((p) => {
    const c = lab.weekCheckins.find((x) => x.person_id === p.id);
    const l = lab.load(p.id);
    const parsed = (c?.parsed as Parsed | null) ?? null;
    const text = c?.submitted_at ? (c.raw?.text ?? null) : null;
    return {
      name: p.name, projects: lab.projectsOf(p.id), checkin: text, reminders: c?.reminders_sent ?? 0,
      openTasks: l.tasks, hours: l.hours, weeklyHours: p.weekly_hours,
      needsTasks: parsed ? parsed.projects.some((x) => x.needs_tasks) : /need (more )?tasks|no plans/i.test(text ?? ""),
      support: parsed ? parsed.projects.flatMap((x) => x.support) : [],
    };
  });
  const blockers: Blocker[] = lab.blockers.filter((b) => !b.resolved_at).map((b) => ({
    person: lab.byId.get(b.person_id ?? "")?.name ?? "Unknown",
    project: lab.projects.find((p) => p.id === b.project_id)?.name ?? "",
    quote: b.quote,
  }));
  const key = JSON.stringify([rows, blockers]);
  const hit = cache.get(key);
  if (hit) return hit;
  const result = await museJson("digest", digestPrompt(rows, blockers), heuristicDigest(rows, blockers));
  cache.set(key, result);
  return result;
}
