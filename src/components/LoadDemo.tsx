"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoadDemo() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  async function go() {
    setState("busy");
    const res = await fetch("/api/demo", { method: "POST" });
    setState(res.ok ? "idle" : "error");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button type="button" disabled={state === "busy"} onClick={go} className="rounded-full bg-crimson px-[18px] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {state === "busy" ? "Adding…" : "Load demo lab"}
      </button>
      {state === "error" && <span className="text-[13px] text-crimson">That did not work. Try again.</span>}
    </div>
  );
}
