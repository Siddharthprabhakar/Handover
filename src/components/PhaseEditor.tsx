"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./ui";

type Row = { name: string; due: string; from: number | null; tasks: number };
const field = "rounded-xl bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-crimson/30";
const small = "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-sm disabled:opacity-30";

/** Pencil in the Journey header: rename, reorder, date, add or remove phases. Tasks and blockers follow their phase when it moves. */
export function PhaseEditor({ projectId, phases, taskCounts, current }: { projectId: string; phases: { name: string; due: string }[]; taskCounts: number[]; current: number }) {
  const router = useRouter();
  const start = (): Row[] => phases.map((p, i) => ({ ...p, from: i + 1, tasks: taskCounts[i] ?? 0 }));
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(start);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...rows];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    setRows(next);
  };

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/projects/phases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId, phases: rows.map((r) => ({ name: r.name.trim(), due: r.due || null, from: r.from })) }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Could not save the phases");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => { setRows(start()); setError(""); setOpen(true); }} aria-label="Edit phases" title="Edit phases" className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted">
        <Icon name="pencil" className="h-4 w-4" />
      </button>
      {open && (
        <div className="fixed inset-0 z-20 flex overflow-auto bg-black/55 p-5" onClick={(e) => e.target === e.currentTarget && !busy && setOpen(false)}>
          <div className="m-auto flex w-full max-w-[640px] flex-col gap-3 rounded-[28px] bg-surface p-7 text-left">
            <h2 className="font-heading text-2xl font-bold">Edit phases</h2>
            <p className="text-[13px] text-muted">Rename, reorder or date your phases. Tasks move with their phase. A phase can be removed only when it has no tasks and the project is not in it.</p>
            {rows.map((r, i) => {
              const removable = r.tasks === 0 && r.from !== current && rows.length > 1;
              return (
                <div key={r.from ?? `new-${i}`} className="flex items-center gap-2">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${r.from === current ? "bg-crimson text-white" : "bg-crimson-soft text-crimson"}`} title={r.from === current ? "The project is in this phase" : undefined}>{i + 1}</span>
                  <input className={`${field} min-w-0 flex-1`} value={r.name} maxLength={80} onChange={(e) => set(i, { name: e.target.value })} aria-label={`Phase ${i + 1} name`} />
                  <input type="date" className={`${field} w-[140px] shrink-0`} value={r.due} onChange={(e) => set(i, { due: e.target.value })} aria-label={`Phase ${i + 1} due date`} />
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up" title="Move up" className={small}>↑</button>
                  <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Move down" title="Move down" className={small}>↓</button>
                  <button type="button" disabled={!removable} onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove phase" title={removable ? "Remove" : r.from === current ? "The project is in this phase" : "This phase has tasks"} className={`${small} text-crimson`}>✕</button>
                </div>
              );
            })}
            <div>
              <button type="button" disabled={rows.length >= 12} onClick={() => setRows([...rows, { name: "New phase", due: "", from: null, tasks: 0 }])} className="rounded-full border border-line px-3.5 py-2 text-xs font-semibold disabled:opacity-40">+ Add phase</button>
            </div>
            {error && <p role="alert" className="rounded-xl bg-crimson-soft px-3.5 py-2.5 text-[13px] font-semibold text-crimson">{error}</p>}
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
