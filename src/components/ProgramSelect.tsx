"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PROGRAMS } from "@/lib/programs";

/** Small picker under a person's name: PhD, Master's, and so on. */
export function ProgramSelect({ personId, value }: { personId: string; value: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function save(program: string) {
    setBusy(true);
    await fetch(`/api/people/${personId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ program: program || null }) });
    setBusy(false);
    router.refresh();
  }

  return (
    <select disabled={busy} value={value ?? ""} onChange={(e) => save(e.target.value)} aria-label="Program" className="-ml-1 mt-0.5 max-w-[150px] rounded-md bg-transparent text-xs text-muted outline-none hover:bg-bg disabled:opacity-50">
      <option value="">Add program</option>
      {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
    </select>
  );
}
