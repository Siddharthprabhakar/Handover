import { PHASES, type Kind } from "./templates";
import type { Load, PlanData } from "./limits";

const STEPS: Record<Kind, [string, number][][]> = {
  lab: [
    [["Write the research plan and interview guide", 4], ["Draft the IRB consent script", 3]],
    [["Design the flyer and mailing list", 3], ["Build the screener survey", 2]],
    [["Run the interview sessions", 12], ["Write notes after each session", 6]],
    [["Transcribe the recordings", 8], ["Code themes and pull quotes", 8]],
    [["Turn findings into recommendations", 10]],
    [["Check recommendations with participants", 8]],
    [["Write the final report", 6], ["Write handoff notes", 2]],
  ],
  thesis: [
    [["Draft the proposal", 8], ["Meet the advisor to agree scope", 1]],
    [["Read and summarise key papers", 12], ["Write the literature review", 10]],
    [["Write the method chapter", 8], ["Prepare ethics approval", 3]],
    [["Collect the data", 16], ["Clean the data", 6]],
    [["Analyse the data", 14], ["Draft the findings", 8]],
    [["Write discussion and conclusion", 12], ["Revise with advisor comments", 8]],
    [["Prepare the defense slides", 6], ["Practice the defense", 3]],
  ],
};

/** Rule-based plan for mock mode. Phase 1 goes to whoever has the most room. */
export function heuristicPlan(kind: Kind, people: Load[]): PlanData {
  const room = new Map(people.map((p) => [p.name, { tasks: p.maxTasks - p.tasks, hours: p.weeklyHours - p.hours }]));
  let rr = 0;
  return {
    phases: PHASES[kind].map((name, i) => ({
      name,
      tasks: STEPS[kind][i].map(([title, hours]) => {
        if (!people.length) return { title, hours, owner: null };
        if (i > 0) return { title, hours, owner: people[rr++ % people.length].name };
        const best = [...people].sort((a, b) => room.get(b.name)!.hours - room.get(a.name)!.hours)[0];
        const r = room.get(best.name)!;
        r.hours -= hours;
        r.tasks -= 1;
        return { title, hours, owner: best.name };
      }),
    })),
  };
}
