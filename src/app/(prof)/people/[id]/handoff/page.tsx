import Link from "next/link";
import { notFound } from "next/navigation";
import { HandoffBrief } from "@/components/HandoffBrief";
import { HandoffSetup } from "@/components/HandoffSetup";
import { Card, Chip, PageHeader } from "@/components/ui";
import type { Brief, HQuestion } from "@/lib/handoff";
import { loadLab } from "@/lib/lab";
import { list } from "@/lib/db";

export const dynamic = "force-dynamic";

const STEPS = ["Set up questions", "Student answers", "Handoff brief"];

export default async function Handoff({ params, searchParams }: PageProps<"/people/[id]/handoff">) {
  const { id } = await params;
  const lab = await loadLab();
  const person = lab.byId.get(id);
  if (!person || person.role !== "ra") notFound();
  const first = person.name.split(" ")[0];
  const h = (await list("handoffs")).find((x) => x.person_id === id) ?? null;
  const qs = ((h?.questions as HQuestion[] | null) ?? null)?.filter((q) => q.include) ?? [];
  const answers = (h?.answers as Record<string, string> | null) ?? {};
  const answered = qs.filter((q) => (answers[q.id] ?? "").trim()).length;

  const natural = !h ? 0 : h.status === "sent" ? 1 : h.status === "draft" ? 0 : 2;
  const asked = Number((await searchParams).step);
  const step = Number.isInteger(asked) && asked >= 0 && asked <= natural + (h ? 1 : 0) ? Math.min(asked, 2) : natural;
  const reachable = h ? (h.status === "answered" || h.status === "saved" ? 2 : 1) : 0;

  return (
    <>
      <PageHeader
        title={`Handoff for ${person.name}`}
        sub={step === 0 ? `Muse drafted these questions from ${first}'s tasks and decisions. Edit anything before you send.` : step === 1 ? `Waiting for ${first}'s answers.` : `Compiled by Muse from ${first}'s answers and the project history. You review before anyone else sees it.`}
        back={{ href: "/people", label: "People" }}
        right={person.leaving_on ? <Chip tone="warn">Leaving {new Date(person.leaving_on).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</Chip> : undefined}
      />
      <div className="flex flex-wrap gap-2 px-2">
        {STEPS.map((s, i) => {
          const on = i === step;
          const can = i <= reachable;
          const cls = `flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${on ? "bg-dark text-white" : "bg-surface text-muted"} ${can ? "" : "opacity-50"}`;
          const inner = (<><span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${on ? "bg-crimson text-white" : "bg-bg"}`}>{i + 1}</span>{s}</>);
          return can ? <Link key={s} href={`/people/${id}/handoff?step=${i}`} className={cls}>{inner}</Link> : <span key={s} className={cls}>{inner}</span>;
        })}
      </div>

      {step === 0 && <HandoffSetup personId={id} first={first} initial={(h?.questions as HQuestion[] | null) ?? null} initialThanks={h?.thanks ?? ""} />}

      {step === 1 && h && (
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
          <Card className="!p-6">
            <div className="flex items-center gap-2"><h2 className="font-heading text-xl font-bold">Questions sent to {first}</h2><Chip tone={answered ? "ok" : "warn"}>{answered} of {qs.length} answered so far</Chip></div>
            {qs.map((q) => (
              <div key={q.id} className="border-t border-line py-3 first:border-t-0">
                <div className="text-sm font-medium">{q.text}</div>
                <div className="mt-1 text-[13px] text-muted">{answers[q.id]?.trim() || "No answer yet"}</div>
              </div>
            ))}
          </Card>
          <Card className="flex flex-col gap-2.5">
            <h3 className="font-heading text-lg font-bold">{first}&apos;s link</h3>
            <p className="text-[13px] leading-relaxed text-muted">No login needed. In the finished app this arrives by email; for now open it to answer as {first}.</p>
            <code className="break-all rounded-xl bg-bg p-3 text-xs">/handoff/{h.token}</code>
            <Link href={`/handoff/${h.token}`} target="_blank" className="self-start rounded-full bg-crimson px-[18px] py-2.5 text-sm font-semibold text-white">Open as {first}</Link>
          </Card>
        </div>
      )}

      {step === 2 && h && (
        <HandoffBrief handoffId={h.id} first={first} thanks={h.thanks ?? ""} initial={(h.brief as Brief | null) ?? null} saved={h.status === "saved"} answered={answered} total={qs.length} />
      )}
    </>
  );
}
