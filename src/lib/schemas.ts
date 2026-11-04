import { z } from "zod";

// One schema per Muse job. Every Muse reply is validated against these.
export const CheckinParse = z.object({
  projects: z.array(
    z.object({
      project: z.string(),
      done: z.array(z.string()),
      blockers: z.array(z.object({ quote: z.string() })),
      next: z.array(z.string()),
      support: z.array(z.string()),
      phase: z.number().int().min(1).max(12).nullable(),
      needs_tasks: z.boolean(),
    }),
  ),
});

export const Digest = z.object({
  summary: z.string(),
  on_track: z.array(z.string()),
  stuck: z.array(z.object({ person: z.string(), quote: z.string() })),
  needs_tasks: z.array(z.string()),
  missing: z.array(z.string()),
  support: z.array(z.string()),
});

export const Plan = z.object({
  phases: z.array(
    z.object({
      name: z.string(),
      tasks: z.array(z.object({ title: z.string(), hours: z.number(), owner: z.string().nullable() })),
    }),
  ),
});

export const HandoffQuestions = z.object({
  questions: z.array(z.object({ text: z.string(), source: z.string() })),
  thanks: z.string(),
});

export const HandoffBrief = z.object({
  where_we_are: z.string(),
  contributed: z.string(),
  code_and_backups: z.array(z.object({ name: z.string(), detail: z.string(), backup: z.string() })),
  decisions: z.string(),
  open_work: z.string(),
  advice: z.string(),
  unanswered: z.array(z.string()),
});

export const ProjectSummary = z.object({
  summary: z.string(),
  progress: z.string(),
  risks: z.array(z.string()),
  next_steps: z.array(z.string()),
});

export const InterviewAnalysis = z.object({
  summary: z.string(),
  themes: z.array(z.object({ title: z.string(), description: z.string(), quotes: z.array(z.string()) })),
  follow_ups: z.array(z.string()),
});

export const ProjectImport = z.object({
  name: z.string(),
  kind: z.enum(["lab", "thesis"]),
  goal: z.string(),
  deadline: z.string().nullable(),
  phases: z.array(z.object({ name: z.string(), due: z.string().nullable(), tasks: z.array(z.object({ title: z.string(), hours: z.number(), owner: z.string().nullable() })) })),
  resources: z.array(z.string()),
  communication: z.array(z.string()),
});

export const Synthesis = z.object({
  themes: z.array(z.object({ title: z.string(), summary: z.string(), rq: z.number().int().nullable(), evidence: z.array(z.object({ participant: z.string(), quote: z.string() })) })),
  coverage: z.array(z.object({ rq: z.number().int(), participants: z.number().int(), note: z.string() })),
  gaps: z.array(z.string()),
});

export const Filing = z.object({
  project: z.string().nullable(), // exact project name, or null when none fits
  title: z.string(),
  reason: z.string(),
});

// a spoken check-in sorted into the form's three answers; "" means the student did not talk about that question
export const VoiceSort = z.object({ challenges: z.string(), plans: z.string(), support: z.string(), needs_tasks: z.boolean() });

export const schemas = { voicesort: VoiceSort, checkin: CheckinParse, digest: Digest, plan: Plan, questions: HandoffQuestions, brief: HandoffBrief, summary: ProjectSummary, interview: InterviewAnalysis, projectplan: ProjectImport, synthesis: Synthesis, filing: Filing };
export type JobName = keyof typeof schemas;
