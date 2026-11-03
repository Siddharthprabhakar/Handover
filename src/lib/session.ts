import { cache } from "react";
import { redirect } from "next/navigation";
import { insert, list, remove, usingSupabase } from "./db";
import { DEMO_LAB } from "./seed";
import { createServerSupabase } from "./supabase/server";

export type Session = { personId: string; name: string; email: string; labId: string; labName: string; demo: boolean };

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
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") return null;

  let [person] = await list("people", { col: "auth_user_id", eq: user.id });
  if (!person) {
    // first sign-in after sign-up: create the lab and the professor from the sign-up details
    const meta = (user.user_metadata ?? {}) as { name?: string; lab_name?: string };
    const name = (meta.name || user.email?.split("@")[0] || "Professor").trim();
    const lab = await insert("labs", { name: (meta.lab_name || `${name}'s lab`).trim(), created_at: new Date().toISOString() });
    try {
      person = await insert("people", { lab_id: lab.id, auth_user_id: user.id, invited_at: null, name, email: user.email!, role: "professor", weekly_hours: 10, max_tasks: 5, status: "active", leaving_on: null });
    } catch (e) {
      // two requests raced to create this professor: keep the winner's lab and drop ours
      await remove("labs", lab.id);
      [person] = await list("people", { col: "auth_user_id", eq: user.id });
      if (!person) throw e;
    }
  }
  const [lab] = await list("labs", { col: "id", eq: person.lab_id });
  return { personId: person.id, name: person.name, email: person.email, labId: person.lab_id, labName: lab?.name ?? "Your lab", demo: false };
});

/** For pages: send signed-out users to the login screen. */
export async function requireProfessor(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}
