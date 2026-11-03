"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReminderButton({ label, personId, kind = "pri", disabled = false, endpoint = "/api/reminders", sentLabel = "Reminder sent" }: { label: string; personId?: string; kind?: "pri" | "out" | "small"; disabled?: boolean; endpoint?: string; sentLabel?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const style = {
    pri: "bg-crimson text-white px-[18px] py-2.5 text-sm",
    out: "border border-line px-[18px] py-2.5 text-sm",
    small: "border border-line px-3 py-1.5 text-xs",
  }[kind];

  async function send() {
    setState("busy");
    const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ personId }) });
    setState(res.ok ? "sent" : "idle");
    router.refresh();
  }

  return (
    <button disabled={disabled || state !== "idle"} onClick={send} className={`rounded-full font-semibold disabled:opacity-50 ${style}`}>
      {state === "busy" ? "Sending…" : state === "sent" ? sentLabel : label}
    </button>
  );
}
