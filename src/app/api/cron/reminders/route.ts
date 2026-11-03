import { list } from "@/lib/db";
import { remindUnsubmitted } from "@/lib/reminders";

export const dynamic = "force-dynamic";

// Called by Vercel Cron (see vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const out: Record<string, number> = {};
  for (const lab of await list("labs")) out[lab.name] = (await remindUnsubmitted(lab.id)).length;
  return Response.json({ ok: true, reminded: out });
}
