import { heuristicParse } from "./checkin";

// Demo data. All names are fake. Used only when Supabase is not configured (in-memory demo mode).
export type Lab = { id: string; name: string; created_at: string };
export type Person = {
  id: string; lab_id: string; auth_user_id: string | null; invited_at: string | null; name: string; email: string; role: "professor" | "ra";
  weekly_hours: number; max_tasks: number; status: "active" | "leaving"; leaving_on: string | null;
};
export type Project = {
  id: string; lab_id: string; name: string; kind: "lab" | "thesis"; goal: string | null;
  phase_template: string[]; current_phase: number; deadline: string | null;
};
export type ProjectMember = { project_id: string; person_id: string };
export type Task = {
  id: string; project_id: string; phase: number; title: string; est_hours: number;
  assignee: string | null; status: "open" | "done"; due: string | null;
};
export type Checkin = {
  id: string; person_id: string; week: string; raw: { text: string; fields?: unknown } | null; parsed: unknown;
  token: string; submitted_at: string | null; reminders_sent: number;
};
export type Blocker = {
  id: string; project_id: string; phase: number; person_id: string | null;
  quote: string; opened_at: string; resolved_at: string | null;
};
export type Overtime = { id: string; person_id: string; reason: string; starts: string; ends: string };
export type Handoff = {
  id: string; person_id: string; project_id: string; questions: unknown; thanks: string | null;
  answers: unknown; brief: unknown; token: string; status: string;
};
export type DigestRow = { id: string; lab_id: string; week: string; text: string; shared_at: string | null };
export type Turn = { speaker: string | null; text: string };
export type FileRow = {
  id: string; lab_id: string; kind: "voice_checkin" | "interview" | "upload"; person_id: string | null; project_id: string | null; checkin_id: string | null;
  title: string; storage_path: string; duration_sec: number | null; size_bytes: number | null; consent: boolean; participant_label: string | null;
  transcript: Turn[] | null; transcript_text: string | null; analysis: unknown; status: "uploaded" | "transcribing" | "ready" | "failed"; error: string | null; created_at: string;
};
export type Tables = {
  labs: Lab[]; people: Person[]; projects: Project[]; project_members: ProjectMember[]; tasks: Task[];
  checkins: Checkin[]; blockers: Blocker[]; overtime: Overtime[]; handoffs: Handoff[]; digests: DigestRow[]; files: FileRow[];
};

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const P = { prof: uid(1), ana: uid(2), ben: uid(3), chloe: uid(4), dev: uid(5), emi: uid(6), farah: uid(7) };
export const PR = { way: uid(101), tele: uid(102), thesis: uid(103) };

const LAB = ["Plan", "Recruit", "Interview", "Synthesize", "Design", "Test", "Report"];
const THESIS = ["Proposal", "Literature", "Method", "Data", "Analysis", "Writing", "Defense"];
export const DEMO_LAB = uid(900);
// .invalid addresses can never receive mail; sendMail refuses them.
const person = (id: string, name: string, role: Person["role"], extra: Partial<Person> = {}): Person => ({
  id, lab_id: DEMO_LAB, auth_user_id: null, invited_at: null, name,
  email: `${name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^dr\.\./, "")}@demo.invalid`, role,
  weekly_hours: 10, max_tasks: 5, status: "active", leaving_on: null, ...extra,
});
let tn = 1000;
const task = (project_id: string, phase: number, title: string, est_hours: number, assignee: string | null,
  status: Task["status"] = "open", due: string | null = null): Task => ({ id: uid(tn++), project_id, phase, title, est_hours, assignee, status, due });

