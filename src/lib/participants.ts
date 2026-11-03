import type { FileRow, Participant } from "./seed";

export type Stats = { signedUp: number; scheduled: number; interviewed: number; transcribed: number };

const key = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/**
 * Where a study stands on recruitment. A participant counts as signed up if they are on the list or have a recording,
 * and as interviewed once any recording carries their label, so the numbers cannot drift from the files.
 */
export function participantStats(roster: Participant[], files: FileRow[]): Stats {
  const interviews = files.filter((f) => f.kind === "interview" && key(f.participant_label));
  const interviewed = new Set(interviews.map((f) => key(f.participant_label)));
  const transcribed = new Set(interviews.filter((f) => f.status === "ready").map((f) => key(f.participant_label)));
  const active = roster.filter((p) => p.status !== "withdrew");
  const signedUp = new Set([...active.map((p) => key(p.label)), ...interviewed]);
  return { signedUp: signedUp.size, scheduled: active.filter((p) => p.status === "scheduled" && !interviewed.has(key(p.label))).length, interviewed: interviewed.size, transcribed: transcribed.size };
}

/** One row per person for the roster: their stage, worked out from the list and the recordings. */
export function rosterRows(roster: Participant[], files: FileRow[]) {
  const interviews = files.filter((f) => f.kind === "interview" && key(f.participant_label));
  const done = new Set(interviews.map((f) => key(f.participant_label)));
  const ready = new Set(interviews.filter((f) => f.status === "ready").map((f) => key(f.participant_label)));
  const rows = roster.map((p) => ({ id: p.id as string | null, label: p.label, stage: p.status === "withdrew" ? "withdrew" : ready.has(key(p.label)) ? "transcribed" : done.has(key(p.label)) ? "interviewed" : p.status }));
  // someone with a recording but no roster entry still counts
  for (const f of interviews) if (!roster.some((p) => key(p.label) === key(f.participant_label)) && !rows.some((r) => key(r.label) === key(f.participant_label))) rows.push({ id: null, label: f.participant_label!.trim(), stage: ready.has(key(f.participant_label)) ? "transcribed" : "interviewed" });
  return rows.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}
