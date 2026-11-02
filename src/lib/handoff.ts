import type { z } from "zod";
import type { Lab } from "./lab";
import type { HandoffBrief, HandoffQuestions } from "./schemas";

export type Questions = z.infer<typeof HandoffQuestions>;
export type Brief = z.infer<typeof HandoffBrief>;
export type HQuestion = { id: string; text: string; source: string; include: boolean };
export type HAnswers = Record<string, string>;

export type Ctx = {
  name: string;
  first: string;
  projects: { name: string; phase: string }[];
  tasks: { title: string; status: "open" | "done"; project: string; hours: number }[];
  blockers: { project: string; quote: string }[];
  checkins: string[];
};

/** Everything Muse knows about one person, taken from the lab's own records. */
export function buildContext(lab: Lab, personId: string): Ctx {
  const p = lab.byId.get(personId)!;
  const pname = (id: string) => lab.projects.find((x) => x.id === id)?.name ?? "";
  return {
    name: p.name,
    first: p.name.split(" ")[0],
    projects: lab.members.filter((m) => m.person_id === personId).map((m) => {
      const pr = lab.projects.find((x) => x.id === m.project_id)!;
      return { name: pr.name, phase: pr.phase_template[pr.current_phase - 1] };
    }),
    tasks: lab.tasks.filter((t) => t.assignee === personId).map((t) => ({ title: t.title, status: t.status, project: pname(t.project_id), hours: Number(t.est_hours) })),
    blockers: lab.blockers.filter((b) => b.person_id === personId && !b.resolved_at).map((b) => ({ project: pname(b.project_id), quote: b.quote })),
    checkins: lab.checkins.filter((c) => c.person_id === personId && c.raw?.text).map((c) => c.raw!.text),
  };
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : (xs[0] ?? ""));

/** Rule-based stand-in for Muse (mock mode): questions tied to the person's own tasks. */
export function heuristicQuestions(c: Ctx): Questions {
  const match = (re: RegExp) => c.tasks.filter((t) => re.test(t.title));
  const code = match(/code|repo|script|analysis|prototype|build|clean/i);
  const files = match(/interview|transcrib|record|audio/i);
  const tracker = match(/follow up|recruit|flyer|mailing|schedule/i);
  const q: { text: string; source: string }[] = [
    { text: "Which GitHub repos and branches did you maintain, and what changed in each?", source: code.length ? `From ${code.length} code task${code.length > 1 ? "s" : ""}` : "Always asked" },
  ];
  if (files.length) q.push({ text: "Where are the interview recordings and transcripts backed up, and who has access?", source: `From: ${files[0].title}` });
  if (tracker.length) q.push({ text: "Where is the participant tracker, and who still needs a follow-up?", source: `From: ${tracker[0].title}` });
  q.push(
    { text: "What decisions did you make or recommend, and why?", source: "Project decisions" },
    { text: "Which accounts, tools or credentials should be handed back or rotated?", source: "Access" },
    { text: "What would you tell the next person on their first day?", source: "Always asked" },
    { text: "Is there anything you were still figuring out, or felt unsupported on?", source: "Always asked" },
  );
  const done = c.tasks.filter((t) => t.status === "done").map((t) => lower(t.title));
  const where = c.projects[0]?.name ?? "the lab";
  return {
    questions: q,
    thanks: `${c.first}, thank you for your work on ${where}${done.length ? `: ${list(done.slice(0, 3))}` : ""}. The next person will start from what you built. We wish you well.`,
  };
}

/** Rule-based brief for mock mode, built from the person's records and their own answers. */
export function heuristicBrief(c: Ctx, qa: { question: string; answer: string }[]): Brief {
  const ans = (re: RegExp) => qa.find((x) => re.test(x.question))?.answer.trim() ?? "";
  const open = c.tasks.filter((t) => t.status === "open").map((t) => t.title);
  const done = c.tasks.filter((t) => t.status === "done").map((t) => t.title);
  const code = ans(/github|repo/i);
  const files = ans(/backed up|recording/i);
  return {
    where_we_are: c.projects.length ? c.projects.map((p) => `${p.name}: ${p.phase} phase.`).join(" ") + (c.blockers[0] ? ` Open blocker: “${c.blockers[0].quote}”` : "") : "No active projects.",
    contributed: done.length ? `${list(done)}.` : "No completed tasks recorded.",
    code_and_backups: [
      ...(code ? [{ name: "Code and repos", detail: code, backup: "" }] : []),
      ...(files ? [{ name: "Recordings and transcripts", detail: files, backup: "" }] : []),
    ],
    decisions: ans(/decisions/i) || "Not answered.",
    open_work: open.length ? `${list(open)}.` : "Nothing open.",
    advice: ans(/first day/i) || "Not answered.",
    unanswered: qa.filter((x) => !x.answer.trim()).map((x) => x.question),
  };
}
