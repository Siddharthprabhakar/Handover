import { z } from "zod";
import { MOCK } from "./mock";
import { schemas, type JobName } from "./schemas";
import { SYSTEM } from "./prompts";

const BASE = process.env.MUSE_BASE_URL ?? "https://api.meta.ai/v1";
const MODEL = process.env.MUSE_MODEL ?? "muse-spark-1.3";
const KEY = process.env.MODEL_API_KEY;
// Muse thinks before it answers, which takes several seconds, so keep that short. Other providers (OpenAI, Groq...) get no such field unless MUSE_REASONING is set.
const EFFORT = process.env.MUSE_REASONING ?? (BASE.includes("api.meta.ai") ? "minimal" : "");

export const museConfig = { BASE, MODEL, KEY };
/** What the app is running on, for the badge in the sidebar and the labels on transcripts. */
export function museStatus() {
  const meta = BASE.includes("api.meta.ai");
  const host = (() => { try { return new URL(BASE).hostname; } catch { return BASE; } })();
  return { live: museMode() === "live", provider: meta ? "Meta" : host.includes("googleapis") ? "Gemini" : host, model: MODEL, voice: meta ? "Muse Voice Transcribe" : "AI transcription" };
}
export const museMode = () => (process.env.MUSE_MOCK === "1" || !KEY ? "mock" : "live");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function chat(system: string, user: string, job: JobName): Promise<string> {
  // OpenAI-compatible Chat Completions (verified live against the Meta Model API and Gemini).
  const body = JSON.stringify({
    model: MODEL,
    ...(EFFORT ? { reasoning_effort: EFFORT } : {}),
    // the provider enforces our zod shape, so replies are valid JSON the first time
    response_format: { type: "json_schema", json_schema: { name: job, schema: z.toJSONSchema(schemas[job] as z.ZodType) } },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  // busy providers answer 429/5xx now and then (Gemini's free tier does): wait and try again
  let res!: Response;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(`${BASE}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` }, body, signal: AbortSignal.timeout(60_000) });
    if (res.status !== 429 && res.status < 500) break;
    await sleep(1500 * (attempt + 1));
  }
  if (!res.ok) throw new Error(`Muse ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Muse returned no text");
  return text;
}

const extractJson = (s: string) => JSON.parse(s.replace(/^```(?:json)?\s*|\s*```$/g, "").trim());

// shortcut: counted per server instance, so the real ceiling is this number times the instances; move to a table if traffic grows.
const CALLS_PER_HOUR = Number(process.env.MUSE_CALLS_PER_HOUR ?? 150);
const usage = globalThis as { __museCalls?: { hour: number; n: number } };
/** True while this hour's model budget (Muse jobs and transcriptions) has room. Protects the free credits from loops and curious clicking. */
export function museAllowed() {
  const hour = Math.floor(Date.now() / 3_600_000);
  const c = (usage.__museCalls = usage.__museCalls?.hour === hour ? usage.__museCalls : { hour, n: 0 });
  return ++c.n <= CALLS_PER_HOUR;
}

/** Run one Muse job and return validated JSON. Retries once on bad output. */
export async function museJson<J extends JobName>(
  job: J,
  user: string,
  fallback?: z.infer<(typeof schemas)[J]>, // mock mode: a rule-based answer computed from the real input, instead of the saved sample
): Promise<z.infer<(typeof schemas)[J]>> {
  type R = z.infer<(typeof schemas)[J]>;
  const schema = schemas[job] as z.ZodType;
  if (museMode() === "mock") return schema.parse(fallback ?? MOCK[job]) as R;
  if (!museAllowed()) {
    if (fallback) return schema.parse(fallback) as R; // the rule-based answer keeps the page working
    throw new Error("Muse has reached its hourly limit. Try again in a few minutes.");
  }
  let prompt = user;
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return schema.parse(extractJson(await chat(SYSTEM, prompt, job))) as R;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      prompt = `${user}\n\nYour previous reply was invalid (${lastError.slice(0, 200)}). Reply with valid JSON only.`;
    }
  }
  throw new Error(`Muse job "${job}" failed after retry: ${lastError}`);
}
