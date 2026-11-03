"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "./ui";

type Ev = { title: string; start: string; end: string; allDay: boolean; where: string | null; source: string };
const field = "w-full rounded-xl bg-bg px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-crimson/30";

/** Connect Canvas, Google or Outlook calendars by their read-only feed address, and see the next two weeks from them. */
export function CalendarLinks({ links }: { links: { id: string; label: string; host: string }[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("Canvas");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ events: Ev[]; errors: { label: string; error: string }[] } | null>(null);

  useEffect(() => {
    if (!links.length) return;
    let live = true;
    fetch("/api/calendar-links/events").then((r) => r.json()).then((d) => live && setData(d)).catch(() => live && setData({ events: [], errors: [] }));
    return () => { live = false; };
  }, [links.length]);

  async function call(body: object) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/calendar-links", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "That did not work");
    router.refresh();
    return true;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await call({ op: "add", label, url })) setUrl("");
  }

  // group by the day in the browser's own time zone
  const days = new Map<string, Ev[]>();
  for (const ev of data?.events ?? []) {
    const key = new Date(ev.start).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
    days.set(key, [...(days.get(key) ?? []), ev]);
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-xl font-bold">Canvas and other calendars</h2>
        <p className="mt-1 text-sm text-muted">Connect your Canvas calendar to see course events and due dates here. It is read-only: Handover never changes anything in Canvas.</p>
      </div>

      {links.map((l) => (
        <div key={l.id} className="flex items-center gap-2.5 rounded-xl bg-bg px-3.5 py-2.5 text-sm">
          <span className="min-w-0 flex-1"><b className="font-semibold">{l.label}</b><span className="block truncate text-xs text-muted">{l.host}</span></span>
          <button type="button" disabled={busy} onClick={() => call({ op: "delete", id: l.id })} className="rounded-full border border-line px-3 py-1 text-xs font-semibold">Disconnect</button>
        </div>
      ))}

      <form onSubmit={add} className="flex flex-col gap-2.5">
        <div className="grid gap-2.5 sm:grid-cols-[160px_1fr]">
          <input className={field} value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} aria-label="Name" placeholder="Canvas" />
          <input className={field} required value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Calendar feed address" placeholder="https://yourschool.instructure.com/feeds/calendars/user_….ics" />
        </div>
        {error && <p role="alert" className="rounded-xl bg-crimson-soft px-3.5 py-2.5 text-[13px] font-semibold text-crimson">{error}</p>}
        <button disabled={busy || !url.trim()} className="self-start rounded-full bg-crimson px-[18px] py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Checking…" : "Connect calendar"}</button>
      </form>

      <details className="text-sm text-muted">
        <summary className="cursor-pointer font-semibold text-ink">Where do I find the address?</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
          <li><b>Canvas:</b> open Calendar, then click Calendar Feed at the bottom right of the page and copy the link.</li>
          <li><b>Google Calendar:</b> Settings, your calendar, then Secret address in iCal format.</li>
          <li><b>Outlook or Teams:</b> Settings, Calendar, Shared calendars, Publish a calendar, then copy the ICS link.</li>
        </ul>
        <p className="mt-2">The address works like a password for your calendar, so do not share it.</p>
      </details>

      {links.length > 0 && (
        <div className="flex flex-col gap-3">
          <b className="text-sm">Coming up in the next two weeks</b>
          {data === null && <p className="text-sm text-muted">Reading your calendars…</p>}
          {data?.errors.map((e) => <p key={e.label} className="text-[13px] text-crimson">{e.label}: {e.error}</p>)}
          {data && data.events.length === 0 && !data.errors.length && <p className="text-sm text-muted">Nothing scheduled in the next two weeks.</p>}
          {[...days].map(([day, evs]) => (
            <div key={day}>
              <div className="mb-1 text-xs font-semibold text-muted">{day}</div>
              {evs.map((ev, i) => (
                <div key={i} className="flex gap-3 border-t border-line py-2 text-sm first:border-t-0">
                  <span className="w-[72px] shrink-0 font-semibold">{ev.allDay ? "All day" : new Date(ev.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                  <span className="min-w-0 flex-1"><span className="block">{ev.title}</span><span className="block truncate text-xs text-muted">{[ev.source, ev.where].filter(Boolean).join(" · ")}</span></span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
