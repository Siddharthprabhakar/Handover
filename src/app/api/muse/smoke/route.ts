import { list, usingSupabase } from "@/lib/db";
import { museJson, museMode } from "@/lib/muse";
import { checkinPrompt } from "@/lib/prompts";

export const dynamic = "force-dynamic";

// Dev check for stage 1: reads seed data, runs one Muse job, returns the result.
export async function GET() {
  const [people, projects, checkins] = await Promise.all([list("people"), list("projects"), list("checkins")]);
  const ben = people.find((p) => p.name === "Ben Kaplan")!;
  const text = checkins.find((c) => c.person_id === ben.id)?.raw?.text ?? "";
  const wayfinding = projects.find((p) => p.name === "Campus Wayfinding Study")!;
  try {
    const result = await museJson("checkin", checkinPrompt(text, [{ name: wayfinding.name, phases: wayfinding.phase_template }]));
    return Response.json({ mode: museMode(), db: usingSupabase ? "supabase" : "memory", people: people.length, projects: projects.length, result });
  } catch (e) {
    return Response.json({ mode: museMode(), error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
