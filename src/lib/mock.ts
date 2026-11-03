import type { JobName } from "./schemas";

// Saved sample answers, used when MUSE_MOCK=1 or no API key is set.
export const MOCK: Record<JobName, unknown> = {
  filing: { project: null, title: "Recording", reason: "" },
  synthesis: { themes: [], coverage: [], gaps: [] },
  projectplan: { name: "Imported project", kind: "lab", goal: "", deadline: null, phases: [], resources: [], communication: [] },
  interview: { summary: "Sample analysis. Turn on a live model to analyse a real recording.", themes: [], follow_ups: [] },
  summary: {
    summary: "The project is in its middle phase. Planning and recruitment are finished and interviews are under way.",
    progress: "Planning and recruitment are done; interviews are about a third complete.",
    risks: ["Recruitment is slower than planned."],
    next_steps: ["Re-post the flyer", "Schedule the remaining sessions"],
  },
  checkin: {
    projects: [
      {
        project: "Campus Wayfinding Study",
        done: ["Ran interview 4"],
        blockers: [{ quote: "I've emailed 14 people and only 2 replied. Not sure if the flyer is the problem." }],
        next: ["Keep recruiting"],
        support: [],
        phase: 3,
        needs_tasks: false,
      },
    ],
  },
  digest: {
    summary:
      "Most projects are on track. Wayfinding is slowing in Interview because recruitment is behind. Two people asked for help with thematic coding. Emi has not checked in on either project.",
    on_track: ["Chloe Park", "Farah Khan"],
    stuck: [{ person: "Ben Kaplan", quote: "I've emailed 14 people and only 2 replied. Not sure if the flyer is the problem." }],
    needs_tasks: ["Dev Mehta"],
    missing: ["Emi Sato"],
    support: ["Thematic coding walkthrough (Ana, Ben)"],
  },
  plan: {
    phases: [
      { name: "Plan", tasks: [{ title: "Write interview guide", hours: 3, owner: "Ana Ortiz" }, { title: "Draft IRB consent script", hours: 3, owner: "Ana Ortiz" }] },
      { name: "Recruit", tasks: [{ title: "Flyer and mailing list", hours: 3, owner: "Ben Kaplan" }, { title: "Screener survey", hours: 2, owner: "Ben Kaplan" }] },
      { name: "Interview", tasks: [{ title: "Run 12 sessions", hours: 18, owner: "Ben Kaplan" }, { title: "Notes after each session", hours: 6, owner: "Emi Sato" }] },
      { name: "Synthesize", tasks: [{ title: "Transcribe and code themes", hours: 16, owner: "Ana Ortiz" }] },
      { name: "Design", tasks: [{ title: "Wayfinding recommendations", hours: 10, owner: "Farah Khan" }] },
      { name: "Test", tasks: [{ title: "Check ideas with 5 students", hours: 8, owner: "Dev Mehta" }] },
      { name: "Report", tasks: [{ title: "Final report and handoff notes", hours: 6, owner: "Farah Khan" }] },
    ],
  },
  questions: {
    questions: [
      { text: "Which GitHub repos and branches did you maintain, and what changed in each?", source: "From 3 code tasks" },
      { text: "Where are the interview recordings and transcripts backed up, and who has access?", source: "From: Transcribe pilot interview" },
      { text: "Where is the participant tracker, and who still needs a follow-up?", source: "From: Follow up with non-responders" },
      { text: "What decisions did you make or recommend, and why?", source: "From the decision log" },
      { text: "Which accounts, tools or credentials should be handed back or rotated?", source: "Access" },
      { text: "What would you tell the next person on their first day?", source: "Always asked" },
      { text: "Is there anything you were still figuring out, or felt unsupported on?", source: "Always asked" },
    ],
    thanks:
      "Ben, thank you for your work on the Wayfinding study: running the first four interviews, setting up recruitment, and posting the flyer. The next person will start from what you built. We wish you well.",
  },
  brief: {
    where_we_are: "Interview phase. 4 of 12 interviews done. Recruitment is the blocker: 2 of 14 people replied.",
    contributed: "Ran interviews 1–4, set up recruitment and posted the flyer, edited the IRB consent script with Ana, transcribed the pilot interview.",
    code_and_backups: [
      { name: "wayfinding-analysis", detail: "main · transcript cleaner, coding-sheet export (3 PRs)", backup: "GitHub + weekly Drive backup" },
      { name: "Interview audio", detail: "raw recordings", backup: "Lab Drive / Interviews / raw" },
    ],
    decisions: "12 participants, not 20, because of the spring deadline. IRB consent script approved Oct 26.",
    open_work: "Re-post the flyer and follow up with 12 non-responders. Ask Ana about IRB and consent, Dr. Rivera about scope.",
    advice: "Start recruitment earlier and test the flyer wording with two people first.",
    unanswered: ["Participant tracker location"],
  },
};
