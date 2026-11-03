"use client";

import { createBrowserSupabase } from "./supabase/browser";

type Meta = { token?: string; kind: "voice_checkin" | "interview" | "upload"; title?: string; projectId?: string | null; participantLabel?: string; consent?: boolean };

async function post(url: string, body: object) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

/** Register the recording, upload the audio straight to storage, then start transcribing. Returns the file id. */
export async function sendRecording(wav: Blob, seconds: number, meta: Meta): Promise<string> {
  const start = await post("/api/files/start", { ...meta, size: wav.size, durationSec: seconds });
  const { error } = await createBrowserSupabase().storage.from("recordings").uploadToSignedUrl(start.path, start.uploadToken, wav, { contentType: "audio/wav" });
  if (error) throw new Error("The upload failed. Check your connection and try again.");
  await post("/api/files/transcribe", { id: start.id, token: meta.token });
  return start.id;
}

/** Wait for the transcript. Resolves with the text, rejects with the reason. */
export async function waitForTranscript(id: string, token?: string): Promise<string> {
  for (let i = 0; i < 100; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`/api/files/status?id=${id}${token ? `&token=${encodeURIComponent(token)}` : ""}`);
    const s = await res.json().catch(() => ({}));
    if (s.status === "ready") return s.text ?? "";
    if (s.status === "failed") throw new Error(s.error ?? "Transcription failed");
  }
  throw new Error("Transcription is taking too long. Try again later.");
}
