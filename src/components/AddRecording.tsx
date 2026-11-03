"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendRecording } from "@/lib/files-client";
import { Recorder } from "./Recorder";
import { Card } from "./ui";

const input = "w-full rounded-[14px] bg-bg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-crimson/30";

/** Professor side: record an interview live or upload audio. Needs a participant label and consent first. */
export function AddRecording({ projects, maxSec }: { projects: { id: string; name: string }[]; maxSec: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", projectId: "", label: "", consent: false });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function ready({ wav, seconds }: { wav: Blob; seconds: number }) {
    setError("");
    try {
      setBusy("Uploading…");
      await sendRecording(wav, seconds, { kind: "interview", title: f.title || `Interview ${f.label}`, projectId: f.projectId || null, participantLabel: f.label, consent: true });
      setF({ title: "", projectId: "", label: "", consent: false });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setBusy("");
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-crimson px-[18px] py-2.5 text-sm font-semibold text-white">+ Add a recording</button>;
  const ok = f.label.trim() !== "" && f.consent;
  return (
    <Card className="flex w-full flex-col gap-3">
      <h2 className="font-heading text-xl font-bold">Add a recording</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={input} placeholder="Title (optional)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <select className={input} value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })}>
          <option value="">No project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input className={input} placeholder="Participant label, e.g. P3 (no real names)" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
      </div>
      <label className="flex items-start gap-2.5 text-[13px]">
        <input type="checkbox" className="mt-0.5" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />
        <span>The participant agreed to be recorded and to the audio being transcribed by an AI model.</span>
      </label>
      {busy ? <p className="text-sm font-semibold text-crimson">{busy}</p> : <Recorder maxSec={maxSec} allowUpload disabled={!ok} onReady={ready} />}
      {!ok && !busy && <p className="text-xs text-muted">Add a label and tick the box to start. Up to {Math.round(maxSec / 60)} minutes per recording; record longer talks in parts.</p>}
      {error && <p className="text-[13px] text-crimson">{error}</p>}
      {!busy && <button type="button" onClick={() => setOpen(false)} className="self-start text-[13px] font-semibold text-muted">Cancel</button>}
    </Card>
  );
}
