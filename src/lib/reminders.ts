import { update } from "./db";
import { appUrl, sendMail } from "./email";
import { checkinEmail, reminderEmail } from "./email-templates";
import { loadLab } from "./lab";

export const MAX_REMINDERS = 2;

/** Next friendly reminder to people who have not submitted this week. Never more than two. */
export async function remindUnsubmitted(personId?: string) {
  const lab = await loadLab();
  const due = lab.weekCheckins.filter((c) => !c.submitted_at && c.reminders_sent < MAX_REMINDERS && (!personId || c.person_id === personId));
  const sent: { name: string; number: number; mode: string }[] = [];
  for (const c of due) {
    const p = lab.byId.get(c.person_id)!;
    await update("checkins", c.id, { reminders_sent: c.reminders_sent + 1 });
    const r = await sendMail(reminderEmail({ to: p.email, name: p.name, link: `${appUrl()}/checkin/${c.token}`, number: c.reminders_sent + 1 }));
    sent.push({ name: p.name, number: c.reminders_sent + 1, mode: r.mode });
  }
  return sent;
}

/** The Monday check-in email, with last week's plan, to everyone who has not submitted. */
export async function sendCheckinEmails() {
  const lab = await loadLab();
  const sent: { name: string; mode: string }[] = [];
  for (const c of lab.weekCheckins.filter((x) => !x.submitted_at)) {
    const p = lab.byId.get(c.person_id)!;
    const planned = lab.tasks.filter((t) => t.assignee === p.id && t.status === "open").slice(0, 3).map((t) => t.title);
    const r = await sendMail(checkinEmail({ to: p.email, name: p.name, link: `${appUrl()}/checkin/${c.token}`, planned, projects: lab.projectsOf(p.id) }));
    sent.push({ name: p.name, mode: r.mode });
  }
  return sent;
}
