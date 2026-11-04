import { requireProfessor } from "@/lib/session";
import Link from "next/link";
import { ActionBar, Avatar, Card, Chip, PageHeader, type Tone } from "@/components/ui";
import { CopyLink } from "@/components/CopyLink";
import { InvitePerson } from "@/components/InvitePerson";
import { ProgramSelect } from "@/components/ProgramSelect";
import { WEEK, fmtDate, initials, loadLab } from "@/lib/lab";

export const dynamic = "force-dynamic";

export default async function People() {
  const session = await requireProfessor();
  const lab = await loadLab(session.labId);
  const handoffs = lab.handoffs;
  const overtimeNow = new Set(lab.overtime.filter((o) => o.starts <= WEEK && o.ends >= WEEK).map((o) => o.person_id));

  return (
    <>
      <PageHeader title="People" sub={`${lab.ras.length} people in your lab · weekly check-in every Monday at 9:00 AM ET`} />
      <Card className="overflow-x-auto !p-6">
        <div className="min-w-[1000px]">
        <div className="grid grid-cols-[220px_1fr_110px_150px_270px] gap-3 py-2 text-xs font-semibold text-muted">
          <span>Person</span><span>Projects</span><span>Last check-in</span><span>Status</span><span />
        </div>
        {lab.ras.length === 0 && <p className="py-6 text-sm leading-relaxed text-muted">No one here yet. Invite your first research assistant or student. They get an email with a personal check-in link, and no account is needed.</p>}
        {lab.ras.map((p) => {
          const c = lab.weekCheckins.find((x) => x.person_id === p.id);
          const h = handoffs.find((x) => x.person_id === p.id);
          let status: { label: string; tone: Tone } = { label: "Active", tone: "ok" };
          if (h) status = h.status === "saved" ? { label: "Handoff saved", tone: "ok" } : h.status === "answered" ? { label: "Answers in", tone: "ok" } : { label: "Waiting for answers", tone: "warn" };
          else if (p.status === "leaving") status = { label: p.leaving_on ? `Leaving ${fmtDate(p.leaving_on)}` : "Leaving", tone: "warn" };
          else if (overtimeNow.has(p.id)) status = { label: "Overtime", tone: "crimson" };
          return (
            <div key={p.id} className="grid grid-cols-[220px_1fr_110px_150px_270px] items-center gap-3 border-t border-line py-3.5">
              <span className="flex items-center gap-3"><Avatar initials={initials(p.name)} /><span><b className="block text-sm font-semibold">{p.name}</b><span className="text-xs text-muted">{p.email}</span><ProgramSelect personId={p.id} value={p.program ?? null} /></span></span>
              <span className="text-[13px] leading-snug">{lab.projectsOf(p.id).join(", ")}</span>
              <span>{c?.submitted_at ? <span className="text-[13px]">{fmtDate(c.submitted_at)}</span> : <Chip tone="warn">Missing</Chip>}</span>
              <span><Chip tone={status.tone}>{status.label}</Chip></span>
              <span className="flex justify-end gap-2">
                {c && <CopyLink path={`/checkin/${c.token}`} />}
                <Link href={`/people/${p.id}/handoff`} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${h ? "bg-dark text-white" : "border border-line"}`}>{h ? "Open handoff" : "Start handoff"}</Link>
              </span>
            </div>
          );
        })}
      </div>
      </Card>
      <p className="px-2 text-[13px] leading-relaxed text-muted">Handoff is for anyone leaving the lab. Muse drafts questions from their work, you edit them, and they answer in their own time. A thank-you note goes with it.</p>
      <ActionBar hint="Invited people get an email with their personal check-in link.">
        <InvitePerson />
      </ActionBar>
    </>
  );
}
