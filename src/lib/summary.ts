import type { Lab } from "./lab";
import type { z } from "zod";
import type { ProjectSummary } from "./schemas";

export type SummaryResult = z.infer<typeof ProjectSummary>;

/** Everything Muse may use to summarise one project, taken from the lab's own records. */
export function summaryContext(lab: Lab, projectId: string) {
  const project = lab.projects.find((p) => p.id === projectId)!;
  const name = (id: string | null) => (id ? (lab.byId.get(id)?.name ?? "someone") : "unassigned");
  const tasks = lab.tasks.filter((t) => t.project_id === projectId);
  const memberIds = lab.members.filter((m) => m.project_id === projectId).map((m) => m.person_id);
  return {
    project: { name: project.name, type: project.kind, goal: project.goal, deadline: project.deadline, phase: project.phase_template[project.current_phase - 1], phaseNumber: project.current_phase, phases: project.phase_template },
    tasks: tasks.map((t) => ({ title: t.title, phase: project.phase_template[t.phase - 1], status: t.status, hours: Number(t.est_hours), owner: name(t.assignee) })),
    blockers: lab.blockers.filter((b) => b.project_id === projectId && !b.resolved_at).map((b) => ({ person: name(b.person_id), phase: project.phase_template[b.phase - 1], quote: b.quote })),
    checkins: lab.checkins.filter((c) => c.submitted_at && memberIds.includes(c.person_id) && c.raw?.text).slice(-6).map((c) => ({ person: name(c.person_id), text: c.raw!.text.slice(0, 600) })),
    people: memberIds.map((id) => name(id)),
  };
}

/** Rule-based stand-in for Muse (mock mode), built from the same data. */
export function heuristicSummary(ctx: ReturnType<typeof summaryContext>): SummaryResult {
  const done = ctx.tasks.filter((t) => t.status === "done").length;
  const open = ctx.tasks.length - done;
  const unassigned = ctx.tasks.filter((t) => t.status === "open" && t.owner === "unassigned").length;
  return {
    summary: `${ctx.project.name} is in the ${ctx.project.phase} phase (${ctx.project.phaseNumber} of ${ctx.project.phases.length}). ${done} of ${ctx.tasks.length} tasks are done and ${open} are open.`,
    progress: ctx.tasks.length ? `${done} tasks done, ${open} still open.` : "No tasks have been added yet.",
    risks: [...ctx.blockers.map((b) => `${b.person}: "${b.quote}"`), ...(unassigned ? [`${unassigned} open task${unassigned > 1 ? "s have" : " has"} no owner.`] : [])],
    next_steps: ctx.tasks.filter((t) => t.status === "open").slice(0, 4).map((t) => t.title),
  };
}
