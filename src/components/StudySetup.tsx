"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "./ui";

const field = "w-full rounded-xl bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-crimson/30";

type Props = {
  projectId: string;
  irbStatus: string | null;
  irbRef: string | null;
  irbDate: string | null;
  target: number | null;
  recruited: number; // distinct participants with a recording
  transcribed: number;
};

/** Ethics review and participant progress for a study with people in it. */
export function StudySetup(p: Props) {
  const router = useRouter();
  const [f, setF] = useState({ status: p.irbStatus ?? "", ref: p.irbRef ?? "", date: p.irbDate ?? "", target: p.target ? String(p.target) : "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/projects/study", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: p.projectId, irbStatus: f.status || null, irbRef: f.ref.trim() || null, irbDate: f.date || null, target: f.target ? Number(f.target) : null }),
    });
    setBusy(false);
    setMsg(res.ok ? "Saved" : ((await res.json().catch(() => ({}))).error ?? "Could not save"));
    if (res.ok) router.refresh();
  }

  const saved = p.target ?? 0;
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-bold">Study setup</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-muted">Ethics review (IRB)
          <select className={`${field} mt-1.5 text-ink`} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="">Not recorded yet</option>
            <option value="pending">Submitted, waiting</option>
            <option value="approved">Approved</option>
            <option value="exempt">Exempt or not needed</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">Protocol number
          <input className={`${field} mt-1.5 text-ink`} value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} placeholder="e.g. IRB-2026-0412" />
        </label>
        <label className="text-xs font-semibold text-muted">Decision date
          <input type="date" className={`${field} mt-1.5 text-ink`} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </label>
      </div>
      <div className="grid items-end gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-muted">Participants needed
          <input type="number" min={1} max={500} className={`${field} mt-1.5 text-ink`} value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} placeholder="e.g. 12" />
        </label>
        <div className="sm:col-span-2">
          {saved > 0 ? (
            <>
              <div className="mb-1.5 flex justify-between text-[13px]"><b>{p.recruited} of {saved} participants recorded</b><span className="text-muted">{p.transcribed} transcribed</span></div>
              <span className="block h-2 overflow-hidden rounded-full bg-line"><i className="block h-full rounded-full bg-crimson" style={{ width: `${Math.min(100, (p.recruited / saved) * 100)}%` }} /></span>
            </>
          ) : (
            <span className="text-[13px] text-muted">Set a number to track recruitment. Each interview you record in Files with a participant label counts once.</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" disabled={busy} onClick={save} className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold disabled:opacity-50">Save</button>
        <span className="text-[13px] text-muted">{msg}</span>
      </div>
    </Card>
  );
}
