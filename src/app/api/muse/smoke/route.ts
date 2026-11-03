import { museJson, museMode } from "@/lib/muse";
import { checkinPrompt } from "@/lib/prompts";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Signed-in check that Muse answers with valid JSON. Prints the mode (live or mock), never any key.
export async function GET() {
  if (!(await getSession())) return Response.json({ error: "Sign in required" }, { status: 401 });
  const text = "Project: Test Study\nChallenges: I emailed 14 people and only 2 replied. I am not sure if the flyer is the problem.\nPlans for next week: Re-post the flyer.";
  try {
    const result = await museJson("checkin", checkinPrompt(text, [{ name: "Test Study", phases: ["Plan", "Recruit", "Interview", "Synthesize", "Design", "Test", "Report"] }]));
    return Response.json({ mode: museMode(), result });
  } catch (e) {
    return Response.json({ mode: museMode(), error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
