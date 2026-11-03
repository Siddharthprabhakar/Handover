import { composeText, groundedQuotes, heuristicParse } from "./checkin";
import { insert, list, update } from "./db";
import { WEEK } from "./demo";
import { loadLab } from "./lab";
import { ensureWeekCheckins } from "./reminders";
import type { Turn } from "./seed";
import { toText } from "./transcribe";

const WAY = "Campus Wayfinding Study";
const THESIS = "Thesis: Voice UI for Older Adults";
const LIB = "Library Study Spaces Survey";

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const w = (n: number) => addDays(WEEK, n); // a date n days from this Monday

// All names are made up. The .invalid addresses can never receive mail; sendMail refuses them.
const PEOPLE = [
  { name: "Ana Kim", program: "PhD student", projects: [WAY] },
  { name: "Ben Okafor", program: "Master's student", projects: [WAY] },
  { name: "Chloe Martin", program: "PhD student", projects: [WAY] },
  { name: "Emi Tanaka", program: "Undergraduate", projects: [WAY, LIB] },
  { name: "Farah Ali", program: "Master's student", projects: [WAY] },
  { name: "Dev Patel", program: "Master's student", projects: [THESIS] },
  { name: "Priya Raman", program: "PhD student", projects: [LIB] },
  { name: "Gabe Ruiz", program: "Undergraduate", projects: [LIB] },
];

// [phase, title, hours, owner or null, status, due]
type T = [number, string, number, string | null, "open" | "done", string | null];

