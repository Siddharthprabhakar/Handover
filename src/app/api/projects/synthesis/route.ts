import { z } from "zod";
import { list, update } from "@/lib/db";
import { dbMessage } from "@/lib/errors";
import { loadLab } from "@/lib/lab";
import { museJson } from "@/lib/muse";
import { synthesisPrompt } from "@/lib/prompts";
import { getSession } from "@/lib/session";
import { groundSynthesis, heuristicSynthesis, interviewsOf, type StoredSynthesis } from "@/lib/synthesis";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const Body = z.object({ projectId: z.string() });

// Muse reads every transcript in the study and proposes themes. Code then keeps only the quotes that really appear in the transcripts and counts the participants behind each research question.
async function handle(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const project = (await loadLab(session.labId)).projects.find((p) => p.id === body.data.projectId);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const interviews = interviewsOf((await list("files", { col: "lab_id", eq: session.labId })).filter((f) => f.project_id === project.id));
  if (!interviews.length) return Response.json({ error: "Record or upload an interview for this study first, and wait for its transcript." }, { status: 409 });
  const rqs = project.research_questions ?? [];

  try {
    const raw = await museJson("synthesis", synthesisPrompt({ name: project.name, goal: project.goal }, rqs, interviews), heuristicSynthesis(rqs, interviews));
    const result: StoredSynthesis = { ...groundSynthesis(raw, interviews, rqs.length), at: new Date().toISOString(), based_on: interviews.length };
    await update("projects", project.id, { synthesis: result });
    return Response.json({ synthesis: result });
  } catch (e) {
    return Response.json({ error: e instanceof Error && /column/i.test(e.message) ? dbMessage(e) : (e instanceof Error ? e.message : "Muse failed") }, { status: 502 });
  }
}

export async function POST(...args: Parameters<typeof handle>) {
  try {
    return await handle(...args);
  } catch (e) {
    return Response.json({ error: dbMessage(e) }, { status: 500 });
  }
}
