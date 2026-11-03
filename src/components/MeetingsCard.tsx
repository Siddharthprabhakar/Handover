"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDays } from "@/lib/limits";
import { DAYS, fmtTime, type Occurrence } from "@/lib/meetings";
import type { Meeting } from "@/lib/seed";
import { Card } from "./ui";

const field = "w-full rounded-xl bg-bg px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-crimson/30";
const dayName = (date: string) => DAYS[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7];

type Props = { weekStart: string; today: string; items: Occurrence[]; meetings: Meeting[]; projects: { id: string; name: string }[]; feedUrl: string | null };

/** This week's meetings at a glance, with a dialog to add them and to subscribe from Google Calendar, Outlook or Teams. */
export function MeetingsCard({ weekStart, today, items, meetings, projects, feedUrl }: Props) {
  const [open, setOpen] = useState(false);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const shown = items.slice(0, 3);
  return (
    <Card className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-muted">Meetings this week</span>
        <span className="flex-1" />
        <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-line px-3 py-1 text-xs font-semibold">Manage</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {week.map((d, i) => {
          const has = items.some((x) => x.date === d);
          return (
            <div key={d} className={`rounded-lg py-1 ${d === today ? "bg-crimson text-white" : ""}`}>
              <div className={`text-[10px] font-semibold ${d === today ? "" : "text-muted"}`}>{DAYS[i][0]}</div>
              <div className="text-[13px] font-semibold leading-tight">{Number(d.slice(8))}</div>
              <i className={`mx-auto mt-0.5 block h-1.5 w-1.5 rounded-full ${has ? (d === today ? "bg-white" : "bg-crimson") : "bg-transparent"}`} />
            </div>
          );
        })}
      </div>
      {shown.length === 0 ? (
        <p className="text-[13px] text-muted">No meetings this week. Use Manage to add one.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {shown.map((m) => (
            <li key={`${m.id}${m.date}`} className="text-[13px] leading-snug">
              <b className="font-semibold">{dayName(m.date)} {fmtTime(m.time)}</b> · {m.title}
              <span className="block truncate text-xs text-muted">{[m.project, m.place].filter(Boolean).join(" · ")}</span>
            </li>
          ))}
          {items.length > shown.length && <li className="text-xs text-muted">+{items.length - shown.length} more</li>}
        </ul>
      )}
      {open && <Manage meetings={meetings} projects={projects} feedUrl={feedUrl} onClose={() => setOpen(false)} />}
    </Card>
  );
}

function Manage({ meetings, projects, feedUrl, onClose }: Pick<Props, "meetings" | "projects" | "feedUrl"> & { onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({ title: "", projectId: "", repeat: "weekly", weekday: 4, date: "", time: "13:30", minutes: 60, place: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function call(body: object) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/meetings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "That did not work");
    router.refresh();
    return true;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const weekly = f.repeat === "weekly";
    if (!weekly && !f.date) return setError("Pick a date");
    if (await call({ op: "add", title: f.title, projectId: f.projectId || null, weekday: weekly ? f.weekday : null, date: weekly ? null : f.date, time: f.time, minutes: f.minutes, place: f.place || null })) setF({ ...f, title: "", place: "" });
  }

  async function copy() {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="fixed inset-0 z-40 flex overflow-auto bg-black/55 p-5" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="m-auto flex w-full max-w-[560px] flex-col gap-4 rounded-[28px] bg-surface p-7 text-left">
        <h2 className="font-heading text-2xl font-bold">Project meetings</h2>

        {meetings.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {meetings.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5 rounded-xl bg-bg px-3.5 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <b className="font-semibold">{m.title}</b>
                  <span className="block truncate text-xs text-muted">
                    {m.weekday !== null ? `Every ${DAYS[m.weekday]}` : m.on_date} · {fmtTime(m.starts)} · {m.duration_min} min{m.place ? ` · ${m.place}` : ""}{projects.find((p) => p.id === m.project_id) ? ` · ${projects.find((p) => p.id === m.project_id)!.name}` : ""}
                  </span>
                </span>
                <button type="button" disabled={busy} onClick={() => call({ op: "delete", id: m.id })} aria-label="Delete meeting" className="px-1 text-muted">✕</button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={add} className="flex flex-col gap-2.5">
          <b className="text-sm">Add a meeting</b>
          <input className={field} required placeholder="Weekly team meeting" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <select className={field} value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })} aria-label="Project">
            <option value="">No project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2.5">
            <select className={field} value={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.value })} aria-label="Repeat">
              <option value="weekly">Every week on</option>
              <option value="once">Once on</option>
            </select>
            {f.repeat === "weekly" ? (
              <select className={field} value={f.weekday} onChange={(e) => setF({ ...f, weekday: Number(e.target.value) })} aria-label="Weekday">
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            ) : (
              <input type="date" className={field} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} aria-label="Date" />
            )}
            <input type="time" className={field} required value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} aria-label="Start time" />
            <select className={field} value={f.minutes} onChange={(e) => setF({ ...f, minutes: Number(e.target.value) })} aria-label="Length">
              {[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}
            </select>
          </div>
          <input className={field} placeholder="Teams, a room, or a link" value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} />
          {error && <p role="alert" className="rounded-xl bg-crimson-soft px-3.5 py-2.5 text-[13px] font-semibold text-crimson">{error}</p>}
          <button disabled={busy} className="self-start rounded-full bg-crimson px-[18px] py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Add meeting"}</button>
        </form>

        <div className="flex flex-col gap-2 rounded-2xl bg-bg p-4">
          <b className="text-sm">Show these in your calendar</b>
          {feedUrl ? (
            <>
              <div className="flex gap-2">
                <input readOnly value={feedUrl} onFocus={(e) => e.target.select()} className={`${field} !bg-surface text-xs`} aria-label="Calendar address" />
                <button type="button" onClick={copy} className="shrink-0 rounded-full border border-line px-3.5 py-2 text-xs font-semibold">{copied ? "Copied" : "Copy"}</button>
              </div>
              <p className="text-xs leading-relaxed text-muted">
                Google Calendar: Other calendars, then From URL. Outlook or Teams: Add calendar, then Subscribe from web. Changes made here show up there on their own, usually within a few hours. It is one way: edits in your calendar do not come back. Anyone with this address can see the meetings, so share it only with the lab.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted">The calendar address needs the Supabase database, which this demo runs without.</p>
          )}
        </div>

        <button type="button" disabled={busy} onClick={onClose} className="self-start rounded-full border border-line px-[18px] py-2.5 text-sm font-semibold">Close</button>
      </div>
    </div>
  );
}
