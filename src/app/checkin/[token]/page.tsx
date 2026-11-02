import { notFound } from "next/navigation";
import { CheckinForm } from "@/components/CheckinForm";
import { Card, Chip } from "@/components/ui";
import type { Parsed } from "@/lib/checkin";
import { loadLab } from "@/lib/lab";

export const dynamic = "force-dynamic";

export default async function CheckinPage({ params }: PageProps<"/checkin/[token]">) {
  const { token } = await params;
  const lab = await loadLab();
  const checkin = lab.checkins.find((c) => c.token === token);
  if (!checkin) notFound();
  const person = lab.byId.get(checkin.person_id)!;
  const first = person.name.split(" ")[0];
  const projects = lab.members
    .filter((m) => m.person_id === person.id)
    .map((m) => lab.projects.find((p) => p.id === m.project_id)!)
    .map((p) => ({ id: p.id, name: p.name, kind: p.kind }));
  const planned = lab.tasks.filter((t) => t.assignee === person.id && t.status === "open").slice(0, 3).map((t) => t.title);
  const parsed = checkin.parsed as Parsed | null;

  return (
    <div className="mx-auto flex min-h-screen max-w-[1100px] flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5 px-2 py-2">
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-crimson font-heading text-base font-bold text-white">H</span>
        <span className="font-heading text-xl font-bold">Handover</span>
      </div>

      {checkin.submitted_at ? (
        <>
          <div className="px-2">
            <h1 className="font-heading text-[30px] font-bold">Thank you, {first}</h1>
            <p className="text-sm text-muted">Check-in received. Here is what we understood.</p>
          </div>
          {(parsed?.projects.length ? parsed.projects : []).map((p) => (
            <Card key={p.project} className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <h2 className="font-heading text-xl font-bold">{p.project}</h2>
                {p.blockers.length > 0 && <Chip tone="warn">{p.blockers.length} blocker{p.blockers.length > 1 ? "s" : ""} shared</Chip>}
                {p.needs_tasks && <Chip tone="ok">Needs tasks</Chip>}
              </div>
              {([["Done", p.done], ["Challenges", p.blockers.map((b) => `“${b.quote}”`)], ["Next", p.next], ["Support that would help", p.support]] as const).map(
                ([label, items]) =>
                  items.length > 0 && (
                    <div key={label}>
                      <div className="text-xs font-semibold text-muted">{label}</div>
                      <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed">{items.map((i) => <li key={i}>{i}</li>)}</ul>
                    </div>
                  ),
              )}
            </Card>
          ))}
          {!parsed?.projects.length && <Card><p className="text-sm text-muted">{checkin.raw?.text}</p></Card>}
          <p className="px-2 text-[13px] text-muted">Your professor sees what you shared, and so do you. Nothing is sent to anyone else.</p>
        </>
      ) : (
        <>
          <div className="px-2">
            <h1 className="font-heading text-[30px] font-bold">Hi {first}, your weekly check-in</h1>
            <p className="text-sm text-muted">About 2 minutes. Write like you would tell a colleague.</p>
          </div>
          <CheckinForm token={token} name={first} projects={projects} planned={planned} />
        </>
      )}
    </div>
  );
}
