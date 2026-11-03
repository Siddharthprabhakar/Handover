"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const field = "w-full rounded-xl bg-bg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-crimson/30";

export function InvitePerson({ label = "Invite person" }: { label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ name: string; emailed: boolean; note?: string } | null>(null);

  function close() {
    setOpen(false);
    setDone(null);
    setError("");
    setName("");
    setEmail("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/people", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "Could not add this person");
    setDone({ name, emailed: body.emailed, note: body.emailNote });
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-crimson px-[18px] py-2.5 text-sm font-semibold text-white">{label}</button>
      {open && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/55 p-5" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="mt-10 flex w-full max-w-[480px] flex-col gap-3.5 rounded-[28px] bg-surface p-7">
            {done ? (
              <>
                <h2 className="font-heading text-2xl font-bold">{done.name} is in</h2>
                <p className="text-sm leading-relaxed text-muted">
                  {done.emailed ? "We emailed them a welcome message with their personal check-in link. They do not need to create an account." : `They were added, but the email did not go out${done.note ? ` (${done.note})` : ""}. You can send it again from Check-ins.`}
                </p>
                <div className="flex gap-2.5">
                  <button type="button" onClick={() => setDone(null)} className="rounded-full border border-line px-[18px] py-2.5 text-sm font-semibold">Add another</button>
                  <button type="button" onClick={close} className="rounded-full bg-dark px-[18px] py-2.5 text-sm font-semibold text-white">Done</button>
                </div>
              </>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-3.5">
                <h2 className="font-heading text-2xl font-bold">Invite someone</h2>
                <p className="text-sm text-muted">They get an email with a personal link for their weekly check-in. No password, no account.</p>
                <label className="text-xs font-semibold text-muted">Name
                  <input autoFocus required className={`${field} mt-1.5 text-ink`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ana Ortiz" />
                </label>
                <label className="text-xs font-semibold text-muted">Email
                  <input type="email" required className={`${field} mt-1.5 text-ink`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@university.edu" />
                </label>
                {error && <p className="text-[13px] text-crimson">{error}</p>}
                <div className="flex gap-2.5">
                  <button disabled={busy} className="rounded-full bg-crimson px-[18px] py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Sending…" : "Add and email"}</button>
                  <button type="button" onClick={close} className="rounded-full border border-line px-[18px] py-2.5 text-sm font-semibold">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
