import { z } from "zod";
import { insert, list, remove } from "@/lib/db";
import { dbMessage } from "@/lib/errors";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const Add = z.object({
  op: z.literal("add"),
  title: z.string().trim().min(1).max(120),
  projectId: z.string().nullable(),
  weekday: z.number().int().min(0).max(6).nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  minutes: z.number().int().min(15).max(480),
  place: z.string().trim().max(200).nullable(),
});
const Del = z.object({ op: z.literal("delete"), id: z.string() });
const Body = z.discriminatedUnion("op", [Add, Del]).refine((b) => b.op === "delete" || (b.weekday === null) !== (b.date === null), { message: "Pick a weekday or a date" });

// Add or delete a project meeting. Only the professor's own lab.
async function handle(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Add a title, a time, and either a weekday or a date" }, { status: 400 });
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const b = body.data;
  if (b.op === "delete") {
    const m = (await list("meetings", { col: "id", eq: b.id }))[0];
    if (!m || m.lab_id !== session.labId) return Response.json({ error: "Meeting not found" }, { status: 404 });
    await remove("meetings", m.id);
    return Response.json({ ok: true });
  }
  if (b.projectId && !(await list("projects", { col: "id", eq: b.projectId })).some((p) => p.lab_id === session.labId)) return Response.json({ error: "Project not found" }, { status: 404 });
  await insert("meetings", { lab_id: session.labId, project_id: b.projectId, title: b.title, weekday: b.weekday, on_date: b.date, starts: b.time, duration_min: b.minutes, place: b.place || null, created_at: new Date().toISOString() });
  return Response.json({ ok: true });
}

export async function POST(...args: Parameters<typeof handle>) {
  try {
    return await handle(...args);
  } catch (e) {
    return Response.json({ error: dbMessage(e) }, { status: 500 });
  }
}
