import { composeText, groundedQuotes, heuristicParse } from "./checkin";
import { insert, list, update } from "./db";
import { WEEK } from "./demo";
import { loadLab } from "./lab";
import { ensureWeekCheckins } from "./reminders";
import { addSamples } from "./sample";
import type { Turn } from "./seed";
import { toText } from "./transcribe";

const WAY = "Campus Wayfinding Study";
const THESIS = "Thesis: Voice UI for Older Adults";

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// All names are made up. The .invalid addresses can never receive mail; sendMail refuses them.
const PEOPLE = [
  { name: "Ana Kim", project: WAY, program: "PhD student" },
  { name: "Ben Okafor", project: WAY, program: "Master's student" },
  { name: "Chloe Martin", project: WAY, program: "PhD student" },
  { name: "Emi Tanaka", project: WAY, program: "Undergraduate" },
  { name: "Farah Ali", project: WAY, program: "Master's student" },
  { name: "Dev Patel", project: THESIS, program: "Master's student" },
];

type Said = { challenges: string; plans: string; support?: string; needsTasks?: boolean; done?: string[] };
const THIS_WEEK: Record<string, Said> = {
  "Ana Kim": { challenges: "I emailed 14 people and only 2 replied, so I am stuck on recruitment. I am not sure the flyer is the problem.", plans: "Re-post the flyer and email the department lists.", support: "A short workshop on recruiting participants would help.", done: ["Post the recruitment flyer"] },
  "Ben Okafor": { challenges: "Interview 4 went well. I am blocked on the audio recorder, it keeps cutting out after ten minutes.", plans: "Schedule the remaining sessions.", done: ["Run interview 4"] },
  "Chloe Martin": { challenges: "Working extra this week for the conference poster, but the pilot transcription is on track.", plans: "Finish transcribing the pilot interview." },
  "Farah Ali": { challenges: "Nothing blocking me. I am wrapping up before I leave.", plans: "Finish coding the first transcripts and write my handoff notes.", done: ["Code themes from the first transcripts"] },
  "Dev Patel": { challenges: "Survey responses are all in. I have no plans for the discussion section yet and I need more tasks.", plans: "Code the survey responses.", needsTasks: true },
};
const LAST_WEEK: Record<string, Said> = {
  "Ana Kim": { challenges: "The IRB consent script is done. Recruitment starts next week.", plans: "Post the flyer.", done: ["Get IRB approval for the consent script"] },
  "Ben Okafor": { challenges: "I was stuck waiting for the IRB form to be signed.", plans: "Run interview 3 once it is signed." },
  "Chloe Martin": { challenges: "Pilot interview recorded without problems.", plans: "Start the transcription." },
  "Dev Patel": { challenges: "The survey is out. I am waiting for responses.", plans: "Check responses on Friday." },
};

const TRANSCRIPT: Turn[] = [
  { speaker: "Interviewer", text: "Thanks for doing this. Can you tell me about the last time you had to find a room you had never been to?" },
  { speaker: "Participant", text: "Yeah, it was the first week. I had a class in the Fine Arts building and I walked around the whole outside twice because the entrance faces the parking lot, not the main path." },
  { speaker: "Interviewer", text: "What did you do when you realised you were lost?" },
  { speaker: "Participant", text: "I opened the campus map app, but it just shows a blue dot and the building name. It does not tell me which door to use or which floor the room is on." },
  { speaker: "Interviewer", text: "Did you ask anyone for help?" },
  { speaker: "Participant", text: "Not at first. I felt embarrassed asking, everyone else looked like they knew where they were going. Finally a student with a lanyard walked me up the stairs." },
  { speaker: "Interviewer", text: "What would have made that easier?" },
  { speaker: "Participant", text: "Signs at the doors with the room numbers on each floor. And a map that shows the inside of the building, not just the outside." },
];

