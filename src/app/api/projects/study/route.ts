import { dbMessage } from "@/lib/errors";
import { z } from "zod";
import { update } from "@/lib/db";
import { loadLab } from "@/lib/lab";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({
  projectId: z.string(),
  irbStatus: z.enum(["pending", "approved", "exempt"]).nullable(),
  irbRef: z.string().trim().max(60).nullable(),
  irbDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  target: z.number().int().min(1).max(500).nullable(),
  questions: z.array(z.string().trim().min(1).max(300)).max(8).default([]),
});

// Ethics review status and how many participants the study needs. Plain records: Handover tracks them, the university's IRB office decides them.
async function handle(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Check the date and the number of participants" }, { status: 400 });
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const b = body.data;
  if (!(await loadLab(session.labId)).projects.some((p) => p.id === b.projectId)) return Response.json({ error: "Project not found" }, { status: 404 });
  await update("projects", b.projectId, { irb_status: b.irbStatus, irb_ref: b.irbRef || null, irb_date: b.irbDate, participant_target: b.target, research_questions: b.questions });
  return Response.json({ ok: true });
}

export async function POST(...args: Parameters<typeof handle>) {
  try {
    return await handle(...args);
  } catch (e) {
    return Response.json({ error: dbMessage(e) }, { status: 500 });
  }
}
