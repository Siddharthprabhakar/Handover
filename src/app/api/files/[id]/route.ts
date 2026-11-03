import { z } from "zod";
import { list, recordings, remove, update } from "@/lib/db";
import { findFile, resolveAccess } from "@/lib/files";
import { toText } from "@/lib/transcribe";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const Patch = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  projectId: z.string().nullable().optional(),
  participantLabel: z.string().trim().max(60).optional(),
  suggestion: z.null().optional(), // dismiss or accept: clears Muse's suggestion
  turns: z.array(z.object({ speaker: z.string().max(60).nullable(), text: z.string().max(20000) })).max(2000).optional(),
});

async function professorFile(ctx: Ctx) {
  const access = await resolveAccess();
  if (!access) return { error: Response.json({ error: "Sign in required" }, { status: 401 }) };
  const file = await findFile((await ctx.params).id, access);
  return file ? { access, file } : { error: Response.json({ error: "Not found" }, { status: 404 }) };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const found = await professorFile(ctx);
  if ("error" in found) return found.error;
  const body = Patch.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const b = body.data;
  if (b.projectId && !(await list("projects", { col: "id", eq: b.projectId })).some((p) => p.lab_id === found.access.labId)) return Response.json({ error: "Project not found" }, { status: 404 });
  await update("files", found.file.id, {
    ...(b.title ? { title: b.title } : {}),
    ...(b.projectId !== undefined ? { project_id: b.projectId } : {}),
    ...(b.participantLabel !== undefined ? { participant_label: b.participantLabel || null } : {}),
    ...(b.suggestion === null ? { suggestion: null } : {}),
    ...(b.turns ? { transcript: b.turns, transcript_text: toText(b.turns), analysis: null } : {}), // an edited transcript makes the old analysis stale
  });
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const found = await professorFile(ctx);
  if ("error" in found) return found.error;
  // keep the row if the audio could not be removed, so the file is not left behind with nothing pointing to it
  const { error } = (await recordings?.remove([found.file.storage_path])) ?? {};
  if (error) return Response.json({ error: "Could not delete the audio. Try again." }, { status: 502 });
  await remove("files", found.file.id);
  return Response.json({ ok: true });
}
