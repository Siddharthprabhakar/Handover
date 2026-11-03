import { z } from "zod";
import { insert, list, remove, update } from "@/lib/db";
import { dbMessage } from "@/lib/errors";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), projectId: z.string(), label: z.string().trim().min(1).max(40), status: z.enum(["signed_up", "scheduled", "withdrew"]).default("signed_up") }),
  z.object({ op: z.literal("status"), id: z.string(), status: z.enum(["signed_up", "scheduled", "withdrew"]) }),
  z.object({ op: z.literal("delete"), id: z.string() }),
]);

// The list of people who signed up for a study, by label only (P1, P2...). Never real names: the labels match the ones on interview recordings.
async function handle(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Add a label such as P4" }, { status: 400 });
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const b = body.data;
  if (b.op === "add") {
    if (!(await list("projects", { col: "id", eq: b.projectId })).some((p) => p.lab_id === session.labId)) return Response.json({ error: "Project not found" }, { status: 404 });
    const mine = await list("participants", { col: "project_id", eq: b.projectId });
    if (mine.some((p) => p.label.toLowerCase() === b.label.toLowerCase())) return Response.json({ error: `${b.label} is already on the list` }, { status: 409 });
    if (mine.length >= 500) return Response.json({ error: "That is the most a study can list" }, { status: 409 });
    await insert("participants", { lab_id: session.labId, project_id: b.projectId, label: b.label, status: b.status, created_at: new Date().toISOString() });
    return Response.json({ ok: true });
  }
  const row = (await list("participants", { col: "id", eq: b.id }))[0];
  if (!row || row.lab_id !== session.labId) return Response.json({ error: "Not found" }, { status: 404 });
  if (b.op === "status") await update("participants", row.id, { status: b.status });
  else await remove("participants", row.id);
  return Response.json({ ok: true });
}

export async function POST(...args: Parameters<typeof handle>) {
  try {
    return await handle(...args);
  } catch (e) {
    return Response.json({ error: dbMessage(e) }, { status: 500 });
  }
}
