"use client";

import { useState } from "react";
import { sendRecording, waitForTranscript } from "@/lib/files-client";
import { Recorder } from "./Recorder";

const MAX = 120;

/** Student side: record up to two minutes, get the words back, fix them, then send as usual. */
export function VoiceCheckin({ token, voice, onText }: { token: string; voice: string; onText: (text: string) => void }) {
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
    <div className="mt-3.5 flex flex-col gap-3 rounded-2xl bg-bg p-4">
      <div>
        <b className="text-sm">Say it instead</b>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">Talk for up to 2 minutes about your week, challenges and plans. Transcribed by {voice}, shown below so you can fix anything before you send. Your professor keeps the recording.</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-crimson-soft px-3.5 py-2.5 text-[13px] font-semibold text-crimson">{error}</p>}
      <div className="flex min-h-[44px] flex-wrap items-center gap-3 border-t border-line pt-3">
        {busy ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-crimson border-t-transparent" />
            <span className="text-sm font-semibold text-crimson">{busy}</span>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold">Cancel</button>
            <span className="flex-1" />
            <Recorder maxSec={MAX} onReady={ready} />
          </>
        )}
      </div>
    </div>
  );
}