export const seed: Tables = {
  labs: [{ id: DEMO_LAB, name: "Demo lab", created_at: "2026-10-27T00:00:00Z" }],
  people: [
    person(P.prof, "Dr. Rivera", "professor"),
    person(P.ana, "Ana Ortiz", "ra"),
    person(P.ben, "Ben Kaplan", "ra", { status: "leaving", leaving_on: "2026-12-12" }),
    person(P.chloe, "Chloe Park", "ra"),
    person(P.dev, "Dev Mehta", "ra"),
    person(P.emi, "Emi Sato", "ra"),
    person(P.farah, "Farah Khan", "ra"),
  ],
  projects: [
    { id: PR.way, lab_id: DEMO_LAB, name: "Campus Wayfinding Study", kind: "lab", goal: "How first-year students find rooms on campus. 12 interviews planned.", phase_template: LAB, current_phase: 3, deadline: "2027-05-02" },
    { id: PR.tele, lab_id: DEMO_LAB, name: "Telehealth Accessibility", kind: "lab", goal: "Accessibility gaps in telehealth booking for older adults.", phase_template: LAB, current_phase: 4, deadline: "2027-05-02" },
    { id: PR.thesis, lab_id: DEMO_LAB, name: "Thesis: Voice UI for Older Adults", kind: "thesis", goal: "Ana Ortiz's master's thesis, advised by Dr. Rivera.", phase_template: THESIS, current_phase: 5, deadline: "2027-04-22" },
  ],
  project_members: [
    ...[P.ben, P.ana, P.emi].map((p) => ({ project_id: PR.way, person_id: p })),
    ...[P.chloe, P.dev, P.emi, P.farah].map((p) => ({ project_id: PR.tele, person_id: p })),
    { project_id: PR.thesis, person_id: P.ana },
  ],
  tasks: [
    // done work drives journey progress
    task(PR.way, 1, "Interview guide v2 approved", 3, P.ana, "done"),
    task(PR.way, 1, "IRB consent script approved", 3, P.ana, "done"),
    task(PR.way, 2, "Flyer posted", 2, P.ben, "done"),
    task(PR.way, 2, "Mailing list sent", 2, P.ben, "done"),
    task(PR.way, 3, "Interviews 1–4 completed", 8, P.ben, "done"),
    // Ana: 5 open tasks, 9 h (at her limit)
    task(PR.way, 3, "Transcribe pilot interview", 3, P.ana, "open", "2026-11-06"),
    task(PR.way, 4, "Code pages 1–2 with Chloe", 2, P.ana, "open", "2026-11-09"),
    task(PR.way, 1, "Update consent FAQ", 1, P.ana),
    task(PR.thesis, 5, "Code survey responses", 2, P.ana, "open", "2026-11-09"),
    task(PR.thesis, 6, "Update thesis outline", 1, P.ana),
    // Ben: 3 tasks, 6 h
    task(PR.way, 3, "Follow up with 12 non-responders", 3, P.ben),
    task(PR.way, 3, "Schedule remaining sessions", 2, P.ben),
    task(PR.way, 2, "Re-post flyer", 1, P.ben),
    // Chloe: 4 tasks, 7 h
    task(PR.tele, 4, "Synthesize interview notes", 2, P.chloe),
    task(PR.tele, 4, "Draft accessibility findings", 2, P.chloe),
    task(PR.tele, 4, "Code transcripts batch 2", 2, P.chloe),
    task(PR.tele, 4, "Prepare conference abstract", 1, P.chloe),
    // Dev: 2 tasks, 4 h
    task(PR.tele, 4, "Tag themes in batch 1", 2, P.dev),
    task(PR.tele, 5, "Sketch booking flow ideas", 2, P.dev),
    // Emi: 3 tasks, 5 h
    task(PR.way, 3, "Run interview 5", 2, P.emi),
    task(PR.tele, 4, "Clean survey data", 2, P.emi),
    task(PR.tele, 4, "Write method notes", 1, P.emi),
    // Farah: 1 task, 2 h
    task(PR.tele, 5, "Prototype appointment screen", 2, P.farah),
  ],
  checkins: [
    { id: uid(201), person_id: P.ben, week: "2026-11-02", raw: { text: "Ran interview 4. I've emailed 14 people and only 2 replied. Not sure if the flyer is the problem. I'll keep trying." }, parsed: null, token: "tok-ben-nov2", submitted_at: "2026-11-02T14:10:00Z", reminders_sent: 0 },
    { id: uid(202), person_id: P.ana, week: "2026-11-02", raw: { text: "Transcription is taking longer than I thought. I'm not sure how to code the first two pages. Next week I'll finish transcription and start coding with Chloe. A thematic coding walkthrough would help." }, parsed: null, token: "tok-ana-nov2", submitted_at: "2026-11-02T14:42:00Z", reminders_sent: 0 },
    { id: uid(203), person_id: P.chloe, week: "2026-11-02", raw: { text: "On track. Findings draft is half done. Working extra hours until the conference deadline on Nov 8." }, parsed: null, token: "tok-chloe-nov2", submitted_at: "2026-11-02T15:05:00Z", reminders_sent: 0 },
    { id: uid(204), person_id: P.dev, week: "2026-11-02", raw: { text: "Tagged batch 1. No plans for next week, I need tasks." }, parsed: null, token: "tok-dev-nov2", submitted_at: "2026-11-02T15:20:00Z", reminders_sent: 0 },
    { id: uid(205), person_id: P.emi, week: "2026-11-02", raw: null, parsed: null, token: "tok-emi-nov2", submitted_at: null, reminders_sent: 1 },
    { id: uid(206), person_id: P.farah, week: "2026-11-02", raw: { text: "Prototype screen is ready. Waiting on the accessibility review before I move on." }, parsed: null, token: "tok-farah-nov2", submitted_at: "2026-11-02T16:00:00Z", reminders_sent: 0 },
  ],
  blockers: [
    { id: uid(301), project_id: PR.way, phase: 3, person_id: P.ben, quote: "I've emailed 14 people and only 2 replied. Not sure if the flyer is the problem.", opened_at: "2026-11-02T14:10:00Z", resolved_at: null },
  ],
  overtime: [{ id: uid(401), person_id: P.chloe, reason: "Conference deadline", starts: "2026-11-02", ends: "2026-11-08" }],
  handoffs: [],
  digests: [],
  files: [],
};

// Seeded check-ins get the same rule-based parse so the demo data has structure from the start.
for (const c of seed.checkins) {
  if (!c.raw || c.parsed) continue;
  const m = seed.project_members.find((x) => x.person_id === c.person_id);
  const pr = seed.projects.find((p) => p.id === m?.project_id);
  c.parsed = heuristicParse(c.raw.text, pr ? [{ name: pr.name, phase: pr.current_phase }] : []);
}
