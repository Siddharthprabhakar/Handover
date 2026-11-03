import { getSession } from "@/lib/session";
import { addSamples } from "@/lib/sample";

export const dynamic = "force-dynamic";

// Adds two example projects, with unassigned tasks, so a new lab has something to look at and summarise.
export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  return Response.json({ ok: true, added: await addSamples(session.labId) });
}
