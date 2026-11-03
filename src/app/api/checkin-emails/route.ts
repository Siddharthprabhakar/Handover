import { getSession } from "@/lib/session";
import { sendCheckinEmails } from "@/lib/reminders";

export const dynamic = "force-dynamic";

// Send this week's check-in email to everyone who has not submitted.
export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  return Response.json({ ok: true, sent: await sendCheckinEmails(session.labId) });
}
