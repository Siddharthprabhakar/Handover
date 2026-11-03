import dns from "node:dns/promises";
import net from "node:net";
import ical, { type VEvent } from "node-ical";

const MAX_BYTES = 3 * 1024 * 1024;

export type FeedEvent = { title: string; start: string; end: string; allDay: boolean; where: string | null };

/** "webcal://" is just "https://" for calendars. Only https feeds are accepted. */
export function normalizeFeedUrl(raw: string): string {
  const u = new URL(raw.trim().replace(/^webcal:\/\//i, "https://"));
  if (u.protocol !== "https:") throw new Error("Use the https address of the calendar feed");
  return u.toString();
}

const PRIVATE_V4 = /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/;
const isPrivate = (ip: string) => {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (net.isIPv4(v4)) return PRIVATE_V4.test(v4);
  const x = ip.toLowerCase();
  return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80");
};

/** Download a calendar feed. The address comes from a user, so it must resolve to a public host, and redirects are refused. */
export async function fetchFeed(url: string): Promise<string> {
  const u = new URL(url);
  const addrs = await dns.lookup(u.hostname, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some((a) => isPrivate(a.address))) throw new Error("That address cannot be reached");
  // shortcut: the host is resolved again by fetch, so a hostile DNS server could answer differently the second time; fine for pasted feed links, pin the address before opening this to untrusted users.
  const res = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { accept: "text/calendar, text/plain" } });
  if (res.status >= 300 && res.status < 400) throw new Error("That address redirects somewhere else. Paste the final feed address");
  if (!res.ok) throw new Error(`The calendar answered ${res.status}. Check the address`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) throw new Error("That calendar is too large");
  const text = new TextDecoder().decode(buf);
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("That address is not a calendar feed");
  return text;
}

const str = (v: unknown): string => (typeof v === "string" ? v : v && typeof v === "object" && "val" in v ? String((v as { val: unknown }).val) : "");

/** Events between two instants, with repeating events expanded. */
export function eventsBetween(text: string, from: Date, to: Date): FeedEvent[] {
  const out: FeedEvent[] = [];
  for (const c of Object.values(ical.parseICS(text))) {
    const e = c as VEvent | undefined;
    if (!e || e.type !== "VEVENT") continue;
    const items = e.rrule ? ical.expandRecurringEvent(e, { from, to, expandOngoing: true }) : [{ start: e.start, end: e.end ?? e.start, isFullDay: e.datetype === "date" }];
    for (const i of items) {
      if (!i.start || i.end < from || i.start > to) continue;
      const allDay = Boolean((i as { isFullDay?: boolean }).isFullDay);
      // an all-day event is a date, not a moment: pin it to noon UTC so it lands on the same day in any time zone
      const at = (d: Date) => (allDay ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T12:00:00.000Z` : d.toISOString());
      out.push({ title: str(e.summary) || "Event", start: at(new Date(i.start)), end: at(new Date(i.end ?? i.start)), allDay, where: str(e.location) || null });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start)).slice(0, 80);
}
