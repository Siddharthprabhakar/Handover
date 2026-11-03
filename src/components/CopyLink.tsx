"use client";

import { useState } from "react";

/** Copies a person's personal check-in link, for sharing by hand if their email goes to spam. */
export function CopyLink({ path }: { path: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <button type="button" onClick={copy} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">
      {done ? "Copied" : "Copy check-in link"}
    </button>
  );
}
