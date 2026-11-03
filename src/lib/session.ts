import { cache } from "react";
import { redirect } from "next/navigation";
import { insert, list, personWithLab, remove, usingSupabase } from "./db";
import { DEMO_LAB } from "./seed";
import { createServerSupabase } from "./supabase/server";

export type Session = { personId: string; name: string; email: string; labId: string; labName: string; demo: boolean };

// A short memory of who a signed-in user is, so most clicks skip the database lookup.
// Safe to keep for a minute: the user id comes from a verified token, and only the display name could be stale.
const known = new Map<string, { s: Session; at: number }>();
const KNOWN_FOR_MS = 60_000;

/**
 * The signed-in professor and their lab, or null. A session counts only after the second factor
 * (aal2). Without Supabase configured, the app runs as the in-memory demo professor.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  if (!usingSupabase) {
    const [p] = await list("people", { col: "role", eq: "professor" });
    return { personId: p.id, name: p.name, email: p.email, labId: DEMO_LAB, labName: "Demo lab", demo: true };
  }
  const sb = await createServerSupabase();
  // the token signature is verified locally: no network call to Supabase on every request
  const { data } = await sb.auth.getClaims();
  const claims = data?.claims;
  if (!claims || claims.aal !== "aal2") return null;

  const userId = claims.sub;
  const hit = known.get(userId);
  if (hit && Date.now() - hit.at < KNOWN_FOR_MS) return hit.s;

  let found = await personWithLab(userId);
  if (!found) {
    // first sign-in after sign-up: create the lab and the professor from the sign-up details
    const meta = (claims.user_metadata ?? {}) as { name?: string; lab_name?: string };
    const email = claims.email ?? "";
    const name = (meta.name || email.split("@")[0] || "Professor").trim();
    const lab = await insert("labs", { name: (meta.lab_name || `${name}'s lab`).trim(), created_at: new Date().toISOString() });
    try {
      const person = await insert("people", { lab_id: lab.id, auth_user_id: userId, invited_at: null, name, email, role: "professor", weekly_hours: 10, max_tasks: 5, status: "active", leaving_on: null });
      found = { person, labName: lab.name };
    } catch (e) {
      // two requests raced to create this professor: keep the winner's lab and drop ours
      await remove("labs", lab.id);
      found = await personWithLab(userId);
      if (!found) throw e;
    }
  }
  const s: Session = { personId: found.person.id, name: found.person.name, email: found.person.email, labId: found.person.lab_id, labName: found.labName, demo: false };
  known.set(userId, { s, at: Date.now() });
  return s;
});

/** For pages: send signed-out users to the login screen. */
export async function requireProfessor(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}
