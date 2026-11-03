"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** The round tick beside a task: click to mark it done or reopen it. */
export function TaskToggle({ taskId, done }: { taskId: string; done: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function flip() {
    setBusy(true);
    await fetch("/api/tasks/status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ taskId, status: done ? "open" : "done" }) });
    setBusy(false);
    router.refresh();
  }

  return (
    <button type="button" disabled={busy} onClick={flip} aria-label={done ? "Mark as not done" : "Mark as done"} className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] disabled:opacity-50 ${done ? "bg-crimson text-white" : "border-[1.5px] border-line"}`}>
      {done && <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
    </button>
  );
}
