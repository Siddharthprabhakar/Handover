"use client";

import { useState } from "react";
import { sendRecording, waitForTranscript } from "@/lib/files-client";
import { Recorder } from "./Recorder";

const MAX = 120;

/** Student side: record up to two minutes, get the words back, fix them, then send as usual. */
export function VoiceCheckin({ token, onText }: { token: string; onText: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function ready({ wav, seconds }: { wav: Blob; seconds: number }) {
    setError("");
    try {
      setBusy("Uploading…");
      const id = await sendRecording(wav, seconds, { token, kind: "voice_checkin" });
      setBusy("Writing it out… this takes a few seconds");
      onText(await waitForTranscript(id, token));
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work. You can type instead.");
    }
    setBusy("");
  }

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3.5 rounded-full border border-line px-4 py-2 text-[13px] font-semibold">
        🎙 Say it instead
      </button>
    );
  return (
    <div className="mt-3.5 flex flex-col gap-2 rounded-2xl bg-bg p-4">
      <p className="text-[13px] text-muted">Talk for up to 2 minutes about your week, challenges and plans. We write it out below so you can fix anything before you send. Your professor keeps the recording.</p>
      {busy ? <p className="text-sm font-semibold text-crimson">{busy}</p> : <Recorder maxSec={MAX} onReady={ready} />}
      {error && <p className="text-[13px] text-crimson">{error}</p>}
      {!busy && <button type="button" onClick={() => setOpen(false)} className="self-start text-[13px] font-semibold text-muted">Cancel</button>}
    </div>
  );
}
