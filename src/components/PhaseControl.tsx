"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Move the project one phase forward or back. Asks first when the current phase still has open work. */
export function PhaseControl({ projectId, current, names, warning }: { projectId: string; current: number; names: string[]; warning: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function move(to: number) {
    if (to > current && warning && !confirm(`${warning}\n\nMove to ${names[to - 1]} anyway?`)) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/projects/phase", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId, to }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Could not move the project");
    router.refresh();
  }

  return (
    <>
      {error && <span className="text-[13px] text-crimson">{error}</span>}
      {current > 1 && <button type="button" disabled={busy} onClick={() => move(current - 1)} className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold disabled:opacity-50">Back to {names[current - 2]}</button>}
      {current < names.length && <button type="button" disabled={busy} onClick={() => move(current + 1)} className="rounded-full bg-crimson px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">Move to {names[current]}</button>}
    </>
  );
}
