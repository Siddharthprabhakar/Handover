"use client";

import { useState } from "react";
import type { SummaryResult } from "@/lib/summary";
import { Card } from "./ui";

export function ProjectSummary({ projectId }: { projectId: string }) {
  const [s, setS] = useState<SummaryResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/projects/summary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "Muse could not summarise this project");
    setS(body.summary);
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 className="font-heading text-xl font-bold">Summary</h2>
        <span className="rounded-full bg-crimson-soft px-2.5 py-0.5 text-xs font-semibold text-crimson">Muse</span>
        <span className="flex-1" />
        <button type="button" disabled={busy} onClick={go} className="rounded-full bg-crimson px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
          {busy ? "Muse is reading…" : s ? "Summarize again" : "Summarize with Muse"}
        </button>
      </div>
      {!s && !error && <p className="text-sm text-muted">Muse reads this project&apos;s tasks, blockers and recent check-ins and writes a short summary. It uses only what is recorded here.</p>}
      {error && <p className="text-sm text-crimson">{error}</p>}
      {s && (
        <div className="flex flex-col gap-3 text-sm leading-relaxed">
          <p>{s.summary}</p>
          <p className="text-muted">{s.progress}</p>
          {s.risks.length > 0 && (
            <div className="rounded-2xl bg-warn-soft p-3.5">
              <b className="mb-1 block text-xs text-warn">Risks</b>
              <ul className="list-disc pl-5">{s.risks.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          )}
          {s.next_steps.length > 0 && (
            <div>
              <b className="mb-1 block text-xs text-crimson">Next steps</b>
              <ul className="list-disc pl-5">{s.next_steps.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
