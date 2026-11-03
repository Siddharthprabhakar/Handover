"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Chip, type Tone } from "./ui";

export type RosterRow = { id: string | null; label: string; stage: string };
type Stats = { signedUp: number; scheduled: number; interviewed: number; transcribed: number };

const STAGE: Record<string, [string, Tone]> = {
  signed_up: ["Signed up", "light"],
  scheduled: ["Scheduled", "warn"],
  interviewed: ["Interviewed", "ok"],
  transcribed: ["Transcribed", "ok"],
  withdrew: ["Withdrew", "crimson"],
};

/** Who signed up for the study, by label only, and how close that is to the number needed. Interview recordings move people along by themselves. */
export function ParticipantsCard({ projectId, target, stats, rows }: { projectId: string; target: number | null; stats: Stats; rows: RosterRow[] }) {
  const router = useRouter();
  const nextLabel = `P${rows.reduce((m, r) => Math.max(m, Number(r.label.match(/^P(\d+)$/i)?.[1] ?? 0)), 0) + 1}`;
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState("signed_up");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(body: object) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/participants", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "That did not work");
    router.refresh();
    return true;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await call({ op: "add", projectId, label: label.trim() || nextLabel, status })) setLabel("");
  }

  const reached = target !== null && stats.signedUp >= target;
  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="font-heading text-xl font-bold">Participants</h2>
        {target ? <Chip tone={reached ? "ok" : "warn"}>{reached ? `Target reached: ${stats.signedUp} of ${target}` : `${stats.signedUp} of ${target} signed up · ${target - stats.signedUp} to go`}</Chip> : <Chip tone="light">{stats.signedUp} signed up · set a target in Study setup</Chip>}
        <span className="flex-1" />
        <span className="text-xs text-muted">{stats.interviewed} interviewed · {stats.transcribed} transcribed</span>
      </div>
      {target ? <span className="block h-2 overflow-hidden rounded-full bg-line"><i className="block h-full rounded-full bg-crimson" style={{ width: `${Math.min(100, (stats.signedUp / target) * 100)}%` }} /></span> : null}

      {rows.length === 0 && <p className="text-sm text-muted">No one yet. Add each person who signs up by a label like P1. Real names stay out of Handover.</p>}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {rows.map((r) => {
            const [text, tone] = STAGE[r.stage] ?? STAGE.signed_up;
            return (
              <span key={r.label} className="flex items-center gap-1.5 rounded-full bg-bg py-1 pl-3 pr-1.5 text-sm">
                <b className="font-semibold">{r.label}</b>
                {r.id && (r.stage === "signed_up" || r.stage === "scheduled" || r.stage === "withdrew") ? (
                  <select value={r.stage} disabled={busy} onChange={(e) => call({ op: "status", id: r.id, status: e.target.value })} aria-label={`${r.label} status`} className="rounded-full bg-surface px-2 py-0.5 text-xs outline-none">
                    <option value="signed_up">Signed up</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="withdrew">Withdrew</option>
                  </select>
                ) : <Chip tone={tone}>{text}</Chip>}
                {r.id && <button type="button" disabled={busy} onClick={() => call({ op: "delete", id: r.id })} aria-label={`Remove ${r.label}`} className="px-1 text-muted">✕</button>}
              </span>
            );
          })}
        </div>
      )}

      <form onSubmit={add} className="flex flex-wrap items-center gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={nextLabel} maxLength={40} aria-label="Participant label" className="w-28 rounded-xl bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-crimson/30" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" className="rounded-xl bg-bg px-3 py-2 text-sm outline-none">
          <option value="signed_up">Signed up</option>
          <option value="scheduled">Scheduled</option>
        </select>
        <button disabled={busy} className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold disabled:opacity-50">Add {label.trim() || nextLabel}</button>
        {error && <span role="alert" className="text-[13px] font-semibold text-crimson">{error}</span>}
      </form>
    </Card>
  );
}
