import { z } from "zod";
import { loadLab } from "@/lib/lab";
import { museJson } from "@/lib/muse";
import { summaryPrompt } from "@/lib/prompts";
import { getSession } from "@/lib/session";
import { heuristicSummary, summaryContext } from "@/lib/summary";

export const dynamic = "force-dynamic";

const Body = z.object({ projectId: z.string() });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const lab = await loadLab(session.labId);
  if (!lab.projects.some((p) => p.id === body.data.projectId)) return Response.json({ error: "Project not found" }, { status: 404 });
  const ctx = summaryContext(lab, body.data.projectId);
  try {
    return Response.json({ summary: await museJson("summary", summaryPrompt(ctx), heuristicSummary(ctx)) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Muse failed" }, { status: 502 });
  }
}
