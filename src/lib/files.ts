import { list } from "./db";
import { getSession } from "./session";
import type { FileRow } from "./seed";

export type Access = { labId: string; professor: boolean; personId: string | null; checkinId: string | null; submitted: boolean };

/** Who is calling: a signed-in professor, or a student holding their personal check-in token. Null if neither. */
export async function resolveAccess(token?: string | null): Promise<Access | null> {
  if (token) {
    const [c] = await list("checkins", { col: "token", eq: token });
    if (!c) return null;
    const [p] = await list("people", { col: "id", eq: c.person_id });
    return p ? { labId: p.lab_id, professor: false, personId: p.id, checkinId: c.id, submitted: Boolean(c.submitted_at) } : null;
  }
  const s = await getSession();
  return s ? { labId: s.labId, professor: true, personId: null, checkinId: null, submitted: false } : null;
}

/** One file the caller may touch: any in their lab for a professor, only their own recordings for a student. */
export async function findFile(id: string, a: Access): Promise<FileRow | null> {
  const [f] = await list("files", { col: "id", eq: id });
  if (!f || f.lab_id !== a.labId) return null;
  return a.professor || f.person_id === a.personId ? f : null;
}

export const kindLabel = { voice_checkin: "Voice check-in", interview: "Interview", upload: "Upload" } as const;
