import { requireProfessor } from "@/lib/session";
import { AssignTask } from "@/components/AssignTask";
import { PersonTasks } from "@/components/PersonTasks";
import { Avatar, Card, Chip, PageHeader, type Tone } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { initials, loadLab } from "@/lib/lab";
import { windowState } from "@/lib/limits";
import { loadsOf } from "@/lib/loads";

export const dynamic = "force-dynamic";

export default async function Workload() {
  const session = await requireProfessor();
  const lab = await loadLab(session.labId);
  const loads = loadsOf(lab);
  const people = lab.ras.map((r) => ({ id: r.id, name: r.name }));
  const projects = lab.projects.map((p) => ({ id: p.id, name: p.name, phases: p.phase_template }));

  return (
    <>
      <PageHeader title="Workload" sub="Capacity, limits and overtime. Limits protect RAs; the exception path keeps you in control." />
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-x-auto !p-6">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[200px_160px_90px_1fr_220px] gap-3 py-2 text-xs font-semibold text-muted">
            <span>Person</span><span>Open tasks</span><span>Hours</span><span>Status</span><span />
          </div>
          {loads.map((l) => {
            const st = windowState(l.ot);
            const full = l.tasks >= l.maxTasks || l.hours >= l.weeklyHours;
            let chip: { label: string; tone: Tone } = { label: "Available", tone: "ok" };
            if (st.kind === "overtime") chip = { label: `Overtime until ${fmtDate(st.until!)}`, tone: "crimson" };
            else if (st.kind === "recovery") chip = { label: `Recovery until ${fmtDate(st.until!)}`, tone: "warn" };
            else if (full) chip = { label: "At limit", tone: "warn" };
            return (
              <div key={l.id} className="grid grid-cols-[200px_160px_90px_1fr_220px] items-center gap-3 border-t border-line py-3.5">
                <span className="flex items-center gap-2.5"><Avatar initials={initials(l.name)} /><b className="text-sm font-semibold">{l.name}</b></span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-[70px] overflow-hidden rounded-full bg-bg"><i className={`block h-full rounded-full ${l.tasks >= l.maxTasks ? "bg-warn" : "bg-ok"}`} style={{ width: `${Math.min(100, (l.tasks / l.maxTasks) * 100)}%` }} /></span>
                  <span className="text-xs text-muted">{l.tasks} / {l.maxTasks}</span>
                </span>
                <span className="text-[13px]">{l.hours} / {l.weeklyHours} h</span>
                <span><Chip tone={chip.tone}>{chip.label}</Chip></span>
                <span className="flex justify-end gap-2">
                  <PersonTasks person={{ id: l.id, name: l.name }} people={people} tasks={lab.tasks.filter((t) => t.assignee === l.id && t.status === "open").map((t) => { const pr = lab.projects.find((x) => x.id === t.project_id)!; return { id: t.id, title: t.title, project: pr.name, phase: pr.phase_template[t.phase - 1] ?? "", hours: Number(t.est_hours) }; })} />
                  <AssignTask personId={l.id} loads={loads} projects={projects} />
                </span>
              </div>
            );
          })}
        </div>
      </Card>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-2.5">
            <h2 className="font-heading text-[19px] font-bold">Default limits</h2>
            {[["Max open tasks", "5"], ["Weekly hours", "10"]].map(([a, b]) => (
              <div key={a} className="flex items-center justify-between"><span className="text-sm font-medium">{a}</span><span className="rounded-xl bg-bg px-4 py-1.5 font-heading text-lg font-bold">{b}</span></div>
            ))}
            <p className="text-xs leading-snug text-muted">Per RA. Hard maximum of 20 hours a week; check your university&apos;s student-work rules.</p>
          </Card>

          <Card dark className="flex flex-col gap-3 rounded-[28px]">
            <h2 className="font-heading text-[19px] font-bold">How overtime works</h2>
            {["Professor gives a reason and an end date", "Up to 14 days, visible to the RA", "A recovery week follows with no new tasks", "Hours are recorded for payroll; the tool does not decide pay"].map((t, i) => (
              <div key={t} className="flex items-start gap-3 text-sm"><span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-crimson text-xs font-semibold">{i + 1}</span><span className="leading-snug">{t}</span></div>
            ))}
          </Card>

          {lab.overtime.length > 0 && (
            <Card className="flex flex-col gap-2.5">
              <h2 className="font-heading text-[19px] font-bold">Overtime log</h2>
              {lab.overtime.map((o) => (
                <div key={o.id} className="border-t border-line pt-2.5 first:border-t-0 first:pt-0">
                  <div className="text-sm font-semibold">{lab.byId.get(o.person_id)?.name}</div>
                  <div className="text-xs text-muted">{o.reason} · {fmtDate(o.starts)} to {fmtDate(o.ends)}</div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
