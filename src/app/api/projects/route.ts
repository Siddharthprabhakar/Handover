import { z } from "zod";
import { getSession } from "@/lib/session";
import { insert } from "@/lib/db";
import { loadLab } from "@/lib/lab";
import { phaseOneCheck } from "@/lib/limits";
import { loadsOf } from "@/lib/loads";

export const dynamic = "force-dynamic";

const Body = z.object({
  kind: z.enum(["lab", "thesis"]),
  name: z.string().min(1).max(120),
  goal: z.string().max(2000).default(""),
  deadline: z.string().max(40).default(""),
  people: z.array(z.string()).max(12),
  plan: z.object({
    phases: z
      .array(z.object({ name: z.string().min(1), tasks: z.array(z.object({ title: z.string().min(1).max(200), hours: z.number().min(0).max(200), owner: z.string().nullable() })).max(12) }))
      .length(7),
  }),
});

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid project" }, { status: 400 });
  const { kind, name, goal, deadline, people, plan } = body.data;
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const lab = await loadLab(session.labId);

  // the workload rule is enforced here, not only in the preview
  const over = phaseOneCheck(plan, loadsOf(lab));
  if (over.length) {
    return Response.json(
      { error: `${over.map((o) => o.detail).join(" ")} Reassign those tasks first.`, over },
      { status: 409 },
    );
  }

  const byName = new Map(lab.ras.map((p) => [p.name, p.id]));
  const project = await insert("projects", { lab_id: session.labId, name, kind, goal: goal || null, phase_template: plan.phases.map((p) => p.name), current_phase: 1, deadline: deadline || null });
  const memberIds = new Set([...people.filter((id) => lab.ras.some((r) => r.id === id)), ...plan.phases.flatMap((p) => p.tasks.map((t) => (t.owner ? byName.get(t.owner) : undefined)).filter((x): x is string => Boolean(x)))]);
  for (const person_id of memberIds) await insert("project_members", { project_id: project.id, person_id });
  for (const [i, phase] of plan.phases.entries()) {
    for (const t of phase.tasks) {
      await insert("tasks", { project_id: project.id, phase: i + 1, title: t.title, est_hours: t.hours, assignee: i === 0 && t.owner ? (byName.get(t.owner) ?? null) : null, status: "open", due: null });
    }
  }
  return Response.json({ ok: true, id: project.id });
}
