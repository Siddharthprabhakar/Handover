import { update, usingSupabase } from "@/lib/db";
import { loadDemoLab } from "@/lib/demo-lab";
import { getSession } from "@/lib/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { judgeEnabled } from "@/lib/judge";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One-click entry for judges: signs in as the shared demo professor on the server (the password never reaches the browser)
// and fills the demo lab the first time.
export async function POST(req: Request) {
  const to = (path: string) => Response.redirect(new URL(path, req.url), 303);
  if (!usingSupabase || !judgeEnabled()) return to("/login?fresh=1");
  const { error } = await (await createServerSupabase()).auth.signInWithPassword({ email: process.env.JUDGE_EMAIL!, password: process.env.JUDGE_PASSWORD! });
  if (error) return to("/login?fresh=1");
  const s = await getSession();
  if (!s) return to("/login?fresh=1");
  if (s.name === s.email.split("@")[0]) {
    await update("people", s.personId, { name: "Dr. Rivera" });
    await update("labs", s.labId, { name: "Interaction Design Lab" });
  }
  await loadDemoLab(s.labId).catch(() => {}); // already loaded, or the database is behind: the lab still opens
  return to("/");
}
