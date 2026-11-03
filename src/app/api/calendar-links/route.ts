import { z } from "zod";
import { insert, list, remove } from "@/lib/db";
import { dbMessage } from "@/lib/errors";
import { fetchFeed, normalizeFeedUrl } from "@/lib/ics-import";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), label: z.string().trim().min(1).max(60), url: z.string().trim().min(8).max(1000) }),
  z.object({ op: z.literal("delete"), id: z.string() }),
]);

// Connect or disconnect a read-only calendar feed (Canvas, Google Calendar, Outlook). A feed is checked once when it is added, so a wrong address fails here and not later.
async function handle(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Add a name and the calendar address" }, { status: 400 });
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const b = body.data;
  if (b.op === "delete") {
    const link = (await list("calendar_links", { col: "id", eq: b.id }))[0];
    if (!link || link.person_id !== session.personId) return Response.json({ error: "Not found" }, { status: 404 });
    await remove("calendar_links", link.id);
    return Response.json({ ok: true });
  }
  let url: string;
  try {
    url = normalizeFeedUrl(b.url);
    await fetchFeed(url);
  } catch (e) {
    return Response.json({ error: e instanceof Error && e.message ? e.message : "That address did not work" }, { status: 422 });
  }
  if ((await list("calendar_links", { col: "person_id", eq: session.personId })).length >= 5) return Response.json({ error: "You can connect up to 5 calendars" }, { status: 409 });
  await insert("calendar_links", { lab_id: session.labId, person_id: session.personId, label: b.label, url, created_at: new Date().toISOString() });
  return Response.json({ ok: true });
}

export async function POST(...args: Parameters<typeof handle>) {
  try {
    return await handle(...args);
  } catch (e) {
    return Response.json({ error: dbMessage(e) }, { status: 500 });
  }
}
