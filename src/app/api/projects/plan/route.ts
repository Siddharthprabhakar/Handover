import { z } from "zod";
import { loadLab } from "@/lib/lab";
import { phaseOneCheck } from "@/lib/limits";
import { loadsOf } from "@/lib/loads";
import { museJson } from "@/lib/muse";
import { heuristicPlan } from "@/lib/plan";
import { planPrompt } from "@/lib/prompts";
import { PHASES } from "@/lib/templates";

export const dynamic = "force-dynamic";

const Body = z.object({
  kind: z.enum(["lab", "thesis"]),
  name: z.string().min(1).max(120),
  goal: z.string().min(1).max(2000),
  deadline: z.string().max(40).default(""),
  people: z.array(z.string()).min(1).max(12),
});

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Add a name, a goal and at least one person" }, { status: 400 });
  const { kind, name, goal, deadline, people } = body.data;
  const lab = await loadLab();
  const chosen = loadsOf(lab).filter((l) => people.includes(l.id));
  if (!chosen.length) return Response.json({ error: "Pick at least one person" }, { status: 400 });

  try {
    const plan = await museJson(
      "plan",
      planPrompt({ kind, name, goal, deadline, phases: PHASES[kind], people: chosen.map((c) => ({ name: c.name, openTasks: c.tasks, hours: c.hours, weeklyHours: c.weeklyHours })) }),
      heuristicPlan(kind, chosen),
    );
    if (plan.phases.length !== PHASES[kind].length) return Response.json({ error: "Muse returned the wrong number of phases. Try again." }, { status: 502 });
    // phases keep our fixed names so the journey strip always lines up
    plan.phases.forEach((p, i) => (p.name = PHASES[kind][i]));
    return Response.json({ plan, over: phaseOneCheck(plan, loadsOf(lab)) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Muse failed" }, { status: 502 });
  }
}
