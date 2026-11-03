import { z } from "zod";
import { remindUnsubmitted } from "@/lib/reminders";

export const dynamic = "force-dynamic";

const Body = z.object({ personId: z.string().optional() });

// Send the next friendly reminder email. Never more than 2 a week (see lib/reminders.ts).
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  return Response.json({ ok: true, sent: await remindUnsubmitted(body.data.personId) });
}
