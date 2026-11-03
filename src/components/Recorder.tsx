"use client";

import { useEffect, useRef, useState } from "react";
import { toWav16k } from "@/lib/wav";

type Result = { wav: Blob; seconds: number };

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Record from the microphone (or pick an audio file) and hand back a 16 kHz WAV. Stops by itself at maxSec. */
export function Recorder({ maxSec, onReady, allowUpload = false, disabled = false }: { maxSec: number; onReady: (r: Result) => void; allowUpload?: boolean; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "recording" | "converting">("idle");
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    rec.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  async function convert(blob: Blob) {
    setState("converting");
    try {
      const r = await toWav16k(blob);
      if (r.seconds > maxSec + 2) throw new Error(`That is ${clock(Math.round(r.seconds))} long. The limit is ${clock(maxSec)}.`);
      onReady(r);
    } catch (e) {
      setError(e instanceof Error && e.message.includes("limit") ? e.message : "This audio could not be read. Try recording again.");
    }
    setState("idle");
  }

  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return setError("This browser cannot record. Try Chrome or Safari, over a secure (https) link.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timer.current) clearInterval(timer.current);
        convert(new Blob(chunks, { type: mr.mimeType }));
      };
      mr.start();
      rec.current = mr;
      setSecs(0);
      setState("recording");
      timer.current = setInterval(() => setSecs((s) => (s + 1 >= maxSec ? (mr.state === "recording" && mr.stop(), s + 1) : s + 1)), 1000);
    } catch {
      setError("The microphone is blocked. Allow it in the browser's address bar, then try again.");
    }
  }

  const btn = "rounded-full px-4 py-2 text-[13px] font-semibold disabled:opacity-50";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2.5">
        {state === "idle" && (
          <button type="button" disabled={disabled} onClick={start} className={`${btn} bg-crimson text-white`}>● Record</button>
        )}
        {state === "recording" && (
          <>
            <button type="button" onClick={() => rec.current?.stop()} className={`${btn} bg-dark text-white`}>■ Stop</button>
            <span className="text-sm font-semibold tabular-nums text-crimson">{clock(secs)} / {clock(maxSec)}</span>
          </>
        )}
        {state === "converting" && <span className="text-sm text-muted">Preparing the audio…</span>}
        {allowUpload && state === "idle" && (
          <label className={`${btn} cursor-pointer border border-line text-ink ${disabled ? "pointer-events-none opacity-50" : ""}`}>
            Upload audio
            <input type="file" accept="audio/*" className="hidden" disabled={disabled} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) convert(f); }} />
          </label>
        )}
      </div>
      {error && <p className="text-[13px] text-crimson">{error}</p>}
    </div>
  );
}