const PROJECTS = [
  {
    name: WAY, kind: "lab" as const, phase: 3, deadline: "2027-05-02", irb: ["approved", "IRB-2026-0412", -40] as const, target: 12,
    goal: "How first-year students find rooms inside campus buildings, and what is missing from the signs and the campus app. 12 interviews, then design implications and a small prototype test, finished by the end of spring.",
    phases: ["Plan", "Recruit", "Interview", "Synthesize", "Design", "Test", "Report"],
    due: [-60, -35, 28, 49, 77, 105, 133],
    questions: ["Where do first-year students lose time or confidence when looking for a room inside a building?", "Which cues (signs, maps, other people, the app) do they actually rely on, and which do they ignore?", "What would an indoor wayfinding aid need to show to help someone on their first week?"],
    notes: { resources: ["Interview guide v3 and consent script: Shared drive > Wayfinding > Protocol", "Recorder kit: Room 3.12 (two recorders and a backup battery)", "Codebook v1: Shared drive > Wayfinding > Analysis"], communication: ["Weekly sync, Tuesdays 10:30, Room 3.12 or Teams", "Questions between meetings: lab Slack, channel #wayfinding", "Recruitment emails go through Ana so participants hear from one person"] },
    tasks: [
      [1, "Write the interview guide", 3, "Farah Ali", "done", w(-63)], [1, "Draft the consent script and information sheet", 3, "Ana Kim", "done", w(-56)],
      [1, "Get IRB approval for the consent script", 2, "Ana Kim", "done", w(-40)], [1, "Pilot the guide with two classmates", 2, "Ben Okafor", "done", w(-36)],
      [2, "Design the recruitment flyer", 2, "Emi Tanaka", "done", w(-30)], [2, "Post flyers in six residence halls", 2, "Emi Tanaka", "done", w(-24)],
      [2, "Send the invitation to the first-year mailing list", 1, "Ana Kim", "done", w(-21)],
      [3, "Run interviews P1 to P3", 6, "Ben Okafor", "done", w(-10)],
      [3, "Test the backup recorder and fix the audio cutting out", 1, "Ben Okafor", "open", w(1)],
      [3, "Follow up with non-responders", 2, "Ana Kim", "open", w(4)],
      [3, "Email the department mailing lists for the second recruitment wave", 1, "Ana Kim", "open", w(2)],
      [3, "Schedule interviews P5 to P12", 2, "Ben Okafor", "open", w(3)],
      [3, "Run interviews P4 to P6", 5, "Ben Okafor", "open", w(11)],
      [3, "Transcribe the P1 to P3 recordings", 4, "Chloe Martin", "open", w(3)],
      [3, "Code themes from the P1 to P3 transcripts using codebook v1", 4, "Farah Ali", "open", w(6)],
      [3, "Write codebook notes for whoever takes over the coding", 1, "Farah Ali", "open", w(10)],
      [3, "Draft the conference poster with preliminary findings", 5, "Chloe Martin", "open", w(5)],
      [4, "Build an affinity map of themes across interviews", 4, null, "open", w(35)],
      [4, "Write one synthesis memo per research question", 5, null, "open", w(45)],
      [4, "Draft design implications for an indoor wayfinding aid", 3, null, "open", w(49)],
      [5, "Sketch three indoor map concepts", 8, null, "open", w(63)],
      [5, "Build a clickable prototype of the strongest concept", 10, null, "open", w(77)],
      [6, "Recruit five first-year students for a prototype test", 3, null, "open", w(84)],
      [6, "Run and record the five prototype sessions", 10, null, "open", w(98)],
      [7, "Write the study report", 12, null, "open", w(125)],
    ] as T[],
    meetings: [{ title: "Wayfinding sync", weekday: 1, on: null, starts: "10:30", min: 45, place: "Room 3.12" }, { title: "Poster rehearsal", weekday: null, on: w(11), starts: "15:00", min: 60, place: "Room 3.12" }],
  },
  {
    name: THESIS, kind: "thesis" as const, phase: 5, deadline: "2027-04-22", irb: ["approved", "IRB-2026-0377", -90] as const, target: 8,
    goal: "A master's thesis on how older adults recover when a voice assistant misunderstands them, based on 8 usability sessions and a follow-up survey. Advised by the professor.",
    phases: ["Proposal", "Literature", "Method", "Data", "Analysis", "Writing", "Defense"],
    due: [-150, -110, -80, -21, 21, 63, 90],
    questions: ["What strategies do older adults use to repair a voice assistant's misunderstanding?", "Which repair strategies lead to success without help from another person?"],
    notes: { resources: ["Zotero group: Voice UI thesis (62 papers)", "Session recordings: Files > Thesis: Voice UI for Older Adults"], communication: ["Advisor check-in, Fridays 11:00", "Draft chapters go to the professor as a shared doc, one week before each check-in"] },
    tasks: [
      [1, "Draft and defend the proposal", 8, "Dev Patel", "done", w(-150)], [2, "Write the literature review", 10, "Dev Patel", "done", w(-110)],
      [3, "Write the method chapter and get IRB approval", 8, "Dev Patel", "done", w(-80)], [4, "Run the 8 usability sessions", 16, "Dev Patel", "done", w(-28)],
      [4, "Send and collect the follow-up survey", 3, "Dev Patel", "done", w(-10)],
      [5, "Code the survey responses", 4, "Dev Patel", "open", w(4)], [5, "Analyse the session recordings for repair strategies", 3, "Dev Patel", "open", w(8)],
      [5, "Draft the findings chapter", 8, null, "open", w(21)],
      [6, "Write the discussion chapter", 12, null, "open", w(49)], [6, "Write limitations and future work", 4, null, "open", w(60)],
      [7, "Prepare the defense slides and rehearse twice", 6, null, "open", w(85)],
    ] as T[],
    meetings: [{ title: "Thesis check-in with the professor", weekday: 4, on: null, starts: "11:00", min: 30, place: "Office 4.20" }],
  },
  {
    name: LIB, kind: "lab" as const, phase: 2, deadline: "2027-03-15", irb: ["exempt", "EX-2026-0188", -25] as const, target: null,
    goal: "A short survey on what students need from study spaces in the main library: noise, seating, outlets and booking. Results go to the library committee in March.",
    phases: ["Plan", "Recruit", "Collect", "Analyze", "Share"],
    due: [-30, 14, 42, 63, 80],
    questions: ["Which features of a study space (quiet, seating, power, booking) matter most to undergraduates?", "How do needs differ between group work and solo study?"],
    notes: { resources: ["Survey draft v2: Qualtrics > Library Study Spaces", "Poster template and QR codes: Shared drive > Library > Posters"], communication: ["Standup Wednesdays 13:00 in the lab", "Anything needing a decision goes to Priya, who reports to the professor"] },
    tasks: [
      [1, "Write the survey draft", 4, "Priya Raman", "done", w(-40)], [1, "Get the IRB exempt determination", 2, "Priya Raman", "done", w(-25)],
      [2, "Pretest the survey with three students and note confusing questions", 3, "Gabe Ruiz", "open", w(2)],
      [2, "Revise the survey after the pretest", 2, "Priya Raman", "open", w(4)],
      [2, "Print posters and place QR codes at the library entrances", 3, "Emi Tanaka", "open", w(3)],
      [2, "Staff the library entrance table for two lunch shifts", 4, "Gabe Ruiz", "open", w(9)],
      [3, "Monitor responses and send one reminder", 2, null, "open", w(28)],
      [4, "Clean the data and run the analysis script", 5, null, "open", w(49)], [4, "Write a two-page summary for the library committee", 4, null, "open", w(63)],
      [5, "Present to the library committee", 3, null, "open", w(78)],
    ] as T[],
    meetings: [{ title: "Library survey standup", weekday: 2, on: null, starts: "13:00", min: 20, place: "Lab" }],
  },
];

