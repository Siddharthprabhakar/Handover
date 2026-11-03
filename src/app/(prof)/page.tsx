import { Avatar, Card, Chip, PageHeader } from "@/components/ui";
import { DigestCard } from "@/components/DigestCard";
import { ReminderButton } from "@/components/ReminderButton";
import { getDigest } from "@/lib/digest";
import { WEEK, fmtDate, initials, loadLab } from "@/lib/lab";

export const dynamic = "force-dynamic";

export default async function LabOverview() {
  const lab = await loadLab();
  const digest = await getDigest(lab);
  const byName = new Map(lab.people.map((p) => [p.name, p]));
  const submitted = lab.weekCheckins.filter((c) => c.submitted_at).length;
  const flagged = new Set([...digest.stuck.map((s) => s.person), ...digest.missing, ...digest.needs_tasks]);
  const onTrackPct = Math.round(((lab.ras.length - flagged.size) / lab.ras.length) * 100);
  const dots = Math.round((onTrackPct / 100) * 32);
  const activeOvertime = lab.overtime.filter((o) => o.starts <= WEEK && o.ends >= WEEK);
  const saved = lab.digests.find((d) => d.week === WEEK);
  const attention = digest.stuck.length + digest.missing.length + digest.needs_tasks.length;

  return (
    <>
      <PageHeader title="Good morning, Dr. Rivera" sub={`Week of Nov 2 · ${submitted} of ${lab.ras.length} check-ins in`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex flex-col gap-2">
          <span className="text-[13px] text-muted">Check-ins this week</span>
          <div className="font-heading text-[52px] font-medium leading-none">
            {submitted}
            <span className="ml-1.5 font-sans text-sm text-muted">/ {lab.ras.length}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-crimson" style={{ width: `${(submitted / lab.ras.length) * 100}%` }} />
          </div>
        </Card>
        <Card className="flex flex-col gap-2">
          <span className="text-[13px] text-muted">Needs attention</span>
          <div className="font-heading text-[52px] font-medium leading-none text-crimson">{attention}</div>
          <div className="flex flex-wrap gap-1.5">
            {digest.stuck.map((s) => <Chip key={s.person} tone="warn">{s.person.split(" ")[0]}</Chip>)}
            {digest.missing.map((n) => <Chip key={n} tone="light">{n.split(" ")[0]}</Chip>)}
            {digest.needs_tasks.map((n) => <Chip key={n} tone="ok">{n.split(" ")[0]}</Chip>)}
          </div>
        </Card>
        <Card className="flex flex-wrap items-center gap-3.5">
          <div>
            <span className="text-[13px] text-muted">RAs on track</span>
            <div className="mt-1.5 font-heading text-[46px] font-medium leading-none">{onTrackPct}%</div>
          </div>
          <div className="grid shrink-0 grid-cols-[repeat(8,12px)] gap-[5px]">
            {Array.from({ length: 32 }, (_, i) => <i key={i} className={`h-3 w-3 rounded-full ${i < dots ? "bg-dark" : "bg-crimson"}`} />)}
          </div>
        </Card>
        <Card dark className="flex flex-col gap-2 rounded-[28px]">
          <span className="text-[13px]">Overtime active</span>
          <div className="font-heading text-[52px] font-medium leading-none">{activeOvertime.length}</div>
          <span className="text-xs text-muted">
            {activeOvertime.map((o) => `${lab.byId.get(o.person_id)?.name.split(" ")[0]} · ends ${fmtDate(o.ends)}`).join(", ") || "None this week"}
          </span>
        </Card>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div className="flex flex-col gap-4">
          <DigestCard key={saved?.text ?? digest.summary} initialText={saved?.text ?? digest.summary} initialShared={Boolean(saved?.shared_at)} />
          <Card>
            <h2 className="mb-2 font-heading text-lg font-bold">Common support requests</h2>
            {digest.support.length === 0 && <p className="text-sm text-muted">Nothing requested this week.</p>}
            {digest.support.map((s) => <div key={s} className="border-t border-line py-2.5 text-sm first:border-t-0">{s}</div>)}
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2 px-1">
            <h2 className="font-heading text-xl font-bold">Needs attention</h2>
            <span className="text-sm text-muted">/{attention}</span>
          </div>
          {digest.stuck.map((s) => {
            const p = byName.get(s.person);
            return (
              <Card key={s.person} className="flex flex-col gap-2 !rounded-[22px] !p-[18px]">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={initials(s.person)} />
                  <div className="flex-1">
                    <div className="font-semibold">{s.person}</div>
                    <div className="text-xs text-muted">{p ? lab.projectsOf(p.id).join(" · ") : ""}</div>
                  </div>
                  <Chip tone="warn">Stuck?</Chip>
                </div>
                <p className="text-sm text-muted">&ldquo;{s.quote}&rdquo;</p>
              </Card>
            );
          })}
          {digest.missing.map((n) => {
            const p = byName.get(n);
            const c = p && lab.weekCheckins.find((x) => x.person_id === p.id);
            return (
              <Card key={n} className="flex flex-col gap-2 !rounded-[22px] !p-[18px]">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={initials(n)} />
                  <div className="flex-1">
                    <div className="font-semibold">{n}</div>
                    <div className="text-xs text-muted">{p ? lab.projectsOf(p.id).join(" · ") : ""}</div>
                  </div>
                  <Chip>No check-in</Chip>
                </div>
                <p className="text-sm text-muted">
                  {c?.reminders_sent ?? 0} reminder{c?.reminders_sent === 1 ? "" : "s"} sent so far. On {p ? lab.projectsOf(p.id).length : 0} project(s), so each is unreported.
                </p>
                <div><ReminderButton kind="small" label="Send reminder now" personId={p?.id} disabled={(c?.reminders_sent ?? 0) >= 2} /></div>
              </Card>
            );
          })}
          {digest.needs_tasks.map((n) => {
            const p = byName.get(n);
            const l = p ? lab.load(p.id) : null;
            return (
              <Card key={n} className="flex flex-col gap-2 !rounded-[22px] !p-[18px]">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={initials(n)} />
                  <div className="flex-1">
                    <div className="font-semibold">{n}</div>
                    <div className="text-xs text-muted">{p ? lab.projectsOf(p.id).join(" · ") : ""}</div>
                  </div>
                  <Chip tone="ok">Needs tasks</Chip>
                </div>
                {p && l && <p className="text-sm text-muted">Has room: {l.tasks} open tasks, {l.hours} of {p.weekly_hours} hours.</p>}
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col gap-4">
          <Card dark className="rounded-[28px]">
            <h2 className="mb-2.5 font-heading text-xl font-bold">Workload this week</h2>
            {lab.ras.map((p) => {
              const l = lab.load(p.id);
              const full = l.tasks >= p.max_tasks;
              return (
                <div key={p.id} className="py-1.5">
                  <div className="flex justify-between text-sm font-medium">
                    <span>{p.name.split(" ")[0]}</span>
                    <span className="text-xs font-normal text-muted">{l.tasks} task{l.tasks === 1 ? "" : "s"} · {l.hours}/{p.weekly_hours}h</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
                    <div className={`h-full rounded-full ${full ? "bg-warn" : "bg-ok"}`} style={{ width: `${Math.min(100, (l.hours / p.weekly_hours) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="mt-2 text-xs text-muted">Hours are estimates entered by RAs. Limits: 5 tasks and 10 hours per week.</p>
          </Card>
          {activeOvertime.length > 0 && (
            <Card>
              <h2 className="mb-2 font-heading text-lg font-bold">Overtime &amp; recovery</h2>
              {activeOvertime.map((o) => (
                <div key={o.id}>
                  <Chip tone="warn">{lab.byId.get(o.person_id)?.name.split(" ")[0]} · overtime until {fmtDate(o.ends)}</Chip>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
                    {o.reason}. A recovery week follows and new assignments pause automatically. Hours are recorded for payroll; check with your department.
                  </p>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
