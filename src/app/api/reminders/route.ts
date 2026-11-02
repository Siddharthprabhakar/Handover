import { z } from "zod";
import { list, update } from "@/lib/db";
import { WEEK } from "@/lib/lab";

export const dynamic = "force-dynamic";

const MAX_REMINDERS = 2;
const Body = z.object({ personId: z.string().optional() });

// Send the next friendly reminder to people who have not submitted. Never more than 2 a week.
// Email delivery is added in stage 8; for now this records that the reminder went out.
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const [checkins, people] = await Promise.all([list("checkins"), list("people")]);
  const due = checkins.filter(
    (c) => c.week === WEEK && !c.submitted_at && c.reminders_sent < MAX_REMINDERS && (!body.data.personId || c.person_id === body.data.personId),
  );
  for (const c of due) await update("checkins", c.id, { reminders_sent: c.reminders_sent + 1 });
  return Response.json({ ok: true, sent: due.map((c) => ({ name: people.find((p) => p.id === c.person_id)?.name, number: c.reminders_sent + 1 })) });
}
