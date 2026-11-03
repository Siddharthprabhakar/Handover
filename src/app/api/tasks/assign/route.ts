import { z } from "zod";
import { getSession } from "@/lib/session";
import { insert } from "@/lib/db";
import { TODAY } from "@/lib/demo";
import { loadLab } from "@/lib/lab";
import { MAX_OVERTIME_DAYS, addDays, daysBetween, fits, suggestOthers } from "@/lib/limits";
import { loadsOf } from "@/lib/loads";

export const dynamic = "force-dynamic";

const Body = z.object({
  personId: z.string(),
  projectId: z.string(),
  phase: z.number().int().min(1).max(7),
  title: z.string().min(1).max(200),
  hours: z.number().min(0.5).max(60),
  // the only way past the weekly cap: a reason and a date, up to two weeks
  overtime: z.object({ reason: z.string().min(3).max(300), ends: z.string() }).optional(),
});

const err = (message: string, extra: object = {}, status = 409) => Response.json({ error: message, ...extra }, { status });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Add a task name, hours and a person" }, { status: 400 });
  const { personId, projectId, phase, title, hours, overtime } = body.data;

  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const lab = await loadLab(session.labId);
  const loads = loadsOf(lab);
  const person = loads.find((l) => l.id === personId);
  if (!person) return Response.json({ error: "Person not found" }, { status: 404 });
  if (!lab.projects.some((p) => p.id === projectId)) return Response.json({ error: "Project not found" }, { status: 404 });

  let fit = fits(person, 1, hours);
  if (fit.kind === "recovery" || fit.kind === "hardcap") return err(fit.detail, { kind: fit.kind, others: suggestOthers(loads, personId, hours).map((o) => o.name) });

  if (!fit.ok) {
    if (!overtime) return err(fit.detail, { kind: "cap", others: suggestOthers(loads, personId, hours).map((o) => o.name) });
    const days = daysBetween(TODAY, overtime.ends);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(overtime.ends) || days < 0 || days > MAX_OVERTIME_DAYS) {
      return err(`Overtime can run up to ${MAX_OVERTIME_DAYS} days. Pick an end date by ${addDays(TODAY, MAX_OVERTIME_DAYS)}.`, { kind: "overtime-range" });
    }
    await insert("overtime", { person_id: personId, reason: overtime.reason.trim(), starts: TODAY, ends: overtime.ends });
    fit = { ...fit, ok: true, kind: "overtime" };
  }

  // a person with a task on a project is a member of it
  if (!lab.members.some((m) => m.project_id === projectId && m.person_id === personId)) await insert("project_members", { project_id: projectId, person_id: personId });
  const task = await insert("tasks", { project_id: projectId, phase, title: title.trim(), est_hours: hours, assignee: personId, status: "open", due: null });
  return Response.json({ ok: true, id: task.id, overtime: fit.kind === "overtime" });
}
