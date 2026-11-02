import type { Lab } from "./lab";
import type { Load } from "./limits";

export const loadsOf = (lab: Lab): Load[] =>
  lab.ras.map((p) => ({ id: p.id, name: p.name, ...lab.load(p.id), maxTasks: p.max_tasks, weeklyHours: p.weekly_hours }));
