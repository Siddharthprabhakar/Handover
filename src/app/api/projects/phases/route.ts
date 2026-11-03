import { dbMessage } from "@/lib/errors";
import { z } from "zod";
import { update } from "@/lib/db";
import { loadLab } from "@/lib/lab";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({
  projectId: z.string(),
  // `from` is the phase's number before this edit (null for a phase added now); the list order is the new order
  phases: z.array(z.object({ name: z.string().trim().min(1).max(80), due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), from: z.number().int().min(1).nullable() })).min(1).max(12),
});

// Rename, reorder, date, add or remove phases. Tasks, blockers and the current phase point at a phase by number, so they are renumbered to follow their phase. Only an empty phase that is not the current one can be removed.
async function handle(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Every phase needs a name, and a project can have 1 to 12 phases" }, { status: 400 });
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const lab = await loadLab(session.labId);
  const project = lab.projects.find((p) => p.id === body.data.projectId);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const { phases } = body.data;
  const old = project.phase_template.length;
  const toNew = new Map<number, number>(); // old number -> new number
  for (const [i, p] of phases.entries()) {
    if (p.from === null) continue;
    if (p.from > old || toNew.has(p.from)) return Response.json({ error: "The phases changed in another window. Reload the page and try again." }, { status: 409 });
    toNew.set(p.from, i + 1);
  }
  const tasks = lab.tasks.filter((t) => t.project_id === project.id);
  for (let n = 1; n <= old; n++) {
    if (toNew.has(n)) continue;
    if (n === project.current_phase) return Response.json({ error: `The project is in "${project.phase_template[n - 1]}", so it cannot be removed.` }, { status: 409 });
    if (tasks.some((t) => t.phase === n)) return Response.json({ error: `"${project.phase_template[n - 1]}" still has tasks. Delete or move them first.` }, { status: 409 });
  }

  const remap = (n: number) => toNew.get(n) ?? n;
  for (const t of tasks) if (toNew.get(t.phase) !== undefined && toNew.get(t.phase) !== t.phase) await update("tasks", t.id, { phase: toNew.get(t.phase)! });
  for (const b of lab.blockers.filter((x) => x.project_id === project.id)) if (toNew.get(b.phase) !== undefined && toNew.get(b.phase) !== b.phase) await update("blockers", b.id, { phase: toNew.get(b.phase)! });
  await update("projects", project.id, {
    phase_template: phases.map((p) => p.name),
    phase_due: phases.map((p) => p.due),
    current_phase: remap(project.current_phase),
    phase_log: (project.phase_log ?? []).map((l) => ({ ...l, from: remap(l.from), to: remap(l.to) })),
  });
  return Response.json({ ok: true });
}

export async function POST(...args: Parameters<typeof handle>) {
  try {
    return await handle(...args);
  } catch (e) {
    return Response.json({ error: dbMessage(e) }, { status: 500 });
  }
}
