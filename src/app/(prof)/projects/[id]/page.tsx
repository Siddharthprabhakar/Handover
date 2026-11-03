import { requireProfessor } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectPeople } from "@/components/ProjectPeople";
import { ProjectSummary } from "@/components/ProjectSummary";
import { StudySetup } from "@/components/StudySetup";
import { EvidenceCard } from "@/components/EvidenceCard";
import { DeleteProject } from "@/components/DeleteProject";
import { PhaseEditor } from "@/components/PhaseEditor";
import { PhaseControl } from "@/components/PhaseControl";
import { TaskToggle } from "@/components/TaskToggle";
import { ActionBar, Avatar, Card, Chip, PageHeader } from "@/components/ui";
import { list } from "@/lib/db";
import { fmtDate, initials, loadLab } from "@/lib/lab";

export const dynamic = "force-dynamic";

export default async function Journey({ params, searchParams }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const session = await requireProfessor();
  const lab = await loadLab(session.labId);
  const project = lab.projects.find((p) => p.id === id);
  if (!project) notFound();

  const sp = await searchParams;
  const selected = Math.min(project.phase_template.length, Math.max(1, Number(sp.phase) || project.current_phase));
  const interviews = (await list("files", { col: "lab_id", eq: session.labId })).filter((f) => f.project_id === id && f.kind === "interview");
  const tasks = lab.tasks.filter((t) => t.project_id === id);
  const members = lab.members.filter((m) => m.project_id === id).map((m) => lab.byId.get(m.person_id)!);
  const blockers = lab.blockers.filter((b) => b.project_id === id && !b.resolved_at);

  const phases = project.phase_template.map((name, i) => {
    const n = i + 1;
    const status: "done" | "prog" | "todo" = n < project.current_phase ? "done" : n === project.current_phase ? "prog" : "todo";
    const ts = tasks.filter((t) => t.phase === n);
    const done = ts.filter((t) => t.status === "done").length;
    const progress = status === "done" ? 1 : ts.length ? done / ts.length : 0;
    const owners = [...new Set(ts.map((t) => t.assignee).filter(Boolean))].slice(0, 3).map((a) => lab.byId.get(a!)!);
    return { n, name, status, progress, owners, due: project.phase_due?.[i] ?? null, blocked: blockers.some((b) => b.phase === n) };
  });
  const cur = phases[selected - 1];
  const curTasks = tasks.filter((t) => t.phase === selected);
  const curBlockers = blockers.filter((b) => b.phase === selected);

  const events = [
    ...blockers.map((b) => ({ at: b.opened_at, text: `${lab.byId.get(b.person_id ?? "")?.name.split(" ")[0]}: ${b.quote}`, tag: "blocker" })),
    ...lab.weekCheckins
      .filter((c) => c.submitted_at && members.some((m) => m.id === c.person_id) && !blockers.some((b) => b.person_id === c.person_id)
        && (c.parsed as { projects: { project: string }[] } | null)?.projects.some((x) => x.project === project.name))
      .map((c) => ({ at: c.submitted_at!, text: `${lab.byId.get(c.person_id)?.name.split(" ")[0]}: ${(c.raw?.text ?? "").slice(0, 110)}`, tag: "" })),
    ...(project.phase_log ?? []).map((l) => ({ at: l.at, text: `Moved to ${project.phase_template[l.to - 1]} by ${l.by}`, tag: "" })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);

  const labels = (rows: typeof interviews) => new Set(rows.map((f) => f.participant_label?.trim().toLowerCase()).filter(Boolean)).size;
  // the first phase with participants in it (Recruit, or Data for a thesis): an open IRB is flagged before moving into it
  const gatePhase = project.phase_template.findIndex((n) => /^(recruit|data)/i.test(n)) + 1;
  const irbCleared = project.irb_status === "approved" || project.irb_status === "exempt";
  const gate = gatePhase > 0 && !irbCleared ? { phase: gatePhase, text: project.irb_status === "pending" ? "The IRB decision is still pending." : "No IRB approval is recorded for this study." } : null;

  // moving on is a person's call; the task list only suggests it
  const nowName = project.phase_template[project.current_phase - 1];
  const phaseTasks = tasks.filter((t) => t.phase === project.current_phase);
  const openTasks = phaseTasks.filter((t) => t.status !== "done").length;
  const openBlockers = blockers.filter((b) => b.phase === project.current_phase).length;
  const ready = phaseTasks.length > 0 && openTasks === 0 && project.current_phase < project.phase_template.length;
  const warning = [openTasks ? `${openTasks} task${openTasks > 1 ? "s" : ""} in ${nowName} ${openTasks > 1 ? "are" : "is"} still open.` : "", openBlockers ? `${openBlockers} blocker${openBlockers > 1 ? "s are" : " is"} still open.` : ""].filter(Boolean).join(" ");

  const tone = { done: "bg-dark text-white", prog: "bg-crimson text-white", todo: "bg-bg text-ink" } as const;
  const label = { done: "Done", prog: "In progress", todo: "Not started" } as const;

  return (
    <>
      <PageHeader
        title={project.name}
        sub={`${project.kind === "lab" ? "Lab project" : "Master's thesis"} · ${project.phase_template[project.current_phase - 1]} phase · ${members.map((m) => m.name.split(" ")[0]).join(", ")}`}
        back={{ href: "/projects", label: "All projects" }}
      />

      <Card className="flex flex-col gap-3.5">
        <div className="flex items-center gap-2.5">
          <h2 className="font-heading text-xl font-bold">Journey</h2>
          <Chip tone={project.kind === "lab" ? "crimson" : "ok"}>{project.kind === "lab" ? "Lab" : "Thesis"}</Chip>
          <span className="flex-1" />
          <span className="hidden text-[13px] text-muted sm:inline">Updates from weekly check-ins and completed tasks</span>
          <PhaseEditor projectId={id} current={project.current_phase} phases={project.phase_template.map((name, i) => ({ name, due: project.phase_due?.[i] ?? "" }))} taskCounts={project.phase_template.map((_, i) => tasks.filter((t) => t.phase === i + 1).length)} />
        </div>
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
          {phases.map((p) => (
            <Link
              key={p.n}
              href={`/projects/${id}?phase=${p.n}`}
              className={`relative flex min-h-[170px] flex-col gap-2 rounded-[18px] p-3.5 ${tone[p.status]} ${p.n === selected ? "ring-2 ring-ink ring-offset-2" : ""}`}
            >
              <span className="font-heading text-xs font-medium opacity-70">{String(p.n).padStart(2, "0")}{p.due && ` · due ${fmtDate(p.due)}`}</span>
              <span className="font-heading text-[17px] font-bold">{p.name}</span>
              <span className="text-xs opacity-75">{label[p.status]}</span>
              <span className={`h-1.5 overflow-hidden rounded-full ${p.status === "todo" ? "bg-line" : "bg-white/25"}`}>
                <i className="block h-full rounded-full bg-white" style={{ width: `${p.progress * 100}%`, background: p.status === "todo" ? "var(--crimson)" : undefined }} />
              </span>
              <span className="flex min-h-[22px] gap-1">
                {p.owners.map((o) => (
                  <span key={o.id} className="grid h-[22px] w-[22px] place-items-center rounded-full border border-line bg-surface text-[9px] font-semibold text-ink">{initials(o.name)}</span>
                ))}
              </span>
              {p.blocked && <span className="self-start rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-semibold text-warn">1 blocker</span>}
            </Link>
          ))}
        </div>
      </Card>

      {ready && (
        <Card className="!bg-crimson-soft">
          <b>All {phaseTasks.length} tasks in {nowName} are done.</b>
          <span className="block text-sm text-muted">{openBlockers ? `${openBlockers} blocker${openBlockers > 1 ? "s are" : " is"} still open. ` : ""}Ready to move on to {project.phase_template[project.current_phase]}? Use the button at the bottom.</span>
        </Card>
      )}

      <ProjectSummary projectId={id} />

      <EvidenceCard projectId={id} questions={project.research_questions ?? []} synthesis={project.synthesis ?? null} ready={interviews.filter((x) => x.status === "ready" && x.transcript_text).length} />

      {project.notes && (project.notes.resources.length > 0 || project.notes.communication.length > 0) && (
        <Card className="grid gap-5 sm:grid-cols-2">
          {([["What the partner provides", project.notes.resources], ["How the team communicates", project.notes.communication]] as const).map(([title, items]) => items.length > 0 && (
            <div key={title}>
              <h2 className="mb-2 font-heading text-lg font-bold">{title}</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">{items.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          ))}
        </Card>
      )}

      <StudySetup projectId={id} irbStatus={project.irb_status ?? null} irbRef={project.irb_ref ?? null} irbDate={project.irb_date ?? null} target={project.participant_target ?? null} questions={project.research_questions ?? []} recruited={labels(interviews)} transcribed={labels(interviews.filter((f) => f.status === "ready"))} />

      <ProjectPeople projectId={id} members={members.map((m) => ({ id: m.id, name: m.name }))} others={lab.ras.filter((r) => !members.some((m) => m.id === r.id)).map((r) => ({ id: r.id, name: r.name }))} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2.5">
            <h2 className="font-heading text-[22px] font-bold">{cur.name}</h2>
            <Chip tone={cur.status === "done" ? "ok" : cur.status === "prog" ? "crimson" : "light"}>{label[cur.status]}</Chip>
          </div>
          {curBlockers.map((b) => (
            <div key={b.id} className="my-3 rounded-2xl bg-warn-soft p-3.5">
              <b className="mb-1 block text-xs text-warn">Blocker · reported by {lab.byId.get(b.person_id ?? "")?.name.split(" ")[0]}, {fmtDate(b.opened_at)}</b>
              <span className="text-sm leading-relaxed">&ldquo;{b.quote}&rdquo;</span>
            </div>
          ))}
          {curTasks.length === 0 && <p className="mt-3 text-sm text-muted">No tasks in this phase yet.</p>}
          {curTasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
              <TaskToggle taskId={t.id} done={t.status === "done"} />
              <span className={`flex-1 font-medium ${t.status === "done" ? "text-muted" : ""}`}>{t.title}</span>
              <Chip tone={t.status === "done" ? "ok" : "light"}>{t.status === "done" ? "done" : `${t.est_hours} h`}</Chip>
              {t.assignee && <Avatar initials={initials(lab.byId.get(t.assignee)!.name)} size={26} />}
            </div>
          ))}
        </Card>

        <Card>
          <h2 className="mb-2 font-heading text-xl font-bold">What happened</h2>
          {events.length === 0 && <p className="text-sm text-muted">Nothing yet this week.</p>}
          {events.map((e, i) => (
            <div key={i} className="flex gap-3 py-2">
              <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-crimson" />
              <div>
                <div className="text-xs font-semibold text-muted">{fmtDate(e.at)}</div>
                <div className="text-sm leading-relaxed">{e.text} {e.tag && <Chip tone="warn">{e.tag}</Chip>}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <ActionBar hint={`Now in ${nowName}. You decide when the project moves on.`}>
        <DeleteProject projectId={id} name={project.name} demo={session.demo} />
        <PhaseControl projectId={id} current={project.current_phase} names={project.phase_template} warning={warning} gate={gate} />
      </ActionBar>
    </>
  );
}
