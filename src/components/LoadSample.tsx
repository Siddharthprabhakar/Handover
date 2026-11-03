"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoadSample() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  async function go() {
    setState("busy");
    const res = await fetch("/api/sample", { method: "POST" });
    setState(res.ok ? "done" : "idle");
    router.refresh();
  }

  return (
    <button type="button" disabled={state !== "idle"} onClick={go} className="rounded-full border border-line px-[18px] py-2.5 text-sm font-semibold disabled:opacity-50">
      {state === "busy" ? "Adding…" : state === "done" ? "Sample projects added" : "Load sample projects"}
    </button>
  );
}
