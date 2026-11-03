import { loadLab } from "@/lib/lab";
import { MAX_UPLOAD_BYTES, extractText } from "@/lib/docs";
import { heuristicImport } from "@/lib/import";
import { museJson } from "@/lib/muse";
import { projectPlanPrompt } from "@/lib/prompts";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Reads an uploaded Word, Excel or text plan and returns a draft project for the professor to review. Nothing is created and the file is not kept.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a file first" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "That file is over 4 MB. Save a smaller copy and try again." }, { status: 413 });

  try {
    const text = await extractText(file.name, Buffer.from(await file.arrayBuffer()));
    const lab = await loadLab(session.labId);
    const today = new Date().toISOString().slice(0, 10);
    const draft = await museJson("projectplan", projectPlanPrompt(text, { today, people: lab.ras.map((r) => r.name) }), heuristicImport(text, today.slice(0, 4)));
    if (!draft.phases.length) return Response.json({ error: "Muse could not find any stages in that document. Describe the goal instead." }, { status: 422 });
    draft.phases = draft.phases.slice(0, 12);
    const names = new Set(lab.ras.map((r) => r.name));
    for (const p of draft.phases) for (const t of p.tasks) if (t.owner && !names.has(t.owner)) t.owner = null; // only real people
    return Response.json({ draft });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Could not read that file" }, { status: 422 });
  }
}
