"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendRecording } from "@/lib/files-client";
import { Recorder } from "./Recorder";
import { Icon } from "./ui";

const input = "w-full rounded-[14px] bg-bg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-crimson/30";
const label = "flex flex-col gap-1.5 text-xs font-semibold text-muted";

/** A round record button floating at the bottom right. It opens a small dialog: record an interview live or upload audio. */
export function AddRecording({ projects, maxSec, defaultProjectId }: { projects: { id: string; name: string }[]; maxSec: number; defaultProjectId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", projectId: defaultProjectId ?? "", label: "", consent: false });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  // always start on the folder you are looking at, not the study picked last time
  function openDialog() {
    setF((x) => ({ ...x, projectId: defaultProjectId ?? "" }));
    setOpen(true);
  }

  async function ready({ wav, seconds }: { wav: Blob; seconds: number }) {
    setError("");
    try {
      setBusy("Uploading…");
      await sendRecording(wav, seconds, { kind: "interview", title: f.title || `Interview ${f.label}`, projectId: f.projectId || null, participantLabel: f.label, consent: true });
      setF({ title: "", projectId: defaultProjectId ?? "", label: "", consent: false });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setBusy("");
  }

  const ok = f.label.trim() !== "" && f.consent;
  return (
    <>
      <button type="button" onClick={openDialog} aria-label="Record or upload an interview" className="fixed bottom-6 right-6 z-30 grid h-14 w-14 place-items-center rounded-full bg-crimson text-white shadow-lg transition hover:scale-105">
        <Icon name="mic" className="h-6 w-6" />
      </button>
      {open && (
        <div className="fixed inset-0 z-40 flex overflow-auto bg-black/55 p-5" onClick={(e) => e.target === e.currentTarget && !busy && setOpen(false)}>
          <div className="m-auto flex w-full max-w-[480px] flex-col gap-4 rounded-[28px] bg-surface p-6 text-left">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-xl font-bold">Record an interview</h2>
                <p className="mt-0.5 text-[13px] text-muted">Record now or upload audio. Muse transcribes it and suggests where it belongs.</p>
              </div>
              {!busy && <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="-mr-1 px-1 text-lg leading-none text-muted">✕</button>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>Participant label
                <input className={input} placeholder="P3 (no real names)" value={f.label} disabled={!!busy} onChange={(e) => setF({ ...f, label: e.target.value })} />
              </label>
              <label className={label}>Title (optional)
                <input className={input} placeholder="Interview P3" value={f.title} disabled={!!busy} onChange={(e) => setF({ ...f, title: e.target.value })} />
              </label>
            </div>
            <label className={label}>Study
              <select className={input} value={f.projectId} disabled={!!busy} onChange={(e) => setF({ ...f, projectId: e.target.value })}>
                <option value="">Not sure yet, let Muse suggest</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="flex items-start gap-2.5 rounded-2xl bg-bg p-3.5 text-[13px] leading-snug">
              <input type="checkbox" className="mt-0.5" checked={f.consent} disabled={!!busy} onChange={(e) => setF({ ...f, consent: e.target.checked })} />
              <span>The participant agreed to be recorded and to the audio being transcribed by an AI model.</span>
            </label>

            {error && <p role="alert" className="rounded-xl bg-crimson-soft px-3.5 py-2.5 text-[13px] font-semibold text-crimson">{error}</p>}

            <div className="flex min-h-[52px] flex-wrap items-center gap-3 border-t border-line pt-4">
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-crimson border-t-transparent" />
                  <span className="text-sm font-semibold text-crimson">{busy}</span>
                  <span className="text-xs text-muted">Transcription starts when this finishes. Keep this window open.</span>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold">Cancel</button>
                  <span className="min-w-0 flex-1 text-right text-xs text-muted">{ok ? `Up to ${Math.round(maxSec / 60)} minutes per recording.` : "Add a label and tick the box to start."}</span>
                  <Recorder maxSec={maxSec} allowUpload disabled={!ok} onReady={ready} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
