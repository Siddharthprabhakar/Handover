"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "./ui";

type P = { id: string; name: string };

export function ProjectPeople({ projectId, members, others }: { projectId: string; members: P[]; others: P[] }) {
  const router = useRouter();
  const [pick, setPick] = useState(others[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  async function add() {
    const chosen = pick || others[0]?.id;
    if (!chosen) return;
    setBusy(true);
    await fetch("/api/projects/members", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId, personId: chosen }) });
    setBusy(false);
    router.refresh();
    setPick("");
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-bold">People on this project</h2>
      <div className="flex flex-wrap gap-1.5">
        {members.length === 0 && <span className="text-sm text-muted">No one yet. People you add are asked about this project in their weekly check-in.</span>}
        {members.map((m) => <span key={m.id} className="rounded-full bg-crimson-soft px-2.5 py-1 text-xs font-semibold text-crimson">{m.name}</span>)}
      </div>
      {others.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select value={pick || others[0].id} onChange={(e) => setPick(e.target.value)} className="rounded-xl bg-bg px-3 py-2 text-sm outline-none">
            {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button type="button" disabled={busy} onClick={add} className="rounded-full border border-line px-3.5 py-2 text-[13px] font-semibold disabled:opacity-50">Add to project</button>
        </div>
      )}
    </Card>
  );
}
