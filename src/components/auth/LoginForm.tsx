"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { AuthShell, btnCls, inputCls } from "./AuthShell";

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createBrowserSupabase().auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      return setError(error.message === "Invalid login credentials" ? "That email and password do not match." : error.message);
    }
    // the proxy sends them on to 2FA setup or verification when needed
    router.push(next && next.startsWith("/") ? next : "/");
    router.refresh();
  }

  return (
    <AuthShell title="Welcome back" sub="Sign in to your lab.">
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <label className="text-xs font-semibold text-muted">Email
          <input type="email" required autoComplete="email" className={`${inputCls} mt-1.5 text-ink`} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted">Password
          <input type="password" required autoComplete="current-password" className={`${inputCls} mt-1.5 text-ink`} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="text-[13px] text-crimson">{error}</p>}
        <button className={btnCls} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="text-center text-[13px] text-muted">New here? <Link href="/signup?fresh=1" className="font-semibold text-crimson">Create a lab</Link></p>
    </AuthShell>
  );
}
