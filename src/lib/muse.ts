import type { z } from "zod";
import { MOCK } from "./mock";
import { schemas, type JobName } from "./schemas";
import { SYSTEM } from "./prompts";

const BASE = process.env.MUSE_BASE_URL ?? "https://api.meta.ai/v1";
const MODEL = process.env.MUSE_MODEL ?? "muse-spark-1.3";
const KEY = process.env.MODEL_API_KEY;

export const museMode = () => (process.env.MUSE_MOCK === "1" || !KEY ? "mock" : "live");

async function chat(system: string, user: string): Promise<string> {
  // OpenAI-compatible Chat Completions. Not yet verified against our key: see docs/BUILD_PLAN.md day-one checklist.
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Muse ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Muse returned no text");
  return text;
}

const extractJson = (s: string) => JSON.parse(s.replace(/^```(?:json)?\s*|\s*```$/g, "").trim());

/** Run one Muse job and return validated JSON. Retries once on bad output. */
export async function museJson<J extends JobName>(job: J, user: string): Promise<z.infer<(typeof schemas)[J]>> {
  type R = z.infer<(typeof schemas)[J]>;
  const schema = schemas[job] as z.ZodType;
  if (museMode() === "mock") return schema.parse(MOCK[job]) as R;
  let prompt = user;
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return schema.parse(extractJson(await chat(SYSTEM, prompt))) as R;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      prompt = `${user}\n\nYour previous reply was invalid (${lastError.slice(0, 200)}). Reply with valid JSON only.`;
    }
  }
  throw new Error(`Muse job "${job}" failed after retry: ${lastError}`);
}
