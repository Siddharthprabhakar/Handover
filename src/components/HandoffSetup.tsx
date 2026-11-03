"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { HQuestion } from "@/lib/handoff";
import { Card, Chip } from "./ui";

export function HandoffSetup({ personId, first, initial, initialThanks }: { personId: string; first: string; initial: HQuestion[] | null; initialThanks: string }) {
  const router = useRouter();
  const [qs, setQs] = useState<HQuestion[] | null>(initial);
  const [thanks, setThanks] = useState(initialThanks);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (qs) return;
    (async () => {
      const res = await fetch("/api/handoff", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "questions", personId }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setError(body.error ?? "Muse could not draft questions");
      setQs(body.questions);
      setThanks(body.thanks);
    })();
  }, [qs, personId]);

  const upd = (i: number, patch: Partial<HQuestion>) => setQs((q) => q!.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const picked = qs?.filter((q) => q.include).length ?? 0;

  async function send() {
    if (!qs) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/handoff", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "send", personId, questions: qs, thanks }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "Could not send");
    router.push(`/people/${personId}/handoff?step=1`);
    router.refresh();
  }

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="!p-6">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xl font-bold">Questions for {first}</h2>
            <span className="text-[13px] text-muted">{qs ? `${qs.length} total · ${picked} selected` : "Muse is reading their work…"}</span>
            <span className="flex-1" />
            <button type="button" disabled={!qs} onClick={() => setQs([...qs!, { id: `q${Date.now()}`, text: "", source: "Added by you", include: true }])} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Add your question</button>
          </div>
          {!qs && !error && Array.from({ length: 6 }, (_, i) => <div key={i} className="mt-3 h-12 animate-pulse rounded-xl bg-bg" />)}
          {qs?.map((q, i) => (
            <div key={q.id} className="flex items-start gap-3 border-t border-line py-3 first:border-t-0">
              <button type="button" aria-label="Include question" onClick={() => upd(i, { include: !q.include })} className={`mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] ${q.include ? "bg-crimson text-white" : "border-[1.5px] border-line"}`}>
                {q.include && <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
              </button>
              <div className="min-w-0 flex-1">
                <input value={q.text} onChange={(e) => upd(i, { text: e.target.value })} placeholder="Type your question" className={`w-full bg-transparent text-sm font-medium outline-none ${q.include ? "" : "text-muted line-through"}`} />
                <div className="mt-1.5"><Chip tone={q.source === "Added by you" ? "ok" : q.source === "Always asked" ? "light" : "crimson"}>{q.source}</Chip></div>
              </div>
            </div>
          ))}
        </Card>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5 rounded-[28px] bg-crimson p-5 text-white">
            <span className="self-start rounded-full bg-bg px-2.5 py-0.5 text-xs font-semibold text-muted">Draft by Muse · edit freely</span>
            <h3 className="font-heading text-[21px] font-bold">A note of thanks</h3>
            <textarea rows={6} value={thanks} onChange={(e) => setThanks(e.target.value)} className="w-full resize-none rounded-[14px] bg-white/15 px-3.5 py-3 text-sm leading-relaxed text-white outline-none" />
            <p className="text-xs leading-snug">Muse writes only from completed work and keeps the tone kind, whatever the rest of the history looks like.</p>
          </div>
          <Card className="!p-5">
            <h3 className="font-heading text-lg font-bold">How it works</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{first} gets your note and the questions. They can save a draft and answer in their own time. You review the brief before anyone else sees it.</p>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-4 mt-4 flex flex-wrap items-center gap-2.5 rounded-[20px] bg-surface px-5 py-3">
        <span className="text-[13px] text-muted">{error ? <span className="text-crimson">{error}</span> : `${first} gets your note and the questions.`}</span>
        <span className="flex-1" />
        <button type="button" disabled={!qs || busy || picked === 0 || qs.some((q) => q.include && !q.text.trim())} onClick={send} className="rounded-full bg-crimson px-[18px] py-2.5 text-sm font-semibold text-white disabled:opacity-40">
          {busy ? "Sending…" : `Send to ${first}`}
        </button>
      </div>
    </>
  );
}
