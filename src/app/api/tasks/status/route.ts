import { z } from "zod";
import { update } from "@/lib/db";
import { loadLab } from "@/lib/lab";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({ taskId: z.string(), status: z.enum(["open", "done"]) });

// The professor ticks a task done (or reopens it) from the project page.
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const lab = await loadLab(session.labId);
  if (!lab.tasks.some((t) => t.id === body.data.taskId)) return Response.json({ error: "Task not found" }, { status: 404 });
  await update("tasks", body.data.taskId, { status: body.data.status });
  return Response.json({ ok: true });
}
