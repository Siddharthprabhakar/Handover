"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { AuthShell, btnCls, inputCls } from "./AuthShell";

/** mode "setup": show a QR code and confirm the first code. mode "verify": ask for the current code. */
export function MfaForm({ mode }: { mode: "setup" | "verify" }) {
  const router = useRouter();
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const sb = createBrowserSupabase();
      const { data: factors } = await sb.auth.mfa.listFactors();
      if (mode === "verify") {
        const f = factors?.totp?.[0];
        return f ? setFactorId(f.id) : setError("No authenticator is set up for this account.");
      }
      // drop an abandoned, never-confirmed attempt so a fresh QR code can be made
      for (const f of factors?.all ?? []) if (f.factor_type === "totp" && f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" });
      if (error || !data) return setError(error?.message ?? "Could not start setup.");
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
    })();
  }, [mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const sb = createBrowserSupabase();
    const { data: ch, error: e1 } = await sb.auth.mfa.challenge({ factorId });
    const { error: e2 } = e1 || !ch ? { error: e1 } : await sb.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.trim() });
    if (e1 || e2) {
      setBusy(false);
      return setError("That code did not work. Check the 6 digits and try again.");
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell
      title={mode === "setup" ? "Add two-step sign-in" : "Enter your code"}
      sub={mode === "setup" ? "Scan the QR code with an authenticator app (Google Authenticator, 1Password, Authy), then type the 6-digit code it shows." : "Open your authenticator app and type the current 6-digit code."}
    >
      {mode === "setup" && qr && (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-bg p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code for your authenticator app" className="h-44 w-44 rounded-lg bg-white p-2" />
          <p className="text-center text-xs text-muted">Can&apos;t scan? Enter this key instead:<br /><code className="break-all text-[13px] text-ink" data-testid="mfa-secret">{secret}</code></p>
        </div>
      )}
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="123456" className={`${inputCls} text-center text-lg tracking-[0.3em] text-ink`} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
        {error && <p className="text-[13px] text-crimson">{error}</p>}
        <button className={btnCls} disabled={busy || !factorId || code.length !== 6}>{busy ? "Checking…" : mode === "setup" ? "Turn on and continue" : "Verify"}</button>
      </form>
      <form action="/logout" method="post"><button className="w-full text-center text-[13px] text-muted">Sign out</button></form>
    </AuthShell>
  );
}
