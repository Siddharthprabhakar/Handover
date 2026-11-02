import { z } from "zod";
import { insert, list, update } from "@/lib/db";
import { composeText, groundedQuotes, heuristicParse } from "@/lib/checkin";
import { museJson } from "@/lib/muse";
import { checkinPrompt } from "@/lib/prompts";

export const dynamic = "force-dynamic";

const Body = z.object({
  token: z.string().min(1),
  answers: z
    .array(
      z.object({
        projectId: z.string(),
        challenges: z.string().max(4000).default(""),
        plans: z.string().max(4000).default(""),
        support: z.string().max(4000).default(""),
        needsTasks: z.boolean().default(false),
        done: z.array(z.string().max(300)).max(20).default([]),
      }),
    )
    .min(1),
});

export async function POST(req: Request) {
  const parsedBody = Body.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { token, answers } = parsedBody.data;

  const [checkins, projects, members] = await Promise.all([list("checkins"), list("projects"), list("project_members")]);
  const checkin = checkins.find((c) => c.token === token);
  if (!checkin) return Response.json({ error: "Link not found" }, { status: 404 });
  if (checkin.submitted_at) return Response.json({ error: "Already submitted" }, { status: 409 });

  const mine = projects.filter((p) => members.some((m) => m.person_id === checkin.person_id && m.project_id === p.id));
  const filled = answers
    .map((a) => ({ ...a, project: mine.find((p) => p.id === a.projectId) }))
    .filter((a) => a.project && (a.challenges.trim() || a.plans.trim() || a.support.trim() || a.needsTasks || a.done.length));
  if (!filled.length) return Response.json({ error: "Write at least one answer" }, { status: 400 });

  const text = composeText(filled.map((a) => ({ projectName: a.project!.name, challenges: a.challenges.trim(), plans: a.plans.trim(), support: a.support.trim(), needsTasks: a.needsTasks, done: a.done })));
  const info = mine.map((p) => ({ name: p.name, phase: p.current_phase }));

  let parsed;
  try {
    parsed = groundedQuotes(await museJson("checkin", checkinPrompt(text, mine.map((p) => ({ name: p.name, phases: p.phase_template }))), heuristicParse(text, info)), text);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Muse failed" }, { status: 502 });
  }

  // blockers become visible on the project journey; skip ones already open
  const open = (await list("blockers")).filter((b) => !b.resolved_at);
  for (const p of parsed.projects) {
    const project = mine.find((x) => x.name.toLowerCase() === p.project.toLowerCase());
    if (!project) continue;
    for (const b of p.blockers) {
      if (open.some((o) => o.person_id === checkin.person_id && o.project_id === project.id && o.quote === b.quote)) continue;
      await insert("blockers", { project_id: project.id, phase: p.phase ?? project.current_phase, person_id: checkin.person_id, quote: b.quote, opened_at: new Date().toISOString(), resolved_at: null });
    }
  }

  await update("checkins", checkin.id, { raw: { text, fields: answers }, parsed, submitted_at: new Date().toISOString() });
  return Response.json({ ok: true, parsed });
}
