// Runs every Muse job and the speech-to-text call once against whatever model .env.local points at.
// Prints only ok/FAILED, timings and error messages. Never prints a key.
import { museJson, museStatus } from "../src/lib/muse";
import { briefPrompt, checkinPrompt, digestPrompt, filingPrompt, interviewPrompt, planPrompt, projectPlanPrompt, questionsPrompt, summaryPrompt, synthesisPrompt } from "../src/lib/prompts";
import { transcribe } from "../src/lib/transcribe";

const status = museStatus();
console.log(`provider ${status.provider} · model ${status.model} · ${status.live ? "live" : "MOCK (no key, or MUSE_MOCK=1)"}\n`);

const ctx = { person: "Farah Ali", project: "Campus Wayfinding Study", done: ["Write the interview guide", "Build the codebook v1"], open: ["Code themes from P1 to P3"], blockers: ["recorder cuts out"] };
const transcript = "Interviewer: Tell me about finding a room.\nParticipant: I walked around the whole outside twice because the entrance faces the parking lot.\nInterviewer: What would help?\nParticipant: Signs at the doors with the room numbers on each floor.";

const jobs: [string, () => Promise<unknown>][] = [
  ["checkin", () => museJson("checkin", checkinPrompt("Project: Campus Wayfinding Study\nChallenges: I emailed 14 people and only 2 replied.\nPlans for next week: Re-post the flyer.", [{ name: "Campus Wayfinding Study", phases: ["Plan", "Recruit", "Interview"] }]))],
  ["digest", () => museJson("digest", digestPrompt([{ name: "Ana Kim", projects: ["Campus Wayfinding Study"], checkin: "I emailed 14 people and only 2 replied.", reminders: 0, openTasks: 3, hours: 5, weeklyHours: 10 }], [{ person: "Ana Kim", project: "Campus Wayfinding Study", quote: "only 2 replied" }]))],
  ["plan", () => museJson("plan", planPrompt({ kind: "lab", name: "Library Survey", goal: "Survey students about study spaces", deadline: "2027-03-15", phases: ["Plan", "Recruit", "Collect"], people: [{ name: "Gabe Ruiz", openTasks: 2, hours: 7, weeklyHours: 10 }] }))],
  ["questions", () => museJson("questions", questionsPrompt(ctx))],
  ["brief", () => museJson("brief", briefPrompt(ctx, [{ question: "What should the next person know?", answer: "The recorder cuts out after ten minutes, use the backup." }]))],
  ["summary", () => museJson("summary", summaryPrompt(ctx))],
  ["interview", () => museJson("interview", interviewPrompt(transcript, { title: "Interview P1", project: "Campus Wayfinding Study" }))],
  ["projectplan", () => museJson("projectplan", projectPlanPrompt("Study plan: recruit 12 students, interview them in November, synthesize in December, report in spring.", { today: "2026-11-03", people: ["Ana Kim", "Ben Okafor"] }))],
  ["synthesis", () => museJson("synthesis", synthesisPrompt({ name: "Campus Wayfinding Study", goal: "How first-year students find rooms" }, ["Where do students lose time finding rooms?"], [{ participant: "P1", text: transcript }]))],
  ["filing", () => museJson("filing", filingPrompt({ kind: "interview", title: "Untitled recording", text: transcript }, [{ name: "Campus Wayfinding Study", goal: "How first-year students find rooms", questions: [] }, { name: "Thesis: Voice UI", goal: "Voice assistants for older adults", questions: [] }]))],
];

// three seconds of a 440 Hz tone as a 16 kHz mono WAV: proves the speech-to-text endpoint accepts our audio format (a tone has no words, so an empty transcript is fine)
function tone() {
  const n = 16000 * 3;
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / 16000) * 8000), 44 + i * 2);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}
jobs.push(["speech-to-text", async () => (await transcribe(tone(), true)).length + " turns"]);

async function main() {
  let failed = 0;
  for (const [name, run] of jobs) {
    const t = Date.now();
    try {
      const out = await run();
      console.log(`ok      ${name.padEnd(15)} ${((Date.now() - t) / 1000).toFixed(1)}s${typeof out === "string" ? `  (${out})` : ""}`);
    } catch (e) {
      failed++;
      console.log(`FAILED  ${name.padEnd(15)} ${e instanceof Error ? e.message.slice(0, 220) : e}`);
    }
  }
  console.log(`\n${failed === 0 ? "All jobs passed" : `${failed} of ${jobs.length} failed`} on ${status.provider}.`);
  if (status.provider !== "Meta") console.log("NOTE: this ran on " + status.provider + ", not Meta. Point .env.local at Meta (remove MUSE_BASE_URL, MUSE_MODEL=muse-spark-1.3) and run again.");
  process.exit(failed ? 1 : 0);
}
main();
