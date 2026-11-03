import { addDays } from "./limits";
import type { Meeting } from "./seed";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type Occurrence = { id: string; date: string; time: string; minutes: number; title: string; project: string | null; place: string | null };

/** "13:30" as "1:30 PM". */
export function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** The meetings that fall in the week starting on `weekStart` (a Monday), earliest first. A weekly meeting lands on its weekday; a one-off only if its date is in the week. */
export function occurrencesInWeek(meetings: Meeting[], weekStart: string, projectName: (id: string | null) => string | null): Occurrence[] {
  const end = addDays(weekStart, 6);
  return meetings
    .map((m) => ({ m, date: m.weekday !== null ? addDays(weekStart, m.weekday) : (m.on_date ?? "") }))
    .filter(({ date }) => date >= weekStart && date <= end)
    .map(({ m, date }) => ({ id: m.id, date, time: m.starts, minutes: m.duration_min, title: m.title, project: projectName(m.project_id), place: m.place }))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (date: string, time: string) => `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
const endTime = (time: string, minutes: number) => {
  const total = Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) + minutes;
  const t = total % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

/** An iCalendar feed Google Calendar, Outlook and Teams can subscribe to. Times are floating (no time zone), so each person sees them in their own. */
export function toIcs(meetings: Meeting[], weekStart: string, labName: string, projectName: (id: string | null) => string | null): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Handover//Lab meetings//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${esc(labName)} meetings`];
  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  for (const m of meetings) {
    const date = m.weekday !== null ? addDays(weekStart, m.weekday) : m.on_date;
    if (!date) continue;
    const project = projectName(m.project_id);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${m.id}@handover`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(date, m.starts)}`,
      `DTEND:${stamp(date, endTime(m.starts, m.duration_min))}`,
      ...(m.weekday !== null ? [`RRULE:FREQ=WEEKLY;BYDAY=${["MO", "TU", "WE", "TH", "FR", "SA", "SU"][m.weekday]}`] : []),
      `SUMMARY:${esc(project ? `${m.title} (${project})` : m.title)}`,
      ...(m.place ? [`LOCATION:${esc(m.place)}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
