import { dbMessage } from "@/lib/errors";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { insert } from "@/lib/db";
import { loadLab } from "@/lib/lab";
import { phaseOneCheck } from "@/lib/limits";
import { loadsOf } from "@/lib/loads";

export const dynamic = "force-dynamic";

const MAX_PHASES = 12;

const Body = z.object({
  kind: z.enum(["lab", "thesis"]),
  name: z.string().min(1).max(120),
  goal: z.string().max(2000).default(""),
  deadline: z.string().max(40).default(""),
  people: z.array(z.string()).max(12),
  current: z.number().int().min(1).default(1),
  notes: z.object({ resources: z.array(z.string().max(300)).max(30), communication: z.array(z.string().max(300)).max(30) }).nullish(),
  plan: z.object({
    phases: z
      .array(z.object({
        name: z.string().trim().min(1).max(80),
        due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
        tasks: z.array(z.object({ title: z.string().min(1).max(200), hours: z.number().min(0).max(200), owner: z.string().nullable() })).max(12),
      }))
      .min(1)
      .max(MAX_PHASES),
  }),
});

async function handle(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid project" }, { status: 400 });
  const { kind, name, goal, deadline, people, plan, notes } = body.data;
  const current = Math.min(body.data.current, plan.phases.length);
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const lab = await loadLab(session.labId);

  // the workload rule is enforced here, not only in the preview: tasks in the phase the project starts in are assigned now
  const over = phaseOneCheck({ phases: [plan.phases[current - 1]] }, loadsOf(lab));
  if (over.length) {
    return Response.json(
      { error: `${over.map((o) => o.detail).join(" ")} Reassign those tasks first.`, over },
      { status: 409 },
    );
  }

  const byName = new Map(lab.ras.map((p) => [p.name, p.id]));
  const project = await insert("projects", {
    lab_id: session.labId, name, kind, goal: goal || null, phase_template: plan.phases.map((p) => p.name), current_phase: current, deadline: deadline || null,
    phase_due: plan.phases.map((p) => p.due ?? null), notes: notes ?? null,
  });
  const memberIds = new Set([...people.filter((id) => lab.ras.some((r) => r.id === id)), ...plan.phases.flatMap((p) => p.tasks.map((t) => (t.owner ? byName.get(t.owner) : undefined)).filter((x): x is string => Boolean(x)))]);
  for (const person_id of memberIds) await insert("project_members", { project_id: project.id, person_id });
  for (const [i, phase] of plan.phases.entries()) {
    for (const t of phase.tasks) {
      // stages before the starting one are already behind us
      await insert("tasks", { project_id: project.id, phase: i + 1, title: t.title, est_hours: t.hours, assignee: i + 1 === current && t.owner ? (byName.get(t.owner) ?? null) : null, status: i + 1 < current ? "done" : "open", due: null });
    }
  }
  return Response.json({ ok: true, id: project.id });
}

export async function POST(...args: Parameters<typeof handle>) {
  try {
    return await handle(...args);
  } catch (e) {
    return Response.json({ error: dbMessage(e) }, { status: 500 });
  }
}
