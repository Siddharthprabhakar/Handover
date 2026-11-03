import { list } from "@/lib/db";
import { sendCheckinEmails } from "@/lib/reminders";

export const dynamic = "force-dynamic";

// Monday check-in emails for every lab. Same Bearer secret as the reminders cron.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const out: Record<string, number> = {};
  for (const lab of await list("labs")) out[lab.name] = (await sendCheckinEmails(lab.id)).length;
  return Response.json({ ok: true, emailed: out });
}
