import { list } from "./db";

/** The demo is pinned to this week so seeded data lines up. */
export const WEEK = "2026-11-02";

export const initials = (name: string) =>
  name.replace(/^Dr\.\s*/, "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export async function loadLab() {
  const [people, projects, members, tasks, checkins, blockers, overtime, digests] = await Promise.all([
    list("people"), list("projects"), list("project_members"), list("tasks"),
    list("checkins"), list("blockers"), list("overtime"), list("digests"),
  ]);
  const ras = people.filter((p) => p.role === "ra");
  const byId = new Map(people.map((p) => [p.id, p]));
  const weekCheckins = checkins.filter((c) => c.week === WEEK);
  const load = (personId: string) => {
    const open = tasks.filter((t) => t.assignee === personId && t.status === "open");
    return { tasks: open.length, hours: open.reduce((s, t) => s + Number(t.est_hours), 0) };
  };
  const projectsOf = (personId: string) =>
    members.filter((m) => m.person_id === personId).map((m) => projects.find((p) => p.id === m.project_id)!.name);
  return { people, ras, projects, members, tasks, checkins, weekCheckins, blockers, overtime, digests, byId, load, projectsOf };
}
export type Lab = Awaited<ReturnType<typeof loadLab>>;
