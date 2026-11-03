import { list } from "./db";
import { WEEK } from "./demo";

export { WEEK };

export const initials = (name: string) =>
  name.replace(/^Dr\.\s*/, "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Everything that belongs to one lab. Other labs' rows are never read. */
export async function loadLab(labId: string) {
  const [labs, people, projects, digests] = await Promise.all([
    list("labs", { col: "id", eq: labId }),
    list("people", { col: "lab_id", eq: labId }),
    list("projects", { col: "lab_id", eq: labId }),
    list("digests", { col: "lab_id", eq: labId }),
  ]);
  const personIds = people.map((p) => p.id);
  const projectIds = projects.map((p) => p.id);
  const [members, tasks, checkins, blockers, overtime, handoffs] = await Promise.all([
    list("project_members", { col: "project_id", in: projectIds }),
    list("tasks", { col: "project_id", in: projectIds }),
    list("checkins", { col: "person_id", in: personIds }),
    list("blockers", { col: "project_id", in: projectIds }),
    list("overtime", { col: "person_id", in: personIds }),
    list("handoffs", { col: "person_id", in: personIds }),
  ]);
  const ras = people.filter((p) => p.role === "ra");
  const byId = new Map(people.map((p) => [p.id, p]));
  const weekCheckins = checkins.filter((c) => c.week === WEEK);
  const load = (personId: string) => {
    const open = tasks.filter((t) => t.assignee === personId && t.status === "open");
    return { tasks: open.length, hours: open.reduce((s, t) => s + Number(t.est_hours), 0) };
  };
  const projectsOf = (personId: string) =>
    members.filter((m) => m.person_id === personId).map((m) => projects.find((p) => p.id === m.project_id)?.name ?? "").filter(Boolean);
  return { labId, labName: labs[0]?.name ?? "Your lab", people, ras, projects, members, tasks, checkins, weekCheckins, blockers, overtime, handoffs, digests, byId, load, projectsOf };
}
export type Lab = Awaited<ReturnType<typeof loadLab>>;
