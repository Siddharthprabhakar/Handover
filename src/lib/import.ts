import type { z } from "zod";
import type { ProjectImport } from "./schemas";

export type ImportDraft = z.infer<typeof ProjectImport>;

/** Rule-based stand-in for Muse (mock mode): every line that starts with a date like "10/4:" becomes a phase. */
export function heuristicImport(text: string, year: string): ImportDraft {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const phases: ImportDraft["phases"] = [];
  for (let i = 0; i < lines.length && phases.length < 12; i++) {
    const m = lines[i].match(/^(\d{1,2})\/(\d{1,2})\s*[:\-–]?\s*(.*)$/);
    if (!m) continue;
    const name = m[3] || lines[i + 1] || "Milestone";
    phases.push({ name: name.slice(0, 80), due: `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`, tasks: [] });
  }
  return { name: lines[0]?.slice(0, 120) ?? "Imported project", kind: "lab", goal: "", deadline: phases.at(-1)?.due ?? null, phases, resources: [], communication: [] };
}
