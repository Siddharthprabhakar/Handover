import { after } from "next/server";
import { z } from "zod";
import { list, recordings, update } from "@/lib/db";
import { suggestFiling } from "@/lib/filing";
import { findFile, resolveAccess } from "@/lib/files";
import { MAX_SEC, toText, transcribe } from "@/lib/transcribe";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // transcription runs after the response is sent

const Body = z.object({ id: z.string(), token: z.string().optional() });

// Step 2: the audio is in storage; read it in the background and save the transcript. The page polls /api/files/status.
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const access = await resolveAccess(body.data.token);
  if (!access) return Response.json({ error: "Sign in required" }, { status: 401 });
  const file = await findFile(body.data.id, access);
  if (!file || !recordings) return Response.json({ error: "Not found" }, { status: 404 });

  // no early return when already transcribing: a job killed by a timeout leaves that status behind, and "Try again" must be able to restart it
  await update("files", file.id, { status: "transcribing", error: null });
  after(async () => {
    try {
      const { data, error } = await recordings!.download(file.storage_path);
      if (error || !data) throw new Error("The audio did not upload");
      // the browser's claimed size is not trusted: a 16 kHz mono WAV is 32,000 bytes a second
      if (data.size > MAX_SEC * 32_000 + 1024) throw new Error(`The audio is longer than ${Math.round(MAX_SEC / 60)} minutes`);
      const turns = await transcribe(await data.arrayBuffer(), file.kind !== "voice_checkin");
      const text = toText(turns);
      await update("files", file.id, { status: "ready", transcript: turns, transcript_text: text });
      // not filed under a study yet: let Muse suggest one. It never moves anything, and a failure here must not undo the transcript.
      if (!file.project_id) {
        try {
          const projects = (await list("projects", { col: "lab_id", eq: file.lab_id })).map((p) => ({ id: p.id, name: p.name, goal: p.goal, questions: p.research_questions ?? [] }));
          const mine = file.person_id ? (await list("project_members", { col: "person_id", eq: file.person_id })).map((m) => m.project_id) : [];
          const suggestion = await suggestFiling({ ...file, transcript_text: text }, projects, mine);
          if (suggestion) await update("files", file.id, { suggestion });
        } catch (e) {
          console.error("Filing suggestion failed:", e instanceof Error ? e.message : e);
        }
      }
    } catch (e) {
      console.error("Transcription failed:", e instanceof Error ? e.message : e);
      await update("files", file.id, { status: "failed", error: e instanceof Error ? e.message.slice(0, 300) : "Transcription failed" });
    }
  });
  return Response.json({ ok: true });
}
