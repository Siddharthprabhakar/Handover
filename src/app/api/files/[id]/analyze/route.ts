import { list, update } from "@/lib/db";
import { groundedThemes, heuristicAnalysis } from "@/lib/analysis";
import { findFile, resolveAccess } from "@/lib/files";
import { museJson } from "@/lib/muse";
import { interviewPrompt } from "@/lib/prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await resolveAccess();
  if (!access) return Response.json({ error: "Sign in required" }, { status: 401 });
  const file = await findFile((await ctx.params).id, access);
  if (!file) return Response.json({ error: "Not found" }, { status: 404 });
  if (!file.transcript_text) return Response.json({ error: "Wait for the transcript first" }, { status: 409 });
  const project = file.project_id ? (await list("projects", { col: "id", eq: file.project_id }))[0]?.name ?? null : null;
  try {
    const text = file.transcript_text.slice(0, 40_000);
    const analysis = groundedThemes(await museJson("interview", interviewPrompt(text, { title: file.title, project }), heuristicAnalysis(text)), text);
    await update("files", file.id, { analysis });
    return Response.json({ analysis });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Muse failed" }, { status: 502 });
  }
}
