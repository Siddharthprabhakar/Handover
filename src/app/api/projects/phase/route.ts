import { z } from "zod";
import { update } from "@/lib/db";
import { loadLab } from "@/lib/lab";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({ projectId: z.string(), to: z.number().int().min(1).max(12) });

// A person decides when a project moves on. The task list only suggests it. One step at a time, and every move is logged with who made it.
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const project = (await loadLab(session.labId)).projects.find((p) => p.id === body.data.projectId);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  const { to } = body.data;
  if (to > project.phase_template.length || Math.abs(to - project.current_phase) !== 1) return Response.json({ error: "A project moves one phase at a time" }, { status: 400 });
  const log = [...(project.phase_log ?? []), { from: project.current_phase, to, by: session.name, at: new Date().toISOString() }];
  await update("projects", project.id, { current_phase: to, phase_log: log });
  return Response.json({ ok: true });
}
