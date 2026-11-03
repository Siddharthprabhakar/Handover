import { z } from "zod";
import { list, remove, usingSupabase } from "@/lib/db";
import { loadLab } from "@/lib/lab";
import { getSession } from "@/lib/session";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const Body = z.object({ projectId: z.string(), code: z.string().trim().regex(/^\d{6}$/) });

// Deleting a project cannot be undone, so the professor proves it is them again with a fresh code from their authenticator app.
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Enter the 6-digit code from your authenticator app" }, { status: 400 });
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const project = (await loadLab(session.labId)).projects.find((p) => p.id === body.data.projectId);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  if (usingSupabase) {
    const sb = await createServerSupabase();
    const factor = (await sb.auth.mfa.listFactors()).data?.totp.find((f) => f.status === "verified");
    if (!factor) return Response.json({ error: "Set up an authenticator app first" }, { status: 403 });
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code: body.data.code });
    if (error) return Response.json({ error: "That code did not work. Check your authenticator app and try again." }, { status: 401 });
  } else {
    // shortcut: the in-memory demo has no authenticator, so it deletes on the spot; the real database always asks.
    for (const t of await list("tasks", { col: "project_id", eq: project.id })) await remove("tasks", t.id);
    for (const b of await list("blockers", { col: "project_id", eq: project.id })) await remove("blockers", b.id);
    for (const h of await list("handoffs", { col: "project_id", eq: project.id })) await remove("handoffs", h.id);
  }
  await remove("projects", project.id); // tasks, members, blockers and handoffs go with it; recordings stay in Files, unlinked
  return Response.json({ ok: true });
}
