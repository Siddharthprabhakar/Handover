"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DigestCard({ initialText, initialShared }: { initialText: string; initialShared: boolean }) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [editing, setEditing] = useState(false);
  const [shared, setShared] = useState(initialShared);
  const [busy, setBusy] = useState(false);

  async function save(share: boolean) {
    setBusy(true);
    const res = await fetch("/api/digest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, share }) });
    setBusy(false);
    if (!res.ok) return;
    const body = await res.json();
    setShared(body.shared);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-[28px] bg-crimson p-6 text-white">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-bg px-2.5 py-0.5 text-xs font-semibold text-muted">Suggested by Muse</span>
        {shared && <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-semibold text-ok">Shared with lab</span>}
      </div>
      <h2 className="font-heading text-[26px] font-bold">Weekly digest</h2>
      {editing ? (
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="w-full resize-none rounded-[14px] bg-white/15 px-3.5 py-3 text-sm leading-relaxed text-white outline-none" />
      ) : (
        <p className="leading-relaxed">{text}</p>
      )}
      <div className="flex gap-2.5">
        {editing ? (
          <>
            <button disabled={busy} onClick={() => save(false)} className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-crimson disabled:opacity-60">Save</button>
            <button disabled={busy} onClick={() => { setText(initialText); setEditing(false); }} className="rounded-full border border-white/70 px-4 py-2 text-[13px] font-semibold">Cancel</button>
          </>
        ) : (
          <>
            {!shared && <button disabled={busy} onClick={() => save(true)} className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-crimson disabled:opacity-60">Approve &amp; share</button>}
            <button onClick={() => setEditing(true)} className="rounded-full border border-white/70 px-4 py-2 text-[13px] font-semibold">Edit</button>
          </>
        )}
      </div>
    </div>
  );
}
