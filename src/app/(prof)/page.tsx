import Link from "next/link";
import { AssignTask } from "@/components/AssignTask";
import { requireProfessor } from "@/lib/session";
import { Avatar, Btn, Card, Chip, PageHeader, Segments } from "@/components/ui";
import { LoadDemo } from "@/components/LoadDemo";
import { WorkloadCard } from "@/components/WorkloadCard";
import { MeetingsCard } from "@/components/MeetingsCard";
import { list } from "@/lib/db";
import { TODAY } from "@/lib/demo";
import { appUrl } from "@/lib/email";
import { loadsOf } from "@/lib/loads";
import { addDays } from "@/lib/limits";
import { DAYS, occurrencesInWeek } from "@/lib/meetings";
import { ReminderButton } from "@/components/ReminderButton";
import { Suspense } from "react";
import { DigestSkeleton, MuseDigestCard } from "@/components/DigestSlot";
import { ruleDigest } from "@/lib/digest";
import { WEEK, fmtDate, initials, loadLab } from "@/lib/lab";

export const dynamic = "force-dynamic";

const IRB: Record<string, [string, "ok" | "warn"]> = { approved: ["IRB approved", "ok"], exempt: ["IRB exempt", "ok"], pending: ["IRB pending", "warn"] };

export default async function LabOverview() {
  const session = await requireProfessor();
  const lab = await loadLab(session.labId);
  if (lab.ras.length === 0) {
    return (
      <>
        <PageHeader title={`Welcome, ${session.name}`} sub="Set up your lab in three steps." />
        <Card className="flex flex-col gap-4 !p-6">
          {[["1", "Invite your people", "Add research assistants and students by email. They get a personal check-in link, with no account to create.", "/people", "Invite people"], ["2", "Add a project", "Describe a goal and Muse drafts the phases and tasks, or load two sample projects to try it out.", "/projects", "Open projects"], ["3", "Send the first check-in", "Each week everyone answers four short questions. Muse turns the answers into a digest for you.", "/checkins", "Open check-ins"]].map(([n, t, d, href, label]) => (
            <div key={n} className="flex flex-wrap items-center gap-3.5 border-t border-line pt-4 first:border-t-0 first:pt-0">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-crimson-soft font-semibold text-crimson">{n}</span>
              <div className="min-w-[200px] flex-1"><b className="block">{t}</b><span className="text-sm text-muted">{d}</span></div>
              <Btn href={href}>{label}</Btn>
            </div>
          ))}
        </Card>
        <Card className="flex flex-col gap-3">
          <b>Just looking around?</b>
          <span className="text-sm text-muted">Fill this lab with made-up people, projects, check-ins and an interview transcript. Nobody is emailed: the addresses cannot receive mail.</span>
          <LoadDemo />
        </Card>
      </>
    );
  }
  const digest = ruleDigest(lab);
  const byName = new Map(lab.people.map((p) => [p.name, p]));
  const submitted = lab.weekCheckins.filter((c) => c.submitted_at).length;
  // meetings need the v8 database update; until it is run the card just shows empty
  const [meetings, labRows] = await Promise.all([list("meetings", { col: "lab_id", eq: session.labId }).catch(() => []), list("labs", { col: "id", eq: session.labId }).catch(() => [])]);
  const token = labRows[0]?.calendar_token;
  const projectName = (id: string | null) => lab.projects.find((x) => x.id === id)?.name ?? null;
  const activeOvertime = lab.overtime.filter((o) => o.starts <= WEEK && o.ends >= WEEK);
  const dayOf = (iso: string) => DAYS[(new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7];
  const dueThisWeek = lab.tasks.filter((t) => t.status === "open" && t.due && t.due <= addDays(WEEK, 6)).sort((a, b) => a.due!.localeCompare(b.due!));
  const overdue = dueThisWeek.filter((t) => t.due! < TODAY).length;
  const saved = lab.digests.find((d) => d.week === WEEK);
  const loads = loadsOf(lab);
  const assignProjects = lab.projects.map((x) => ({ id: x.id, name: x.name, phases: x.phase_template }));

  // one card per person, however many reasons they have: stuck and missing first, then people with room
  type Entry = { name: string; quotes: string[]; missing: boolean; needsTasks: boolean };
  const entries = new Map<string, Entry>();
  const entry = (name: string) => entries.get(name) ?? entries.set(name, { name, quotes: [], missing: false, needsTasks: false }).get(name)!;
  for (const s of digest.stuck) entry(s.person).quotes.push(s.quote);
  for (const n of digest.missing) entry(n).missing = true;
  for (const n of digest.needs_tasks) entry(n).needsTasks = true;
  const attention = [...entries.values()].sort((a, b) => Number(b.quotes.length > 0 || b.missing) - Number(a.quotes.length > 0 || a.missing));

  return (
    <div className="flex flex-col gap-4 xl:min-h-[calc(100vh-2rem)]">
      <PageHeader title={`Good morning, ${session.name}`} sub={`Week of ${fmtDate(WEEK)} · ${submitted} of ${lab.ras.length} check-ins in`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1.35fr_1fr]">
        <Card className="flex flex-col gap-2">
          <span className="text-[13px] text-muted">This week</span>
          <div className="font-heading text-[46px] font-medium leading-none">
            {submitted}
            <span className="ml-1.5 font-sans text-sm text-muted">of {lab.ras.length} check-ins</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-crimson" style={{ width: `${(submitted / lab.ras.length) * 100}%` }} />
          </div>
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {activeOvertime.length === 0 ? <Chip tone="light">No one on overtime</Chip> : activeOvertime.map((o) => <Chip key={o.id} tone="warn">{lab.byId.get(o.person_id)?.name.split(" ")[0]} · overtime until {fmtDate(o.ends)}</Chip>)}
          </div>
          {digest.missing.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><span className="text-xs text-muted">Not in yet</span>{digest.missing.map((n) => <Chip key={n} tone="crimson">{n.split(" ")[0]}</Chip>)}</div>}
          <div className="mt-2 flex flex-col gap-1.5 border-t border-line pt-3">
            <div className="flex items-center gap-2"><span className="text-[13px] text-muted">Tasks due this week</span><span className="flex-1" />{overdue > 0 ? <Chip tone="crimson">{overdue} overdue</Chip> : <span className="text-xs text-muted">{dueThisWeek.length}</span>}</div>
            {dueThisWeek.length === 0 && <p className="text-[13px] text-muted">Nothing due. A calm week.</p>}
            {dueThisWeek.slice(0, 2).map((t) => (
              <div key={t.id} className="flex items-baseline gap-2 text-[13px] leading-snug">
                <b className="w-9 shrink-0 font-semibold">{dayOf(t.due!)}</b>
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <span className="shrink-0 text-xs text-muted">{lab.byId.get(t.assignee ?? "")?.name.split(" ")[0] ?? "Unassigned"}</span>
              </div>
            ))}
            {dueThisWeek.length > 2 && <Link href="/workload" className="text-xs text-muted">+{dueThisWeek.length - 2} more</Link>}
          </div>
        </Card>

        <Card className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted">Studies at a glance</span>
            <span className="flex-1" />
            <Link href="/projects" className="text-xs font-semibold text-crimson">All projects</Link>
          </div>
          {lab.projects.length === 0 && <p className="text-sm text-muted">No projects yet. Add one from Projects.</p>}
          {lab.projects.slice(0, 3).map((pr) => {
            const blockers = lab.blockers.filter((b) => b.project_id === pr.id && !b.resolved_at).length;
            const due = pr.phase_due?.[pr.current_phase - 1];
            return (
              <Link key={pr.id} href={`/projects/${pr.id}`} className="flex flex-col gap-1.5 rounded-2xl bg-bg p-3">
                <div className="flex items-center gap-2">
                  <b className="min-w-0 flex-1 truncate text-sm font-semibold">{pr.name}</b>
                  {pr.irb_status && <Chip tone={IRB[pr.irb_status][1]}>{IRB[pr.irb_status][0]}</Chip>}
                  {blockers > 0 && <Chip tone="warn">{blockers} blocker{blockers > 1 ? "s" : ""}</Chip>}
                </div>
                <Segments current={pr.current_phase} total={pr.phase_template.length} />
                <span className="text-xs text-muted">{pr.phase_template[pr.current_phase - 1]} · phase {pr.current_phase} of {pr.phase_template.length}{due ? ` · due ${fmtDate(due)}` : ""}</span>
              </Link>
            );
          })}
          {lab.projects.length > 3 && <span className="text-xs text-muted">+{lab.projects.length - 3} more</span>}
        </Card>

        <MeetingsCard weekStart={WEEK} today={TODAY} items={occurrencesInWeek(meetings, WEEK, projectName)} meetings={meetings} projects={lab.projects.map((x) => ({ id: x.id, name: x.name }))} feedUrl={token ? `${appUrl()}/api/calendar/${token}.ics` : null} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:flex-1 xl:grid-cols-3">
        <div className="flex flex-col gap-4">
          <Suspense fallback={<DigestSkeleton />}><MuseDigestCard lab={lab} saved={saved} /></Suspense>
          <Card className="xl:flex-1">
            <h2 className="mb-2 font-heading text-lg font-bold">Common support requests</h2>
            {digest.support.length === 0 && <p className="text-sm text-muted">Nothing requested this week.</p>}
            {digest.support.map((s) => <div key={s} className="border-t border-line py-2.5 text-sm first:border-t-0">{s}</div>)}
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-2 px-1">
            <h2 className="font-heading text-xl font-bold">Needs attention</h2>
            <span className="rounded-full bg-crimson-soft px-2.5 py-0.5 text-xs font-semibold text-crimson">{attention.length}</span>
            <span className="text-xs text-muted">Muse read the check-ins</span>
          </div>
          <div className="flex flex-col gap-3">
            {attention.slice(0, 3).map((e) => {
              const p = byName.get(e.name);
              const c = p && lab.weekCheckins.find((x) => x.person_id === p.id);
              const l = p ? lab.load(p.id) : null;
              return (
                <Card key={e.name} className="flex flex-col gap-2.5 !rounded-[22px] !p-[18px]">
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={initials(e.name)} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{e.name}</div>
                      <div className="truncate text-xs text-muted">{p ? lab.projectsOf(p.id).join(" · ") : ""}</div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      {e.quotes.length > 0 && <Chip tone="warn">Stuck?</Chip>}
                      {e.missing && <Chip>No check-in</Chip>}
                      {e.needsTasks && <Chip tone="ok">Needs tasks</Chip>}
                    </div>
                  </div>
                  {e.quotes.map((q) => <p key={q} className="border-l-2 border-warn pl-3 text-sm text-muted">&ldquo;{q}&rdquo;</p>)}
                  {e.missing && <p className="text-sm text-muted">{c?.reminders_sent ?? 0} reminder{c?.reminders_sent === 1 ? "" : "s"} sent so far, so nothing is reported on {p ? lab.projectsOf(p.id).length : 0} project(s).</p>}
                  {e.needsTasks && p && l && <p className="text-sm text-muted">Has room: {l.tasks} open tasks, {l.hours} of {p.weekly_hours} hours.</p>}
                  <div className="flex flex-wrap gap-2">
                    {e.quotes.length > 0 && <Link href="/checkins" className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">See check-in</Link>}
                    {e.missing && <ReminderButton kind="small" label="Send reminder" personId={p?.id} disabled={(c?.reminders_sent ?? 0) >= 2} />}
                    {e.needsTasks && p && <AssignTask personId={p.id} loads={loads} projects={assignProjects} />}
                  </div>
                </Card>
              );
            })}
            {attention.length > 3 && <Link href="/checkins" className="px-1 text-sm font-semibold text-crimson">Show all {attention.length} people</Link>}
            {attention.length === 0 && <Card className="!rounded-[22px] !p-[18px] text-sm text-muted">Nobody needs attention this week.</Card>}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <WorkloadCard className="xl:flex-1" rows={lab.ras.map((r) => ({ id: r.id, name: r.name, ...lab.load(r.id), maxTasks: r.max_tasks, weeklyHours: r.weekly_hours }))} overtime={activeOvertime.map((o) => ({ id: o.id, name: lab.byId.get(o.person_id)?.name ?? "Someone", until: fmtDate(o.ends), reason: o.reason }))} />
        </div>
      </div>
    </div>
  );
}
