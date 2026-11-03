// The two rules the project promises in code, not in a prompt: workload limits and quotes that must exist in what the person wrote.
// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { groundedQuotes, type Parsed } from "../src/lib/checkin";
import { fits, type Load } from "../src/lib/limits";

const TODAY = "2026-11-03";
const person = (over: Partial<Load> = {}): Load => ({ id: "p1", name: "Ana Kim", tasks: 4, hours: 7, maxTasks: 5, weeklyHours: 10, ot: [], ...over });

test("a task that fits is allowed", () => assert.equal(fits(person(), 1, 3, TODAY).kind, "ok"));
test("a sixth task is refused", () => assert.equal(fits(person({ tasks: 5 }), 1, 1, TODAY).kind, "cap"));
test("going past 10 hours is refused", () => assert.equal(fits(person(), 1, 4, TODAY).kind, "cap"));
test("overtime lifts the weekly cap", () => assert.equal(fits(person({ tasks: 5, ot: [{ starts: "2026-11-02", ends: "2026-11-08" }] }), 1, 4, TODAY).kind, "overtime"));
test("nobody goes past 20 hours, even on overtime", () => assert.equal(fits(person({ hours: 18, ot: [{ starts: "2026-11-02", ends: "2026-11-08" }] }), 1, 3, TODAY).kind, "hardcap"));
test("the week after overtime is a recovery week with no new tasks", () => assert.equal(fits(person({ ot: [{ starts: "2026-10-20", ends: "2026-11-01" }] }), 1, 1, TODAY).kind, "recovery"));

test("a quote the person never wrote is dropped, a real one is kept", () => {
  const parsed = { projects: [{ project: "Study", phase: 3, done: [], next: [], support: [], needs_tasks: false, blockers: [{ quote: "I am blocked on the audio recorder" }, { quote: "my advisor ignores me" }] }] } as unknown as Parsed;
  const kept = groundedQuotes(parsed, "I am blocked on the audio recorder, it keeps cutting out.").projects[0].blockers.map((b) => b.quote);
  assert.deepEqual(kept, ["I am blocked on the audio recorder"]);
});

test("a synthesis quote that is not in the participant's transcript is removed, and a theme left with none is dropped", async () => {
  const { groundSynthesis } = await import("../src/lib/synthesis");
  const interviews = [{ participant: "P1", title: "Interview P1", text: "I walked around the whole outside twice because the entrance faces the parking lot." }];
  const r = {
    themes: [
      { title: "Hidden entrances", summary: "s", rq: 1, evidence: [{ participant: "P1", quote: "the entrance faces the parking lot" }] },
      { title: "Invented", summary: "s", rq: 1, evidence: [{ participant: "P1", quote: "the campus map app is completely useless" }] },
    ],
    coverage: [{ rq: 1, participants: 5, note: "" }],
    gaps: [],
  } as unknown as Parameters<typeof groundSynthesis>[0];
  const out = groundSynthesis(r, interviews, 1);
  assert.deepEqual(out.themes.map((t) => t.title), ["Hidden entrances"]);
  assert.equal(out.coverage[0].participants, 1); // counted in code from surviving quotes, not the 5 the model claimed
});
