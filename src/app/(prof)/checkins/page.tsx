import { requireProfessor } from "@/lib/session";
import Link from "next/link";
import { ActionBar, Avatar, Card, Chip, PageHeader, type Tone } from "@/components/ui";
import { CheckinAnswers } from "@/components/CheckinAnswers";
import { ReminderButton } from "@/components/ReminderButton";
import type { Parsed } from "@/lib/checkin";
import { Suspense } from "react";
import { MuseDigestText } from "@/components/DigestSlot";
import { WEEK, fmtDate, initials, loadLab } from "@/lib/lab";

export const dynamic = "force-dynamic";

export default async function Checkins() {
  const session = await requireProfessor();
  const lab = await loadLab(session.labId);
  const shared = lab.digests.find((d) => d.week === WEEK);
  const submitted = lab.weekCheckins.filter((c) => c.submitted_at).length;
  const overtimeNow = new Set(lab.overtime.filter((o) => o.starts <= WEEK && o.ends >= WEEK).map((o) => o.person_id));
  const stuckIds = new Set(lab.blockers.filter((b) => !b.resolved_at).map((b) => b.person_id));

  const rows = lab.ras.map((p) => {
    const c = lab.weekCheckins.find((x) => x.person_id === p.id);
    const parsed = (c?.parsed as Parsed | null) ?? null;
    const projects = lab.projectsOf(p.id);
    const done = Boolean(c?.submitted_at);
    const first = parsed?.projects.flatMap((x) => x.blockers.map((b) => `“${b.quote}”`))[0];
    const summary = !done
      ? `${c?.reminders_sent ?? 0} reminder${c?.reminders_sent === 1 ? "" : "s"} sent. Not submitted on ${projects.length} project${projects.length === 1 ? "" : "s"}.`
      : (first ?? parsed?.projects.flatMap((x) => [...x.next, ...x.done])[0] ?? (c?.raw?.text ?? "").slice(0, 100));
    let flag: { label: string; tone: Tone } | null = null;
    if (!done) flag = { label: "Missing", tone: "warn" };
    else if (stuckIds.has(p.id)) flag = { label: "Stuck?", tone: "warn" };
    else if (parsed?.projects.some((x) => x.needs_tasks)) flag = { label: "Needs tasks", tone: "ok" };
    else if (parsed?.projects.some((x) => x.support.length)) flag = { label: "Support", tone: "crimson" };
    else if (overtimeNow.has(p.id)) flag = { label: "Overtime", tone: "crimson" };
    return { p, c, done, projects, summary, flag };
  });

  const pending = rows.filter((r) => !r.done);
  const canRemind = pending.filter((r) => (r.c?.reminders_sent ?? 0) < 2);
  const sentAt = (n: number) => lab.weekCheckins.filter((c) => c.reminders_sent >= n).length;
  const missingNames = pending.map((r) => r.p.name.split(" ")[0]).join(", ");

  return (
    <>
      <PageHeader title="Check-ins" sub={`Week of ${fmtDate(WEEK)} · every Monday at 9:00 AM ET · ${submitted} of ${lab.ras.length} submitted`} />
      <div className="flex gap-2 px-2"><Chip tone="dark">{fmtDate(WEEK)} · this week</Chip></div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-x-auto !p-6">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[170px_100px_130px_1fr_100px_70px] gap-3 py-2 text-xs font-semibold text-muted">
            <span>Person</span><span>Status</span><span>Projects</span><span>What Muse understood</span><span>Flag</span><span>Answers</span>
          </div>
          {rows.map(({ p, c, done, projects, summary, flag }) => (
            <div key={p.id} className="grid grid-cols-[170px_100px_130px_1fr_100px_70px] items-center gap-3 border-t border-line py-3.5">
              <span className="flex items-center gap-2.5"><Avatar initials={initials(p.name)} size={30} /><b className="text-sm font-semibold">{p.name}</b></span>
              <span><Chip tone={done ? "ok" : "warn"}>{done ? "Submitted" : "Missing"}</Chip></span>
              <span className="text-[13px] leading-snug">{projects.join(", ")}</span>
              <span className="text-[13px] leading-snug text-muted">{summary}</span>
              <span>{flag ? <Chip tone={flag.tone}>{flag.label}</Chip> : <span className="text-muted">—</span>}</span>
              <span>{done && c?.raw?.text ? <CheckinAnswers name={p.name} text={c.raw.text} /> : <span className="text-muted">—</span>}</span>
            </div>
          ))}
        </div>
      </Card>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-2.5">
            <h2 className="font-heading text-[19px] font-bold">Reminders this week</h2>
            {[
              ["Mon 9:00 AM ET", `Check-in email sent to ${lab.ras.length}`],
              ["Tue 9:00 AM ET", `Reminder 1 sent to ${sentAt(1)}`],
              ["Wed 9:00 AM ET", sentAt(2) ? `Reminder 2 sent to ${sentAt(2)}` : pending.length ? `Reminder 2 scheduled for ${missingNames}` : "No reminder needed"],
            ].map(([a, b]) => (
              <div key={a} className="flex gap-3 text-[13px]"><b className="w-16 shrink-0">{a}</b><span className="leading-snug text-muted">{b}</span></div>
            ))}
            <p className="text-xs leading-snug text-muted">Reminders stop as soon as someone submits. At most two a week.</p>
          </Card>
          <Card dark className="flex flex-col gap-2.5 rounded-[28px]">
            <div className="flex items-center gap-2">
              <Chip tone="light">Suggested by Muse</Chip>
              {shared?.shared_at && <Chip tone="ok">Shared with lab</Chip>}
            </div>
            <h2 className="font-heading text-xl font-bold">Weekly digest</h2>
            <Suspense fallback={<p className="text-sm text-white/70">Muse is reading this week&apos;s check-ins…</p>}><MuseDigestText lab={lab} text={shared?.text} /></Suspense>
          </Card>
        </div>
      </div>

      <ActionBar hint={pending.length ? "Reminder 2 goes out Wednesday 9:00 AM ET automatically." : "Everyone has checked in."}>
        <Link href="/outbox" className="text-[13px] font-semibold text-crimson">View sent emails</Link>
        <ReminderButton kind="out" endpoint="/api/checkin-emails" label="Send check-in emails" sentLabel="Emails sent" disabled={!pending.length} />
        <ReminderButton kind="pri" label={canRemind.length ? `Send reminder to ${canRemind.map((r) => r.p.name.split(" ")[0]).join(", ")}` : "No reminders due"} disabled={!canRemind.length} />
      </ActionBar>
    </>
  );
}
