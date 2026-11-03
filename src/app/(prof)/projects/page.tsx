import { requireProfessor } from "@/lib/session";
import Link from "next/link";
import { Avatar, Card, Chip, Icon, PageHeader, Segments } from "@/components/ui";
import { initials, loadLab } from "@/lib/lab";

export const dynamic = "force-dynamic";

export default async function Projects({ searchParams }: PageProps<"/projects">) {
  const kind = (await searchParams).kind;
  const session = await requireProfessor();
  const lab = await loadLab(session.labId);
  const all = lab.projects;
  const shown = kind === "lab" || kind === "thesis" ? all.filter((p) => p.kind === kind) : all;
  const count = (k: string) => all.filter((p) => p.kind === k).length;
  const openBlockers = (id: string) => lab.blockers.filter((b) => b.project_id === id && !b.resolved_at).length;

  const filters = [
    { href: "/projects", label: `All ${all.length}`, on: !kind },
    { href: "/projects?kind=lab", label: `Lab ${count("lab")}`, on: kind === "lab" },
    { href: "/projects?kind=thesis", label: `Thesis ${count("thesis")}`, on: kind === "thesis" },
  ];

  return (
    <>
      <PageHeader title="Projects" sub={`${all.length} projects · ${count("lab")} lab, ${count("thesis")} thesis`} />
      <div className="flex gap-2 px-2">
        {filters.map((f) => (
          <Link key={f.href} href={f.href}>
            <Chip tone={f.on ? "dark" : "light"}>{f.label}</Chip>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {shown.map((p) => {
          const people = lab.members.filter((m) => m.project_id === p.id).map((m) => lab.byId.get(m.person_id)!);
          const blockers = openBlockers(p.id);
          return (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="flex h-full min-h-[270px] flex-col gap-3 !rounded-[26px] !p-[22px]">
                <div className="flex items-center gap-2">
                  <Chip tone={p.kind === "lab" ? "crimson" : "ok"}>{p.kind === "lab" ? "Lab" : "Thesis"}</Chip>
                  <span className="flex-1" />
                  <Chip tone={blockers ? "warn" : "ok"}>{blockers ? `${blockers} blocker${blockers > 1 ? "s" : ""}` : "On track"}</Chip>
                </div>
                <h2 className="font-heading text-[22px] font-bold">{p.name}</h2>
                <p className="text-sm leading-relaxed text-muted">{p.goal}</p>
                <Segments current={p.current_phase} />
                <div className="text-[13px] font-medium">Phase {p.current_phase} of 7 · {p.phase_template[p.current_phase - 1]}</div>
                <div className="mt-auto flex items-center gap-2">
                  {people.slice(0, 4).map((x) => <Avatar key={x.id} initials={initials(x.name)} size={28} />)}
                  <span className="text-xs text-muted">{people.length === 1 ? "1 student · you advise" : `${people.length} people`}</span>
                  <span className="flex-1" />
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-dark text-white"><Icon name="arrow" className="h-4 w-4" /></span>
                </div>
              </Card>
            </Link>
          );
        })}
        <Link href="/projects/new" className="flex min-h-[270px] flex-col items-center justify-center gap-2.5 rounded-[26px] border-2 border-dashed border-line p-[22px] text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-crimson text-white"><Icon name="plus" className="h-[22px] w-[22px]" /></span>
          <span className="font-heading text-xl font-bold">Add a project</span>
          <span className="text-sm text-muted">Describe the goal and Muse drafts the phases, tasks and who has room to take them.</span>
        </Link>
      </div>

    </>
  );
}
