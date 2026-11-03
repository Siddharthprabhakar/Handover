import { insert, update } from "./db";
import { WEEK } from "./demo";
import { appUrl, sendMail } from "./email";
import { checkinEmail, reminderEmail } from "./email-templates";
import { loadLab } from "./lab";

export const MAX_REMINDERS = 2;

/** One check-in row per RA for this week, with an unguessable personal link. */
export async function ensureWeekCheckins(labId: string) {
  const lab = await loadLab(labId);
  for (const p of lab.ras) {
    if (lab.weekCheckins.some((c) => c.person_id === p.id)) continue;
    await insert("checkins", { person_id: p.id, week: WEEK, raw: null, parsed: null, token: `ck-${crypto.randomUUID().replace(/-/g, "")}`, submitted_at: null, reminders_sent: 0 });
  }
}

/** Next friendly reminder to people who have not submitted this week. Never more than two. */
export async function remindUnsubmitted(labId: string, personId?: string) {
  await ensureWeekCheckins(labId);
  const lab = await loadLab(labId);
  const due = lab.weekCheckins.filter((c) => !c.submitted_at && c.reminders_sent < MAX_REMINDERS && (!personId || c.person_id === personId));
  const sent: { name: string; number: number; mode: string; error?: string }[] = [];
  for (const c of due) {
    const p = lab.byId.get(c.person_id)!;
    const r = await sendMail(reminderEmail({ to: p.email, name: p.name, link: `${appUrl()}/checkin/${c.token}`, number: c.reminders_sent + 1, lab: lab.labName }), labId);
    if (r.mode === "sent" || r.error === "Demo address: not sent" || r.error === "Gmail is not configured") await update("checkins", c.id, { reminders_sent: c.reminders_sent + 1 });
    sent.push({ name: p.name, number: c.reminders_sent + 1, mode: r.mode, error: r.error });
  }
  return sent;
}

/** The weekly check-in email, with last week's plan, to everyone who has not submitted. */
export async function sendCheckinEmails(labId: string) {
  await ensureWeekCheckins(labId);
  const lab = await loadLab(labId);
  const sent: { name: string; mode: string; error?: string }[] = [];
  for (const c of lab.weekCheckins.filter((x) => !x.submitted_at)) {
    const p = lab.byId.get(c.person_id)!;
    const planned = lab.tasks.filter((t) => t.assignee === p.id && t.status === "open").slice(0, 3).map((t) => t.title);
    const r = await sendMail(checkinEmail({ to: p.email, name: p.name, link: `${appUrl()}/checkin/${c.token}`, planned, projects: lab.projectsOf(p.id), lab: lab.labName }), labId);
    sent.push({ name: p.name, mode: r.mode, error: r.error });
  }
  return sent;
}
