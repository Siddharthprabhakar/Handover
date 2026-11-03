"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Delete button for a project. Asks for a fresh authenticator code before anything is removed. */
export function DeleteProject({ projectId, name, demo }: { projectId: string; name: string; demo: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() {
    setOpen(false);
    setCode("");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/projects/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId, code: demo ? "000000" : code }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "Could not delete the project");
    router.push("/projects");
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-crimson">Delete project</button>
      {open && (
        <div className="fixed inset-0 z-40 flex overflow-auto bg-black/55 p-5" onClick={(e) => e.target === e.currentTarget && !busy && close()}>
          <form onSubmit={submit} className="m-auto flex w-full max-w-[440px] flex-col gap-3.5 rounded-[28px] bg-surface p-7 text-left">
            <h2 className="font-heading text-2xl font-bold">Delete {name}?</h2>
            <p className="text-sm leading-relaxed text-muted">This removes the project, its tasks, blockers and handoffs. It cannot be undone. Recordings stay in Files, no longer linked to a project.</p>
            {!demo && (
              <label className="text-xs font-semibold text-muted">Code from your authenticator app
                <input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" className="mt-1.5 w-full rounded-xl bg-bg px-3.5 py-2.5 text-center text-lg tracking-[0.4em] text-ink outline-none focus:ring-2 focus:ring-crimson/30" />
              </label>
            )}
            {error && <p role="alert" className="rounded-xl bg-crimson-soft px-3.5 py-2.5 text-[13px] font-semibold text-crimson">{error}</p>}
            <div className="flex gap-2.5">
              <button disabled={busy || (!demo && code.length !== 6)} className="rounded-full bg-crimson px-[18px] py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Deleting…" : "Delete project"}</button>
              <button type="button" disabled={busy} onClick={close} className="rounded-full border border-line px-[18px] py-2.5 text-sm font-semibold">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
