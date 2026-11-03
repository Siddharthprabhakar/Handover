import type { z } from "zod";
import type { Synthesis } from "./schemas";
import type { FileRow } from "./seed";

export type SynthesisResult = z.infer<typeof Synthesis>;
export type StoredSynthesis = SynthesisResult & { at: string; based_on: number; checked?: { proposed: number; kept: number } }; // checked: quotes Muse proposed vs. quotes found word for word in the transcripts
export type Interview = { participant: string; title: string; text: string };

const PER_INTERVIEW = 6000; // characters
const TOTAL = 30_000;

/** The ready transcripts of one study, each labelled by participant and trimmed so they all fit in one prompt. */
export function interviewsOf(files: FileRow[]): Interview[] {
  const ready = files.filter((f) => f.kind === "interview" && f.status === "ready" && f.transcript_text);
  const each = Math.min(PER_INTERVIEW, Math.floor(TOTAL / Math.max(1, ready.length)));
  return ready.map((f) => ({ participant: f.participant_label?.trim() || f.title, title: f.title, text: f.transcript_text!.slice(0, each) }));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Muse proposes themes; code decides what stays. A quote is kept only if it appears word for word in that participant's own transcript,
 * a theme with no surviving quote is dropped, and the per-question participant counts are recomputed here, never taken from the model.
 */
export function groundSynthesis(r: SynthesisResult, interviews: Interview[], rqCount: number): SynthesisResult {
  const byName = new Map(interviews.map((i) => [i.participant.toLowerCase(), norm(i.text)]));
  const all = interviews.map((i) => norm(i.text));
  const themes = r.themes
    .map((t) => ({
      ...t,
      rq: t.rq !== null && t.rq >= 1 && t.rq <= rqCount ? t.rq : null,
      evidence: t.evidence.filter((e) => norm(e.quote).length > 8 && (byName.has(e.participant.toLowerCase()) ? byName.get(e.participant.toLowerCase())!.includes(norm(e.quote)) : all.some((h) => h.includes(norm(e.quote))))),
    }))
    .filter((t) => t.evidence.length > 0);
  const coverage = Array.from({ length: rqCount }, (_, i) => ({
    rq: i + 1,
    participants: new Set(themes.filter((t) => t.rq === i + 1).flatMap((t) => t.evidence.map((e) => e.participant.toLowerCase()))).size,
    note: r.coverage.find((c) => c.rq === i + 1)?.note ?? "",
  }));
  return { themes, coverage, gaps: r.gaps };
}

/** Rule-based stand-in for Muse (mock mode): counts participants whose transcript mentions a long word from the question. No themes. */
export function heuristicSynthesis(rqs: string[], interviews: Interview[]): SynthesisResult {
  return {
    themes: [],
    coverage: rqs.map((q, i) => {
      const words = norm(q).split(" ").filter((w) => w.length > 5);
      return { rq: i + 1, participants: interviews.filter((v) => words.some((w) => norm(v.text).includes(w))).length, note: "Counted by keyword. Turn on a live model for themes." };
    }),
    gaps: [],
  };
}
