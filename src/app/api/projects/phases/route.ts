import { dbMessage } from "@/lib/errors";
import { z } from "zod";
import { update } from "@/lib/db";
import { loadLab } from "@/lib/lab";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({
  projectId: z.string(),
  phases: z.array(z.object({ name: z.string().trim().min(1).max(80), due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() })).min(1).max(12),
});

// Rename phases, set their due dates, add one at the end, or drop the last one. Tasks and blockers point at a phase by its number, so only the end of the list can change length.
async function handle(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Every phase needs a name, and a project can have 1 to 12 phases" }, { status: 400 });
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const lab = await loadLab(session.labId);
  const project = lab.projects.find((p) => p.id === body.data.projectId);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const { phases } = body.data;
  if (phases.length < project.current_phase) return Response.json({ error: "You cannot remove the phase the project is in, or one before it" }, { status: 409 });
  for (let n = phases.length + 1; n <= project.phase_template.length; n++) {
    if (lab.tasks.some((t) => t.project_id === project.id && t.phase === n)) return Response.json({ error: `"${project.phase_template[n - 1]}" still has tasks. Delete or move them first.` }, { status: 409 });
  }
  await update("projects", project.id, { phase_template: phases.map((p) => p.name), phase_due: phases.map((p) => p.due) });
  return Response.json({ ok: true });
}

export async function POST(...args: Parameters<typeof handle>) {
  try {
    return await handle(...args);
  } catch (e) {
    return Response.json({ error: dbMessage(e) }, { status: 500 });
  }
}
