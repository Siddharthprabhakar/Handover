// Workload rules. Pure functions, no AI: the same code runs in the browser preview and on the server.
export type Load = { id: string; name: string; tasks: number; hours: number; maxTasks: number; weeklyHours: number };
export type PlanTask = { title: string; hours: number; owner: string | null };
export type PlanData = { phases: { name: string; tasks: PlanTask[] }[] };
export type LoadCheck = { id: string; name: string; tasks: number; hours: number; maxTasks: number; weeklyHours: number; over: boolean };

/**
 * Only phase 1 tasks are assigned when a project is created, so only they count against weekly limits.
 * Later phases are assigned when they start.
 */
export function phaseOneCheck(plan: PlanData, loads: Load[]): LoadCheck[] {
  const first = plan.phases[0]?.tasks ?? [];
  return loads
    .map((l) => {
      const mine = first.filter((t) => t.owner === l.name);
      const tasks = l.tasks + mine.length;
      const hours = l.hours + mine.reduce((s, t) => s + (Number(t.hours) || 0), 0);
      return { ...l, tasks, hours, over: mine.length > 0 && (tasks > l.maxTasks || hours > l.weeklyHours) };
    })
    .filter((c) => c.over);
}
