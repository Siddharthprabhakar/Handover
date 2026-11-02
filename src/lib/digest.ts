import type { z } from "zod";
import { museJson } from "./muse";
import { digestPrompt } from "./prompts";
import type { Digest } from "./schemas";
import type { Lab } from "./lab";

export type DigestResult = z.infer<typeof Digest>;

// shortcut: in-memory cache so every page load does not call Muse. Resets on restart; keyed by the data it summarises.
const g = globalThis as { __digestCache?: Map<string, DigestResult> };
const cache = (g.__digestCache ??= new Map());

export async function getDigest(lab: Lab): Promise<DigestResult> {
  const rows = lab.ras.map((p) => {
    const c = lab.weekCheckins.find((x) => x.person_id === p.id);
    const l = lab.load(p.id);
    return { name: p.name, projects: lab.projectsOf(p.id), checkin: c?.submitted_at ? (c.raw?.text ?? null) : null, reminders: c?.reminders_sent ?? 0, openTasks: l.tasks, hours: l.hours, weeklyHours: p.weekly_hours };
  });
  const blockers = lab.blockers.filter((b) => !b.resolved_at).map((b) => ({
    person: lab.byId.get(b.person_id ?? "")?.name ?? "Unknown",
    project: lab.projects.find((p) => p.id === b.project_id)?.name ?? "",
    quote: b.quote,
  }));
  const key = JSON.stringify([rows, blockers]);
  const hit = cache.get(key);
  if (hit) return hit;
  const result = await museJson("digest", digestPrompt(rows, blockers));
  cache.set(key, result);
  return result;
}
