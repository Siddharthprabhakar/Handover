"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { AuthShell, btnCls, inputCls } from "./AuthShell";

export function SignupForm() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", lab: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.password.length < 10) return setError("Use at least 10 characters for your password.");
    setBusy(true);
    setError("");
    const { data, error } = await createBrowserSupabase().auth.signUp({ email: f.email, password: f.password, options: { data: { name: f.name, lab_name: f.lab } } });
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    if (!data.session) {
      setBusy(false);
      return setError("Email confirmation is on in Supabase. Turn it off under Authentication → Providers → Email, then try again.");
    }
    router.push("/security/setup");
    router.refresh();
  }

  return (
    <AuthShell title="Create your lab" sub="You will add two-step sign-in next, to keep your students' work safe.">
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <label className="text-xs font-semibold text-muted">Your name
          <input required className={`${inputCls} mt-1.5 text-ink`} value={f.name} onChange={set("name")} placeholder="Dr. Ada Rivera" />
        </label>
        <label className="text-xs font-semibold text-muted">Lab name
          <input required className={`${inputCls} mt-1.5 text-ink`} value={f.lab} onChange={set("lab")} placeholder="Rivera HCI Lab" />
        </label>
        <label className="text-xs font-semibold text-muted">Email
          <input type="email" required autoComplete="email" className={`${inputCls} mt-1.5 text-ink`} value={f.email} onChange={set("email")} />
        </label>
        <label className="text-xs font-semibold text-muted">Password
          <input type="password" required autoComplete="new-password" className={`${inputCls} mt-1.5 text-ink`} value={f.password} onChange={set("password")} />
        </label>
        {error && <p className="text-[13px] text-crimson">{error}</p>}
        <button className={btnCls} disabled={busy}>{busy ? "Creating…" : "Create lab"}</button>
      </form>
      <p className="text-center text-[13px] text-muted">Already have an account? <Link href="/login" className="font-semibold text-crimson">Sign in</Link></p>
    </AuthShell>
  );
}
