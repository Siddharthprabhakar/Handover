import { z } from "zod";
import { insert, list, recordings } from "@/lib/db";
import { resolveAccess } from "@/lib/files";
import { MAX_SEC, VOICE_CHECKIN_SEC } from "@/lib/transcribe";

export const dynamic = "force-dynamic";

const Body = z.object({
  token: z.string().optional(),
  kind: z.enum(["voice_checkin", "interview", "upload"]),
  title: z.string().trim().max(120).optional(),
  projectId: z.string().nullable().optional(),
  participantLabel: z.string().trim().max(60).optional(),
  consent: z.boolean().default(false),
  size: z.number().int().positive().max(MAX_SEC * 32_000 + 1024),
  durationSec: z.number().positive(),
});

// Step 1 of a recording: make the row and hand back a one-time upload link, so the audio goes straight to storage (Vercel caps request bodies at about 4.5 MB).
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const b = body.data;
  if (!recordings) return Response.json({ error: "Recordings need Supabase. Set it up first." }, { status: 503 });
  const access = await resolveAccess(b.token);
  if (!access) return Response.json({ error: "Sign in required" }, { status: 401 });

  if (!access.professor) {
    if (b.kind !== "voice_checkin") return Response.json({ error: "Not allowed" }, { status: 403 });
    if (access.submitted) return Response.json({ error: "Already submitted" }, { status: 409 });
    // a link is a credential, not an account: cap what it can add before the check-in is sent
    if ((await list("files", { col: "checkin_id", eq: access.checkinId! })).length >= 5) return Response.json({ error: "That is enough recordings for one check-in. Send it, or type instead." }, { status: 429 });
    b.projectId = null; // students do not choose where a recording is filed
  } else if (b.kind === "voice_checkin") {
    return Response.json({ error: "Voice check-ins come from the student link" }, { status: 400 });
  } else if (!b.consent || !b.participantLabel) {
    return Response.json({ error: "Add a participant label and confirm consent first" }, { status: 400 });
  }
  const limit = b.kind === "voice_checkin" ? VOICE_CHECKIN_SEC : MAX_SEC;
  if (b.durationSec > limit + 2) return Response.json({ error: `Recordings can be up to ${Math.round(limit / 60)} minutes` }, { status: 400 });
  if (b.projectId && !(await list("projects", { col: "id", eq: b.projectId })).some((p) => p.lab_id === access.labId)) return Response.json({ error: "Project not found" }, { status: 404 });

  const id = crypto.randomUUID();
  const path = `${access.labId}/${id}.wav`;
  const { data, error } = await recordings.createSignedUploadUrl(path);
  if (error || !data) return Response.json({ error: "Could not prepare the upload" }, { status: 502 });
  await insert("files", {
    id, lab_id: access.labId, kind: b.kind, person_id: access.personId, project_id: b.projectId ?? null, checkin_id: access.checkinId,
    title: b.title || (b.kind === "voice_checkin" ? "Voice check-in" : "Untitled recording"), storage_path: path,
    duration_sec: Math.round(b.durationSec), size_bytes: b.size, consent: access.professor ? b.consent : true, participant_label: b.participantLabel ?? null,
    transcript: null, transcript_text: null, analysis: null, status: "uploaded", error: null, created_at: new Date().toISOString(),
  });
  return Response.json({ id, path, uploadToken: data.token });
}
