import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Card, Chip, PageHeader } from "@/components/ui";
import { fmtDate, initials, loadLab } from "@/lib/lab";

export const dynamic = "force-dynamic";

export default async function Journey({ params, searchParams }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const lab = await loadLab();
  const project = lab.projects.find((p) => p.id === id);
  if (!project) notFound();

  const sp = await searchParams;
  const selected = Math.min(7, Math.max(1, Number(sp.phase) || project.current_phase));
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
    return { n, name, status, progress, owners, blocked: blockers.some((b) => b.phase === n) };
  });
  const cur = phases[selected - 1];
  const curTasks = tasks.filter((t) => t.phase === selected);
  const curBlockers = blockers.filter((b) => b.phase === selected);

  const events = [
    ...blockers.map((b) => ({ at: b.opened_at, text: `${lab.byId.get(b.person_id ?? "")?.name.split(" ")[0]}: ${b.quote}`, tag: "blocker" })),
    ...lab.weekCheckins
      .filter((c) => c.submitted_at && members.some((m) => m.id === c.person_id) && !blockers.some((b) => b.person_id === c.person_id))
      .map((c) => ({ at: c.submitted_at!, text: `${lab.byId.get(c.person_id)?.name.split(" ")[0]}: ${(c.raw?.text ?? "").slice(0, 110)}`, tag: "" })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4);

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
          <span className="text-[13px] text-muted">Updates from weekly check-ins and completed tasks</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-7">
          {phases.map((p) => (
            <Link
              key={p.n}
              href={`/projects/${id}?phase=${p.n}`}
              className={`relative flex min-h-[170px] flex-col gap-2 rounded-[18px] p-3.5 ${tone[p.status]} ${p.n === selected ? "ring-2 ring-ink ring-offset-2" : ""}`}
            >
              <span className="font-heading text-xs font-medium opacity-70">0{p.n}</span>
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
              <span className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] ${t.status === "done" ? "bg-crimson text-white" : "border-[1.5px] border-line"}`}>
                {t.status === "done" && <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
              </span>
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
    </>
  );
}
