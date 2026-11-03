import { dbMessage } from "@/lib/errors";
import { z } from "zod";
import { update } from "@/lib/db";
import { loadLab } from "@/lib/lab";
import { PROGRAMS } from "@/lib/programs";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({ program: z.enum(PROGRAMS).nullable() });

// Set which program someone is in. Only people in the caller's own lab.
async function handle(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await ctx.params;
  if (!(await loadLab(session.labId)).people.some((p) => p.id === id)) return Response.json({ error: "Not found" }, { status: 404 });
  await update("people", id, { program: body.data.program });
  return Response.json({ ok: true });
}

export async function PATCH(...args: Parameters<typeof handle>) {
  try {
    return await handle(...args);
  } catch (e) {
    return Response.json({ error: dbMessage(e) }, { status: 500 });
  }
}
