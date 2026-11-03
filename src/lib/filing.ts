import { museJson } from "./muse";
import { filingPrompt } from "./prompts";
import type { FileRow } from "./seed";

export type Suggestion = NonNullable<FileRow["suggestion"]>;
export type Candidate = { id: string; name: string; goal: string | null; questions: string[] };

const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 4));

/** Rule-based stand-in for Muse (mock mode): the project whose name, goal and questions share the most long words with the transcript. */
function heuristic(text: string, projects: Candidate[]) {
  const t = words(text);
  const scored = projects.map((p) => ({ p, n: [...words(`${p.name} ${p.goal ?? ""} ${p.questions.join(" ")}`)].filter((w) => t.has(w)).length })).sort((a, b) => b.n - a.n);
  return { project: scored[0] && scored[0].n >= 2 ? scored[0].p.name : null, title: "", reason: "Matched by keywords." };
}

/**
 * Where should this recording go? Code answers the easy cases (a student on one project), Muse reads the transcript for the rest.
 * It only suggests: nothing is moved until a person accepts.
 */
export async function suggestFiling(file: FileRow, projects: Candidate[], personProjectIds: string[]): Promise<Suggestion | null> {
  if (file.project_id || !projects.length) return null;
  if (file.kind === "voice_checkin" && personProjectIds.length === 1) return { project_id: personProjectIds[0], title: file.title, reason: "It is the only project they are on." };
  if (!file.transcript_text) return null;

  const r = await museJson("filing", filingPrompt({ kind: file.kind, title: file.title, text: file.transcript_text.slice(0, 2500) }, projects), heuristic(file.transcript_text, projects));
  const match = projects.find((p) => p.name.toLowerCase() === (r.project ?? "").toLowerCase());
  if (!match) return null; // a name that is not one of ours is ignored: Muse can only pick from the list
  return { project_id: match.id, title: r.title.trim().slice(0, 80) || file.title, reason: r.reason.trim().slice(0, 200) };
}
