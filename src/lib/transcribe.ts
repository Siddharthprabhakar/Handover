import { z } from "zod";
import { museConfig } from "./muse";
import type { Turn } from "./seed";

// Longest recording we accept, in seconds. Meta's limit is 10 minutes; Gemini takes audio inline in the request, so we stay shorter.
export const MAX_SEC = Number(process.env.FILES_MAX_SEC ?? 300);
export const VOICE_CHECKIN_SEC = 120;

const { BASE, KEY } = museConfig;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const Turns = z.object({ turns: z.array(z.object({ speaker: z.string().nullable(), text: z.string() })) });

/** Speech to text for a 16 kHz mono WAV. Meta's Voice Transcribe when Meta is the provider, otherwise any OpenAI-compatible model that accepts audio (Gemini). */
export async function transcribe(wav: ArrayBuffer, diarize: boolean): Promise<Turn[]> {
  if (!KEY || process.env.MUSE_MOCK === "1") throw new Error("Transcription needs a live model key (MUSE_MOCK=0)");
  return BASE.includes("api.meta.ai") ? metaAsr(wav, diarize) : chatAsr(wav, diarize);
}

async function metaAsr(wav: ArrayBuffer, diarize: boolean): Promise<Turn[]> {
  const form = new FormData();
  form.append("request", new Blob([JSON.stringify({ model: "muse-voice-transcribe-1.0", audioEncoding: "WAV", mode: diarize ? "DIARIZATION" : "PUSH_TO_TALK" })], { type: "application/json" }));
  form.append("audio", new Blob([wav], { type: "audio/wav" }), "audio.wav");
  const res = await fetch(`${BASE}/asr/transcribe`, { method: "POST", headers: { authorization: `Bearer ${KEY}` }, body: form, signal: AbortSignal.timeout(280_000) });
  if (!res.ok) throw new Error(`Transcribe ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { transcript?: string; turns?: { transcript: string; speaker?: string }[] };
  const turns = (data.turns ?? []).filter((t) => t.transcript?.trim()).map((t) => ({ speaker: t.speaker ?? null, text: t.transcript.trim() }));
  if (turns.length) return turns;
  return data.transcript?.trim() ? [{ speaker: null, text: data.transcript.trim() }] : [];
}

async function chatAsr(wav: ArrayBuffer, diarize: boolean): Promise<Turn[]> {
  const model = process.env.MUSE_ASR_MODEL ?? museConfig.MODEL;
  const ask = diarize
    ? "Transcribe this recording word for word. Start a new turn each time the speaker changes and label speakers A, B, C in order of first appearance."
    : "Transcribe this recording word for word as one turn. Use null for the speaker.";
  const body = JSON.stringify({
    model,
    response_format: { type: "json_schema", json_schema: { name: "transcript", schema: z.toJSONSchema(Turns) } },
    messages: [{ role: "user", content: [{ type: "text", text: `${ask} Fix nothing and add nothing. If there is no speech, return no turns.` }, { type: "input_audio", input_audio: { data: Buffer.from(wav).toString("base64"), format: "wav" } }] }],
  });
  let res!: Response;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(`${BASE}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` }, body, signal: AbortSignal.timeout(120_000) });
    if (res.status !== 429 && res.status < 500) break;
    await sleep(2000 * (attempt + 1));
  }
  if (!res.ok) throw new Error(`Transcribe ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = (await res.json())?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Transcription returned no text");
  return Turns.parse(JSON.parse(text)).turns.filter((t) => t.text.trim()).map((t) => ({ speaker: diarize ? t.speaker : null, text: t.text.trim() }));
}

export const toText = (turns: Turn[]) => turns.map((t) => (t.speaker ? `${t.speaker}: ${t.text}` : t.text)).join("\n");
