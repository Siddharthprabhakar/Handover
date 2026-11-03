"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./ui";

type Row = { name: string; due: string };
const field = "rounded-xl bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-crimson/30";

/** Pencil in the Journey header: rename phases, set due dates, add a phase at the end or remove the last one. */
export function PhaseEditor({ projectId, phases, taskCounts, current }: { projectId: string; phases: Row[]; taskCounts: number[]; current: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(phases);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/projects/phases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId, phases: rows.map((r) => ({ name: r.name.trim(), due: r.due || null })) }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Could not save the phases");
    setOpen(false);
    router.refresh();
  }

  const last = rows.length - 1;
  const canDropLast = rows.length > current && (taskCounts[last] ?? 0) === 0;
  return (
    <>
      <button type="button" onClick={() => { setRows(phases); setError(""); setOpen(true); }} aria-label="Edit phases" title="Edit phases" className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted">
        <Icon name="pencil" className="h-4 w-4" />
      </button>
      {open && (
        <div className="fixed inset-0 z-20 flex overflow-auto bg-black/55 p-5" onClick={(e) => e.target === e.currentTarget && !busy && setOpen(false)}>
          <div className="m-auto flex w-full max-w-[560px] flex-col gap-3 rounded-[28px] bg-surface p-7 text-left">
            <h2 className="font-heading text-2xl font-bold">Edit phases</h2>
            <p className="text-[13px] text-muted">Rename a phase or give it a due date. You can add a phase at the end, or remove the last one if it has no tasks.</p>
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-crimson-soft text-xs font-semibold text-crimson">{i + 1}</span>
                <input className={`${field} min-w-0 flex-1`} value={r.name} maxLength={80} onChange={(e) => set(i, { name: e.target.value })} aria-label={`Phase ${i + 1} name`} />
                <input type="date" className={`${field} w-[150px]`} value={r.due} onChange={(e) => set(i, { due: e.target.value })} aria-label={`Phase ${i + 1} due date`} />
              </div>
            ))}
            <div className="flex gap-2">
              <button type="button" disabled={rows.length >= 12} onClick={() => setRows([...rows, { name: "New phase", due: "" }])} className="rounded-full border border-line px-3.5 py-2 text-xs font-semibold disabled:opacity-40">+ Add phase</button>
              <button type="button" disabled={!canDropLast} onClick={() => setRows(rows.slice(0, -1))} title={canDropLast ? "" : "The last phase has tasks, or the project is in it"} className="rounded-full border border-line px-3.5 py-2 text-xs font-semibold disabled:opacity-40">Remove last</button>
            </div>
            {error && <p className="text-[13px] text-crimson">{error}</p>}
            <div className="flex gap-2.5">
              <button type="button" disabled={busy || rows.some((r) => !r.name.trim())} onClick={save} className="rounded-full bg-crimson px-[18px] py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save phases"}</button>
              <button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-full border border-line px-[18px] py-2.5 text-sm font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
