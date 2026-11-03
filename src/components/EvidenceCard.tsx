"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StoredSynthesis } from "@/lib/synthesis";
import { Card, Chip } from "./ui";

/** What the interviews say, across participants: themes with real quotes, and how well each research question is answered. */
export function EvidenceCard({ projectId, questions, synthesis, ready }: { projectId: string; questions: string[]; synthesis: StoredSynthesis | null; ready: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/projects/synthesis", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Muse could not read the interviews");
    router.refresh();
  }

  const s = synthesis;
  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="font-heading text-xl font-bold">Evidence across interviews</h2>
        <Chip>Muse</Chip>
        <span className="flex-1" />
        <button type="button" disabled={busy || ready === 0} onClick={run} title={ready === 0 ? "Record or upload an interview first" : undefined} className="rounded-full bg-crimson px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
          {busy ? "Muse is reading…" : s ? "Synthesize again" : `Synthesize ${ready || ""} interview${ready === 1 ? "" : "s"}`.replace("  ", " ")}
        </button>
      </div>
      {!s && !error && <p className="text-sm text-muted">{ready === 0 ? "Record or upload interviews in Files, link them to this study, and Muse will find the themes across them." : "Muse reads every transcript in this study and finds the themes, with exact quotes from each participant. Quotes that are not word for word in a transcript are dropped."}</p>}
      {error && <p role="alert" className="rounded-xl bg-crimson-soft px-3.5 py-2.5 text-[13px] font-semibold text-crimson">{error}</p>}

      {s && (
        <>
          <p className="text-xs text-muted">Based on {s.based_on} interview{s.based_on === 1 ? "" : "s"} · {new Date(s.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{ready > s.based_on ? ` · ${ready - s.based_on} newer since then` : ""}</p>

          {s.coverage.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl bg-bg p-4">
              <b className="text-xs text-muted">Research questions</b>
              {s.coverage.map((c) => (
                <div key={c.rq} className="text-sm leading-snug">
                  <div className="flex items-baseline gap-2"><b className="font-semibold">{c.rq}. {questions[c.rq - 1] ?? "Question removed"}</b></div>
                  <div className="mt-1 flex items-center gap-2">
                    <Chip tone={c.participants >= 3 ? "ok" : c.participants > 0 ? "warn" : "crimson"}>{c.participants} of {s.based_on} participant{s.based_on === 1 ? "" : "s"}</Chip>
                    <span className="text-[13px] text-muted">{c.note}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {s.themes.length === 0 && <p className="text-sm text-muted">No themes with verified quotes yet.</p>}
          {s.themes.map((t) => (
            <div key={t.title} className="rounded-2xl border border-line p-4">
              <div className="flex items-center gap-2"><b className="font-semibold">{t.title}</b>{t.rq && <Chip tone="light">Question {t.rq}</Chip>}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t.summary}</p>
              {t.evidence.map((e, i) => (
                <blockquote key={i} className="mt-2 border-l-2 border-crimson pl-3 text-sm italic">&ldquo;{e.quote}&rdquo; <span className="not-italic font-semibold text-muted">· {e.participant}</span></blockquote>
              ))}
            </div>
          ))}

          {s.gaps.length > 0 && (
            <div>
              <b className="mb-1 block text-xs text-crimson">Worth asking in the next interviews</b>
              <ul className="list-disc space-y-0.5 pl-5 text-sm">{s.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
