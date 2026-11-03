"use client";

import { useState } from "react";
import { Card } from "./ui";

export type WorkloadRow = { id: string; name: string; tasks: number; maxTasks: number; hours: number; weeklyHours: number };

const SHOWN = 5;

/** Dark workload card. Shows the five most loaded people; the rest open with one click so the card never takes over the column. */
export function WorkloadCard({ rows, overtime = [], className = "" }: { rows: WorkloadRow[]; overtime?: { id: string; name: string; until: string; reason: string }[]; className?: string }) {
  const [all, setAll] = useState(false);
  const sorted = [...rows].sort((a, b) => b.hours / b.weeklyHours - a.hours / a.weeklyHours);
  const shown = all ? sorted : sorted.slice(0, SHOWN);
  return (
    <Card dark className={`rounded-[28px] ${className}`}>
      <h2 className="mb-2.5 font-heading text-xl font-bold">Workload this week</h2>
      {shown.map((r) => (
        <div key={r.id} className="py-1.5">
          <div className="flex justify-between text-sm font-medium">
            <span>{r.name.split(" ")[0]}</span>
            <span className="text-xs font-normal text-muted">{r.tasks} task{r.tasks === 1 ? "" : "s"} · {r.hours}/{r.weeklyHours}h</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
            <div className={`h-full rounded-full ${r.tasks >= r.maxTasks ? "bg-warn" : "bg-ok"}`} style={{ width: `${Math.min(100, (r.hours / r.weeklyHours) * 100)}%` }} />
          </div>
        </div>
      ))}
      {rows.length > SHOWN && (
        <button type="button" onClick={() => setAll(!all)} className="mt-1.5 text-xs font-semibold text-white/80 underline-offset-2 hover:underline">
          {all ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
      {overtime.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5 rounded-2xl bg-white/10 p-3.5">
          <b className="text-xs text-warn">Overtime and recovery</b>
          {overtime.map((o) => (
            <div key={o.id} className="text-[13px] leading-snug">
              <b className="font-semibold">{o.name.split(" ")[0]}</b> until {o.until}
              <span className="block text-xs text-muted">{o.reason}. A recovery week follows and new tasks pause.</span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-muted">Hours are estimates entered by RAs. Limits: 5 tasks and 10 hours per week.</p>
    </Card>
  );
}
