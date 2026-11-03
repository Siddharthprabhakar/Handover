import { z } from "zod";
import { insert } from "@/lib/db";
import { loadLab } from "@/lib/lab";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({ projectId: z.string(), personId: z.string() });

// Put someone from the lab on a project so they are asked about it in their weekly check-in.
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const lab = await loadLab(session.labId);
  const { projectId, personId } = body.data;
  if (!lab.projects.some((p) => p.id === projectId)) return Response.json({ error: "Project not found" }, { status: 404 });
  if (!lab.ras.some((p) => p.id === personId)) return Response.json({ error: "Person not found" }, { status: 404 });
  if (lab.members.some((m) => m.project_id === projectId && m.person_id === personId)) return Response.json({ ok: true });
  await insert("project_members", { project_id: projectId, person_id: personId });
  return Response.json({ ok: true });
}
