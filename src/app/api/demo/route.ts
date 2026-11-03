import { loadDemoLab } from "@/lib/demo-lab";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Fills the signed-in professor's own lab with fake people and data. Never touches another lab.
export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  try {
    return Response.json({ ok: true, added: await loadDemoLab(session.labId) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Could not load the demo lab" }, { status: 500 });
  }
}
