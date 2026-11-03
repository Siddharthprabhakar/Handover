import { insert } from "@/lib/db";
import { loadLab } from "@/lib/lab";
import { getSession } from "@/lib/session";
import { PHASES } from "@/lib/templates";

export const dynamic = "force-dynamic";

type Sample = { name: string; kind: "lab" | "thesis"; goal: string; phase: number; deadline: string; tasks: [number, string, number, "open" | "done"][] };

const SAMPLES: Sample[] = [
  {
    name: "Campus Wayfinding Study", kind: "lab", phase: 3, deadline: "2027-05-02",
    goal: "How first-year students find rooms on campus. 12 interviews planned, finished by the end of spring.",
    tasks: [[1, "Write the interview guide", 3, "done"], [1, "Get IRB approval for the consent script", 3, "done"], [2, "Post the recruitment flyer", 2, "done"], [2, "Send the mailing list", 2, "done"], [3, "Run interviews 1-4", 8, "done"], [3, "Follow up with non-responders", 3, "open"], [3, "Schedule the remaining sessions", 2, "open"], [3, "Transcribe the pilot interview", 3, "open"], [4, "Code themes from the first transcripts", 4, "open"]],
  },
  {
    name: "Thesis: Voice UI for Older Adults", kind: "thesis", phase: 5, deadline: "2027-04-22",
    goal: "A master's thesis on voice interfaces for older adults, advised by the professor.",
    tasks: [[1, "Draft and defend the proposal", 8, "done"], [2, "Write the literature review", 10, "done"], [3, "Write the method chapter", 8, "done"], [4, "Run the 8 user sessions", 16, "done"], [5, "Code the survey responses", 4, "open"], [5, "Draft the findings chapter", 8, "open"], [6, "Write the discussion chapter", 12, "open"]],
  },
];

// Adds two example projects, with unassigned tasks, so a new lab has something to look at and summarise.
export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const lab = await loadLab(session.labId);
  let added = 0;
  for (const s of SAMPLES) {
    if (lab.projects.some((p) => p.name === s.name)) continue;
    const project = await insert("projects", { lab_id: session.labId, name: s.name, kind: s.kind, goal: s.goal, phase_template: [...PHASES[s.kind]], current_phase: s.phase, deadline: s.deadline });
    for (const [phase, title, hours, status] of s.tasks) await insert("tasks", { project_id: project.id, phase, title, est_hours: hours, assignee: null, status, due: null });
    added++;
  }
  return Response.json({ ok: true, added });
}
