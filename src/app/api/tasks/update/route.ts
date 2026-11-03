import { z } from "zod";
import { insert, update } from "@/lib/db";
import { loadLab } from "@/lib/lab";
import { fits, suggestOthers } from "@/lib/limits";
import { loadsOf } from "@/lib/loads";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({
  taskId: z.string(),
  title: z.string().trim().min(1).max(200).optional(),
  hours: z.number().min(0.5).max(60).optional(),
  assignee: z.string().optional(),
});

// Rename a task, change its hours, or hand it to someone else. The same workload limits as a new assignment apply to whoever ends up holding it.
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Check the task name and hours" }, { status: 400 });
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const b = body.data;
  const lab = await loadLab(session.labId);
  const task = lab.tasks.find((t) => t.id === b.taskId);
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  const assignee = b.assignee ?? task.assignee;
  const hours = b.hours ?? Number(task.est_hours);
  const moved = b.assignee !== undefined && b.assignee !== task.assignee;
  if (assignee && (moved || hours !== Number(task.est_hours)) && task.status === "open") {
    const loads = loadsOf(lab);
    const person = loads.find((l) => l.id === assignee);
    if (!person) return Response.json({ error: "Person not found" }, { status: 404 });
    // a task already theirs is counted in their load: take it out before checking the new hours
    const base = assignee === task.assignee ? { ...person, tasks: person.tasks - 1, hours: person.hours - Number(task.est_hours) } : person;
    const fit = fits(base, 1, hours);
    if (!fit.ok) return Response.json({ error: fit.detail, kind: fit.kind, others: suggestOthers(loads, assignee, hours).map((o) => o.name) }, { status: 409 });
  }

  if (moved && assignee && !lab.members.some((m) => m.project_id === task.project_id && m.person_id === assignee)) await insert("project_members", { project_id: task.project_id, person_id: assignee });
  await update("tasks", task.id, { ...(b.title ? { title: b.title } : {}), est_hours: hours, assignee });
  return Response.json({ ok: true });
}