/** A lab with fake people, last week's and this week's check-ins, an overtime window, a leaver, and one interview transcript. Safe to click twice. */
export async function loadDemoLab(labId: string): Promise<boolean> {
  const before = await loadLab(labId);
  if (before.people.some((p) => p.email.endsWith("@demo.invalid"))) return false;

  await addSamples(labId);
  const projects = new Map((await list("projects", { col: "lab_id", eq: labId })).map((p) => [p.name, p]));
  await update("projects", projects.get(WAY)!.id, { irb_status: "approved", irb_ref: "IRB-2026-0412", irb_date: addDays(WEEK, -40), participant_target: 12 });
  await update("projects", projects.get(THESIS)!.id, { irb_status: "approved", irb_ref: "IRB-2026-0377", irb_date: addDays(WEEK, -90), participant_target: 8 });
  const ids = new Map<string, string>();
  for (const { name, project, program } of PEOPLE) {
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@demo.invalid`;
    const row = await insert("people", { lab_id: labId, auth_user_id: null, invited_at: new Date().toISOString(), name, email, role: "ra", weekly_hours: 10, max_tasks: 5, status: "active", leaving_on: null, program });
    ids.set(name, row.id);
    await insert("project_members", { project_id: projects.get(project)!.id, person_id: row.id });
  }

  // who owns which open task (one is left unassigned on purpose, for the plan and workload screens)
  const owners: Record<string, string> = {
    "Follow up with non-responders": "Ana Kim", "Schedule the remaining sessions": "Ben Okafor", "Transcribe the pilot interview": "Chloe Martin",
    "Code themes from the first transcripts": "Farah Ali", "Code the survey responses": "Dev Patel", "Draft the findings chapter": "Dev Patel",
  };
  for (const t of await list("tasks", { col: "project_id", in: [...projects.values()].map((p) => p.id) })) {
    if (owners[t.title]) await update("tasks", t.id, { assignee: ids.get(owners[t.title])! });
  }

  await insert("overtime", { person_id: ids.get("Chloe Martin")!, reason: "Conference poster deadline", starts: WEEK, ends: addDays(WEEK, 6) });
  await update("people", ids.get("Farah Ali")!, { status: "leaving", leaving_on: addDays(WEEK, 21) });

  // check-ins: Emi has not sent hers, so she shows up as missing
  const submit = async (name: string, week: string, said: Said, at: string) => {
    const project = projects.get(PEOPLE.find((p) => p.name === name)!.project)!;
    const text = composeText([{ projectName: project.name, challenges: said.challenges, plans: said.plans, support: said.support ?? "", needsTasks: said.needsTasks ?? false, done: said.done ?? [] }]);
    const parsed = groundedQuotes(heuristicParse(text, [{ name: project.name, phase: project.current_phase }]), text);
    const raw = { text, fields: [] };
    const done = { raw, parsed, submitted_at: at };
    const open = parsed.projects.flatMap((p) => p.blockers.map((b) => ({ quote: b.quote, phase: p.phase ?? project.current_phase })));
    for (const b of open) await insert("blockers", { project_id: project.id, phase: b.phase, person_id: ids.get(name)!, quote: b.quote, opened_at: at, resolved_at: week === WEEK ? null : at });
    return done;
  };
  await ensureWeekCheckins(labId);
  const now = new Date().toISOString();
  const rows = await list("checkins", { col: "person_id", in: [...ids.values()] });
  for (const [name, said] of Object.entries(THIS_WEEK)) {
    const row = rows.find((c) => c.person_id === ids.get(name) && c.week === WEEK);
    if (row) await update("checkins", row.id, await submit(name, WEEK, said, now));
  }
  for (const [name, said] of Object.entries(LAST_WEEK)) {
    const week = addDays(WEEK, -7);
    const at = `${addDays(WEEK, -4)}T15:00:00.000Z`;
    await insert("checkins", { person_id: ids.get(name)!, week, token: `ck-${crypto.randomUUID().replace(/-/g, "")}`, reminders_sent: 0, ...(await submit(name, week, said, at)) });
  }

  // three interviews of twelve planned; P2 and P3 are short on purpose
  const interviews: { label: string; title: string; turns: Turn[]; sec: number }[] = [
    { label: "P1", title: "Interview P1: finding rooms on campus", turns: TRANSCRIPT, sec: 312 },
    { label: "P2", title: "Interview P2: first week lost", sec: 268, turns: [
      { speaker: "Interviewer", text: "How did you find your classes in the first week?" },
      { speaker: "Participant", text: "Mostly by following other students. The building numbers on the map did not match the signs on the doors." },
      { speaker: "Interviewer", text: "What did that feel like?" },
      { speaker: "Participant", text: "Stressful. I arrived late to my first lab because I went to the wrong wing." },
    ] },
    { label: "P3", title: "Interview P3: using the campus app", sec: 341, turns: [
      { speaker: "Interviewer", text: "Do you use the campus app to get around?" },
      { speaker: "Participant", text: "Only to look up the building. Once I am inside it is no help, there is no floor plan." },
      { speaker: "Interviewer", text: "What would you change?" },
      { speaker: "Participant", text: "Show me the room on a floor map, and the nearest stairs." },
    ] },
  ];
  for (const i of interviews) {
    await insert("files", {
      lab_id: labId, kind: "interview", person_id: null, project_id: projects.get(WAY)!.id, checkin_id: null, title: i.title,
      storage_path: `demo/${crypto.randomUUID()}.wav`, duration_sec: i.sec, size_bytes: null, consent: true, participant_label: i.label, // no audio behind it: the page hides the player for demo/ paths
      transcript: i.turns, transcript_text: toText(i.turns), analysis: null, status: "ready", error: null, created_at: now,
    });
  }
  // four more people have signed up but not been interviewed yet (the sign-up list needs the v11 database update, so skip quietly without it)
  try {
    for (const [label, status] of [["P4", "signed_up"], ["P5", "scheduled"], ["P6", "signed_up"], ["P7", "signed_up"]] as const) {
      await insert("participants", { lab_id: labId, project_id: projects.get(WAY)!.id, label, status, created_at: now });
    }
  } catch {}
  return true;
}
