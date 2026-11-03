"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmtDate } from "@/lib/format";
import { Card, Chip, Icon, type Tone } from "./ui";

const field = "w-full rounded-xl bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-crimson/30";

const IRB: Record<string, [string, Tone]> = {
  pending: ["IRB: submitted, waiting", "warn"],
  approved: ["IRB: approved", "ok"],
  exempt: ["IRB: exempt or not needed", "ok"],
};

type Props = {
  projectId: string;
  irbStatus: string | null;
  irbRef: string | null;
  irbDate: string | null;
  target: number | null;
  questions: string[];
  recruited: number; // distinct participants with a recording
  transcribed: number;
};

/** Ethics review and participant progress for a study with people in it. Shows a quiet summary once saved; the pencil reopens the form. */
export function StudySetup(p: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(!p.irbStatus && !p.target && !p.questions.length);
  const [f, setF] = useState({ status: p.irbStatus ?? "", ref: p.irbRef ?? "", date: p.irbDate ?? "", target: p.target ? String(p.target) : "", questions: p.questions.join("\n") });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/projects/study", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: p.projectId, irbStatus: f.status || null, irbRef: f.ref.trim() || null, irbDate: f.date || null, target: f.target ? Number(f.target) : null, questions: f.questions.split("\n").map((q) => q.trim()).filter(Boolean) }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Could not save");
    setEditing(false);
    router.refresh();
  }

  const target = p.target ?? 0;
  const progress =
    target > 0 ? (
      <div>
        <div className="mb-1.5 flex justify-between text-[13px]"><b>{p.recruited} of {target} signed up</b><span className="text-muted">{p.transcribed} transcribed</span></div>
        <span className="block h-2 overflow-hidden rounded-full bg-line"><i className="block h-full rounded-full bg-crimson" style={{ width: `${Math.min(100, (p.recruited / target) * 100)}%` }} /></span>
      </div>
    ) : (
      <span className="text-[13px] text-muted">Set a number to track recruitment. Each interview you record in Files with a participant label counts once.</span>
    );

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <h2 className="font-heading text-xl font-bold">Study setup</h2>
        <span className="flex-1" />
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} aria-label="Edit study setup" title="Edit" className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted">
            <Icon name="pencil" className="h-4 w-4" />
          </button>
        )}
      </div>

      {editing ? (
        <>
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
            <div className="sm:col-span-2">{progress}</div>
          </div>
          <label className="text-xs font-semibold text-muted">Research questions (one per line, up to 8)
            <textarea rows={3} className={`${field} mt-1.5 resize-none text-ink`} value={f.questions} onChange={(e) => setF({ ...f, questions: e.target.value })} placeholder={"How do first-year students find rooms on campus?\nWhere do they get stuck?"} />
          </label>
          <div className="flex items-center gap-3">
            <button type="button" disabled={busy} onClick={save} className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
            {error && <span className="text-[13px] text-crimson">{error}</span>}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            {p.irbStatus ? <Chip tone={IRB[p.irbStatus][1]}>{IRB[p.irbStatus][0]}</Chip> : <Chip tone="light">IRB not recorded</Chip>}
            {p.irbRef && <span className="text-[13px] font-medium">{p.irbRef}</span>}
            {p.irbDate && <span className="text-[13px] text-muted">decided {fmtDate(p.irbDate)}</span>}
          </div>
          {progress}
          {p.questions.length > 0 && (
            <div>
              <b className="mb-1 block text-xs text-muted">Research questions</b>
              <ol className="list-decimal space-y-0.5 pl-5 text-sm leading-relaxed">{p.questions.map((q) => <li key={q}>{q}</li>)}</ol>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
