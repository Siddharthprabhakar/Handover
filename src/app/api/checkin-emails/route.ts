import { sendCheckinEmails } from "@/lib/reminders";

export const dynamic = "force-dynamic";

// Send this week's check-in email to everyone who has not submitted.
export async function POST() {
  return Response.json({ ok: true, sent: await sendCheckinEmails() });
}
