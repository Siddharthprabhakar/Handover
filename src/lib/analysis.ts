import type { z } from "zod";
import type { InterviewAnalysis } from "./schemas";

export type Analysis = z.infer<typeof InterviewAnalysis>;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Keep only quotes that really appear in the transcript, like blocker quotes in check-ins. */
export function groundedThemes(a: Analysis, transcript: string): Analysis {
  const hay = norm(transcript);
  return { ...a, themes: a.themes.map((t) => ({ ...t, quotes: t.quotes.filter((q) => norm(q) && hay.includes(norm(q))) })) };
}

/** Rule-based stand-in for mock mode: the first sentences, no themes. */
export function heuristicAnalysis(transcript: string): Analysis {
  return { summary: transcript.split(/(?<=[.!?])\s+/).slice(0, 3).join(" ").slice(0, 400), themes: [], follow_ups: [] };
}
