"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Brief } from "@/lib/handoff";
import { Card, Chip } from "./ui";

export function HandoffBrief({ handoffId, first, thanks, initial, saved, answered, total }: { handoffId: string; first: string; thanks: string; initial: Brief | null; saved: boolean; answered: number; total: number }) {
  const router = useRouter();
  const [brief, setBrief] = useState<Brief | null>(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (brief) return;
    (async () => {
      const res = await fetch("/api/handoff", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "brief", handoffId }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setError(body.error ?? "Muse could not compile the brief");
      setBrief(body.brief);
    })();
  }, [brief, handoffId]);

  async function finish() {
    setBusy(true);
    await fetch("/api/handoff", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "finish", handoffId }) });
    setBusy(false);
    router.refresh();
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t border-line py-3 first:border-t-0"><div className="text-xs font-semibold text-crimson">{title}</div><div className="mt-1 text-sm leading-relaxed">{children}</div></div>
  );

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="!p-6">
          {!brief && !error && <div className="space-y-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-bg" />)}<p className="text-sm text-muted">Muse is compiling the brief from {first}&apos;s answers and the project history…</p></div>}
          {error && <p className="text-sm text-crimson">{error}</p>}
          {brief && (
            <>
              <Section title="Where things stand">{brief.where_we_are}</Section>
              <Section title={`What ${first} contributed`}>{brief.contributed}</Section>
              {brief.code_and_backups.length > 0 && (
                <Section title="Code and backups">
                  <div className="space-y-2">
                    {brief.code_and_backups.map((c) => (
                      <div key={c.name} className="rounded-[14px] bg-bg p-3">
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-[13px] text-muted">{c.detail}</div>
                        {c.backup && c.backup !== c.detail && <div className="mt-1.5"><Chip tone="ok">{c.backup}</Chip></div>}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              <Section title="Decisions and why">{brief.decisions}</Section>
              <Section title="Open work and who to ask">{brief.open_work}</Section>
              <Section title={`${first}'s advice for the next person`}>{brief.advice}</Section>
            </>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-2.5">
            <h3 className="font-heading text-lg font-bold">Ready to share</h3>
            <div><Chip tone={answered === total ? "ok" : "warn"}>{answered} of {total} questions answered</Chip></div>
            {brief && brief.unanswered.length > 0 && (
              <div className="rounded-[14px] bg-warn-soft p-3 text-[13px]">
                <b className="mb-1 block text-xs text-warn">Still open</b>
                {brief.unanswered.map((u) => <div key={u}>{u}</div>)}
              </div>
            )}
          </Card>
          <div className="flex flex-col gap-2 rounded-[28px] bg-crimson p-5 text-white">
            <h3 className="font-heading text-lg font-bold">Note of thanks</h3>
            <p className="text-sm leading-relaxed">{thanks}</p>
            <p className="text-xs">Sent with the brief and saved to {first}&apos;s record.</p>
          </div>
        </div>
      </div>

      <div className="sticky bottom-4 mt-4 flex items-center gap-2.5 rounded-[20px] bg-surface px-5 py-3">
        <span className="text-[13px] text-muted">{saved ? "Saved to the project." : "Nothing is shared until you save."}</span>
        <span className="flex-1" />
        {saved ? <Chip tone="ok">Saved to project</Chip> : (
          <button type="button" disabled={!brief || busy} onClick={finish} className="rounded-full bg-crimson px-[18px] py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Saving…" : "Save to project"}</button>
        )}
      </div>
    </>
  );
}
