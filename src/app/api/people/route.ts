import { dbMessage } from "@/lib/errors";
import { z } from "zod";
import { insert } from "@/lib/db";
import { appUrl, sendMail } from "@/lib/email";
import { inviteEmail } from "@/lib/email-templates";
import { loadLab } from "@/lib/lab";
import { PROGRAMS } from "@/lib/programs";
import { ensureWeekCheckins } from "@/lib/reminders";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({ name: z.string().trim().min(1).max(120), email: z.string().trim().toLowerCase().email().max(200), program: z.enum(PROGRAMS).nullish() });

// Add a research assistant or student and email them their personal check-in link. No account needed.
async function handle(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Add a name and a valid email address" }, { status: 400 });
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const { name, email, program } = body.data;
  if (session.judge && !email.endsWith(".invalid")) return Response.json({ error: "The shared demo cannot send real email. Use an address ending in .invalid, for example sam@demo.invalid." }, { status: 403 });

  let lab = await loadLab(session.labId);
  if (lab.people.some((p) => p.email.toLowerCase() === email)) return Response.json({ error: "Someone with that email is already in your lab" }, { status: 409 });

  const person = await insert("people", { lab_id: session.labId, auth_user_id: null, invited_at: new Date().toISOString(), name, email, role: "ra", weekly_hours: 10, max_tasks: 5, status: "active", leaving_on: null, program: program ?? null });
  await ensureWeekCheckins(session.labId);
  lab = await loadLab(session.labId);
  const checkin = lab.weekCheckins.find((c) => c.person_id === person.id)!;
  const mail = await sendMail(inviteEmail({ to: email, name, link: `${appUrl()}/checkin/${checkin.token}`, lab: session.labName, professor: session.name, replyTo: session.email }), session.labId);
  return Response.json({ ok: true, id: person.id, emailed: mail.mode === "sent", emailNote: mail.error });
}

export async function POST(...args: Parameters<typeof handle>) {
  try {
    return await handle(...args);
  } catch (e) {
    return Response.json({ error: dbMessage(e) }, { status: 500 });
  }
}
