import { list } from "@/lib/db";
import { eventsBetween, fetchFeed, type FeedEvent } from "@/lib/ics-import";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// shortcut: feeds are cached in this instance's memory for 10 minutes; each serverless instance keeps its own copy.
const cache = new Map<string, { at: number; text: string }>();
const FRESH_MS = 10 * 60_000;

async function feedText(url: string) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.text;
  const text = await fetchFeed(url);
  cache.set(url, { at: Date.now(), text });
  return text;
}

// The next two weeks of events from the signed-in professor's connected calendars.
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required" }, { status: 401 });
  const links = await list("calendar_links", { col: "person_id", eq: session.personId }).catch(() => []);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + 14 * 86_400_000);
  const errors: { label: string; error: string }[] = [];
  const events: (FeedEvent & { source: string })[] = [];
  await Promise.all(
    links.map(async (l) => {
      try {
        for (const e of eventsBetween(await feedText(l.url), from, to)) events.push({ ...e, source: l.label });
      } catch (e) {
        errors.push({ label: l.label, error: e instanceof Error ? e.message : "Could not read this calendar" });
      }
    }),
  );
  events.sort((a, b) => a.start.localeCompare(b.start));
  return Response.json({ events, errors });
}