type Said = { project: string; challenges: string; plans: string; support?: string; needsTasks?: boolean; done?: string[] };
const THIS_WEEK: Record<string, Said> = {
  "Ana Kim": { project: WAY, challenges: "I emailed 14 people and only 2 replied, so I am stuck on recruitment. I am not sure the flyer is the problem.", plans: "Re-post the flyer and email the department lists.", support: "A short workshop on recruiting participants would help." },
  "Ben Okafor": { project: WAY, challenges: "Interview 3 went well. I am blocked on the audio recorder, it keeps cutting out after ten minutes.", plans: "Test the backup recorder and schedule the remaining sessions.", done: ["Run interviews P1 to P3"] },
  "Chloe Martin": { project: WAY, challenges: "Working extra this week for the conference poster, but the transcription is on track.", plans: "Finish transcribing P1 to P3 and a first poster draft." },
  "Farah Ali": { project: WAY, challenges: "Nothing blocking me. I am wrapping up before I leave and want the coding to be easy to pick up.", plans: "Code the first transcripts and write my handoff notes." },
  "Dev Patel": { project: THESIS, challenges: "Survey responses are all in. I have no plans for the discussion section yet and I need more tasks.", plans: "Code the survey responses.", needsTasks: true },
  "Priya Raman": { project: LIB, challenges: "The pretest feedback came back and two questions about booking are confusing. Waiting on the library to confirm the poster spots.", plans: "Revise the survey and confirm the poster spots." },
  "Gabe Ruiz": { project: LIB, challenges: "I could only find two students for the pretest so far. Exams are making it hard to find people.", plans: "Pretest with a third student and sign up for the entrance shifts." },
};
const LAST_WEEK: Record<string, Said> = {
  "Ana Kim": { project: WAY, challenges: "The flyers are up. Recruitment starts next week.", plans: "Send the mailing list invitation.", done: ["Send the invitation to the first-year mailing list"] },
  "Ben Okafor": { project: WAY, challenges: "I was stuck waiting for the room booking for the interviews.", plans: "Run interview 3 once the room is confirmed." },
  "Chloe Martin": { project: WAY, challenges: "Pilot interview recorded without problems.", plans: "Start the transcription." },
  "Dev Patel": { project: THESIS, challenges: "The survey is out. I am waiting for responses.", plans: "Check responses on Friday." },
  "Priya Raman": { project: LIB, challenges: "The IRB exempt determination came through, so I can move on to piloting.", plans: "Recruit three students for the pretest.", done: ["Get the IRB exempt determination"] },
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

/** A lab with fake people, three projects with phases, owned tasks, check-ins, meetings, an overtime window, a leaver and interview transcripts. Safe to click twice. */
export async function loadDemoLab(labId: string): Promise<boolean> {
  const before = await loadLab(labId);
  if (before.people.some((p) => p.email.endsWith("@demo.invalid"))) return false;
  const clash = before.projects.find((p) => PROJECTS.some((d) => d.name === p.name));
  if (clash) throw new Error(`"${clash.name}" already exists in this lab. Delete the sample projects first (or run supabase/reset_data.sql), then load the demo again.`);

  const now = new Date().toISOString();
  const projects = new Map<string, Awaited<ReturnType<typeof insert<"projects">>>>();
  for (const d of PROJECTS) {
    projects.set(d.name, await insert("projects", {
      lab_id: labId, name: d.name, kind: d.kind, goal: d.goal, phase_template: d.phases, current_phase: d.phase, deadline: d.deadline,
      phase_due: d.due.map((n) => w(n)), notes: d.notes, research_questions: d.questions,
      irb_status: d.irb[0], irb_ref: d.irb[1], irb_date: w(d.irb[2]), participant_target: d.target,
    }));
  }

  const ids = new Map<string, string>();
  for (const { name, program, projects: mine } of PEOPLE) {
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@demo.invalid`;
    const row = await insert("people", { lab_id: labId, auth_user_id: null, invited_at: now, name, email, role: "ra", weekly_hours: 10, max_tasks: 5, status: "active", leaving_on: null, program });
    ids.set(name, row.id);
    for (const p of mine) await insert("project_members", { project_id: projects.get(p)!.id, person_id: row.id });
  }

  for (const d of PROJECTS) {
    const pid = projects.get(d.name)!.id;
    for (const [phase, title, hours, owner, status, due] of d.tasks) await insert("tasks", { project_id: pid, phase, title, est_hours: hours, assignee: owner ? ids.get(owner)! : null, status, due });
    for (const m of d.meetings) await insert("meetings", { lab_id: labId, project_id: pid, title: m.title, weekday: m.weekday, on_date: m.on, starts: m.starts, duration_min: m.min, place: m.place, created_at: now });
  }
  await insert("meetings", { lab_id: labId, project_id: null, title: "Lab meeting", weekday: 3, on_date: null, starts: "14:00", duration_min: 60, place: "Seminar room 5", created_at: now });

  await insert("overtime", { person_id: ids.get("Chloe Martin")!, reason: "Conference poster deadline", starts: WEEK, ends: addDays(WEEK, 6) });
  await update("people", ids.get("Farah Ali")!, { status: "leaving", leaving_on: addDays(WEEK, 21) });

  // check-ins: Emi has not sent hers, so she shows up as missing
  const submit = async (name: string, week: string, said: Said, at: string) => {
    const project = projects.get(said.project)!;
    const text = composeText([{ projectName: project.name, challenges: said.challenges, plans: said.plans, support: said.support ?? "", needsTasks: said.needsTasks ?? false, done: said.done ?? [] }]);
    const parsed = groundedQuotes(heuristicParse(text, [{ name: project.name, phase: project.current_phase }]), text);
    const open = parsed.projects.flatMap((p) => p.blockers.map((b) => ({ quote: b.quote, phase: p.phase ?? project.current_phase })));
    for (const b of open) await insert("blockers", { project_id: project.id, phase: b.phase, person_id: ids.get(name)!, quote: b.quote, opened_at: at, resolved_at: week === WEEK ? null : at });
    return { raw: { text, fields: [] }, parsed, submitted_at: at };
  };
  await ensureWeekCheckins(labId);
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
      { speaker: "Interviewer", text: "Was there anything that helped?" },
      { speaker: "Participant", text: "A printed floor plan from the department office. I kept it in my bag for a month." },
    ] },
    { label: "P3", title: "Interview P3: using the campus app", sec: 341, turns: [
      { speaker: "Interviewer", text: "Do you use the campus app to get around?" },
      { speaker: "Participant", text: "Only to look up the building. Once I am inside it is no help, there is no floor plan." },
      { speaker: "Interviewer", text: "What would you change?" },
      { speaker: "Participant", text: "Show me the room on a floor map, and the nearest stairs." },
      { speaker: "Interviewer", text: "Would you trust it over asking a person?" },
      { speaker: "Participant", text: "If it was right twice, yes. After one wrong turn I would stop using it." },
    ] },
  ];
  for (const i of interviews) {
    await insert("files", {
      lab_id: labId, kind: "interview", person_id: null, project_id: projects.get(WAY)!.id, checkin_id: null, title: i.title,
      storage_path: `demo/${crypto.randomUUID()}.wav`, duration_sec: i.sec, size_bytes: null, consent: true, participant_label: i.label, // no audio behind it: the page hides the player for demo/ paths
      transcript: i.turns, transcript_text: toText(i.turns), analysis: null, status: "ready", error: null, created_at: now,
    });
  }
  // more people have signed up but not been interviewed yet (the sign-up list needs the v11 database update, so skip quietly without it)
  try {
    for (const [label, status] of [["P4", "signed_up"], ["P5", "scheduled"], ["P6", "scheduled"], ["P7", "signed_up"], ["P8", "signed_up"]] as const) {
      await insert("participants", { lab_id: labId, project_id: projects.get(WAY)!.id, label, status, created_at: now });
    }
  } catch {}
  return true;
}
