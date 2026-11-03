// Workload rules. Pure functions, no AI: the same code runs in the browser preview and on the server.
import { TODAY } from "./demo";
import { fmtDate } from "./format";

export type Window = { starts: string; ends: string };
export type Load = { id: string; name: string; tasks: number; hours: number; maxTasks: number; weeklyHours: number; ot: Window[] };
export type PlanTask = { title: string; hours: number; owner: string | null };
export type PlanData = { phases: { name: string; tasks: PlanTask[] }[] };

export const MAX_OVERTIME_DAYS = 14;
export const RECOVERY_DAYS = 7;

export const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** Overtime in progress, a recovery week after it, or neither. */
export function windowState(ot: Window[], today = TODAY): { kind: "overtime" | "recovery" | "none"; until?: string } {
  for (const w of ot) {
    if (w.starts <= today && today <= w.ends) return { kind: "overtime", until: w.ends };
    if (w.ends < today && today <= addDays(w.ends, RECOVERY_DAYS)) return { kind: "recovery", until: addDays(w.ends, RECOVERY_DAYS) };
  }
  return { kind: "none" };
}

export type Fit = { ok: boolean; kind: "ok" | "overtime" | "cap" | "recovery"; detail: string; tasks: number; hours: number };

/**
 * Can this person take `extraTasks` more tasks worth `extraHours` hours?
 * Overtime lifts the cap until it ends. A recovery week after it blocks new tasks outright.
 */
export function fits(l: Load, extraTasks: number, extraHours: number, today = TODAY): Fit {
  const first = l.name.split(" ")[0];
  const tasks = l.tasks + extraTasks;
  const hours = l.hours + extraHours;
  const st = windowState(l.ot, today);
  if (st.kind === "recovery") return { ok: false, kind: "recovery", detail: `${first} is in a recovery week until ${fmtDate(st.until!)}. New tasks are paused.`, tasks, hours };
  if (st.kind === "overtime") return { ok: true, kind: "overtime", detail: `${first} is on overtime until ${fmtDate(st.until!)}.`, tasks, hours };
  if (tasks > l.maxTasks || hours > l.weeklyHours) {
    return { ok: false, kind: "cap", detail: `${first} would reach ${hours} of ${l.weeklyHours} hours and ${tasks} of ${l.maxTasks} tasks.`, tasks, hours };
  }
  return { ok: true, kind: "ok", detail: "", tasks, hours };
}

export type LoadCheck = Fit & { id: string; name: string };

/**
 * Only phase 1 tasks are assigned when a project is created, so only they count against weekly limits.
 * Later phases are assigned when they start.
 */
export function phaseOneCheck(plan: PlanData, loads: Load[], today = TODAY): LoadCheck[] {
  const first = plan.phases[0]?.tasks ?? [];
  return loads
    .map((l) => {
      const mine = first.filter((t) => t.owner === l.name);
      return { id: l.id, name: l.name, mine: mine.length, ...fits(l, mine.length, mine.reduce((s, t) => s + (Number(t.hours) || 0), 0), today) };
    })
    .filter((c) => c.mine > 0 && !c.ok)
    .map((c) => ({ id: c.id, name: c.name, ok: c.ok, kind: c.kind, detail: c.detail, tasks: c.tasks, hours: c.hours }));
}

/** Someone else with room for this task, most spare hours first. */
export function suggestOthers(loads: Load[], exceptId: string, hours: number, today = TODAY): Load[] {
  return loads
    .filter((l) => l.id !== exceptId && fits(l, 1, hours, today).ok && windowState(l.ot, today).kind === "none")
    .sort((a, b) => b.weeklyHours - b.hours - (a.weeklyHours - a.hours));
}
