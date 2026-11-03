import { after } from "next/server";
import { z } from "zod";
import { insert, list, remove, update } from "@/lib/db";
import { composeText, groundedQuotes, heuristicParse, type Parsed } from "@/lib/checkin";
import { museJson, museMode } from "@/lib/muse";
import { checkinPrompt } from "@/lib/prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // the Muse pass runs after the response is sent

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

  // the personal link is the only credential: look up this one check-in, then only this person's projects
  const [checkin] = await list("checkins", { col: "token", eq: token });
  if (!checkin) return Response.json({ error: "Link not found" }, { status: 404 });
  if (checkin.submitted_at) return Response.json({ error: "Already submitted" }, { status: 409 });

  const members = await list("project_members", { col: "person_id", eq: checkin.person_id });
  const mine = await list("projects", { col: "id", in: members.map((m) => m.project_id) });
  // someone not on a project yet still checks in, under a general heading
  const general = { id: "general", name: "General", phase_template: [] as string[], current_phase: 1 } as unknown as (typeof mine)[number];
  const scope = mine.length ? mine : [general];
  const filled = answers
    .map((a) => ({ ...a, project: scope.find((p) => p.id === a.projectId) }))
    .filter((a) => a.project && (a.challenges.trim() || a.plans.trim() || a.support.trim() || a.needsTasks || a.done.length));
  if (!filled.length) return Response.json({ error: "Write at least one answer" }, { status: 400 });

  const text = composeText(filled.map((a) => ({ projectName: a.project!.name, challenges: a.challenges.trim(), plans: a.plans.trim(), support: a.support.trim(), needsTasks: a.needsTasks, done: a.done })));
  const info = mine.map((p) => ({ name: p.name, phase: p.current_phase }));

  // blockers become visible on the project journey; skip ones already open. Returns the ids it created.
  async function saveBlockers(parsed: Parsed): Promise<string[]> {
    const open = (await list("blockers", { col: "person_id", eq: checkin.person_id })).filter((b) => !b.resolved_at);
    const created: string[] = [];
    for (const p of parsed.projects) {
      const project = mine.find((x) => x.name.toLowerCase() === p.project.toLowerCase());
      if (!project) continue;
      for (const b of p.blockers) {
        if (open.some((o) => o.project_id === project.id && o.quote === b.quote)) continue;
        const row = await insert("blockers", { project_id: project.id, phase: p.phase ?? project.current_phase, person_id: checkin.person_id, quote: b.quote, opened_at: new Date().toISOString(), resolved_at: null });
        created.push(row.id);
      }
    }
    return created;
  }

  // 1. answer right away with the rule-based reading, so sending feels instant
  const quick = groundedQuotes(heuristicParse(text, info), text);
  const quickBlockers = await saveBlockers(quick);
  await update("checkins", checkin.id, { raw: { text, fields: answers }, parsed: quick, submitted_at: new Date().toISOString() });

  // 2. then let Muse read it properly, which takes several seconds, and swap in its version
  if (museMode() === "live") {
    after(async () => {
      try {
        const full = groundedQuotes(
          await museJson("checkin", checkinPrompt(text, mine.map((p) => ({ name: p.name, phases: p.phase_template }))), quick),
          text,
        );
        for (const id of quickBlockers) await remove("blockers", id);
        await saveBlockers(full);
        await update("checkins", checkin.id, { parsed: full });
      } catch (e) {
        console.error("Muse check-in pass failed; the rule-based reading stays:", e instanceof Error ? e.message : e);
      }
    });
  }

  return Response.json({ ok: true, parsed: quick });
}
