import { notFound } from "next/navigation";
import { HandoffAnswerForm } from "@/components/HandoffAnswerForm";
import { list } from "@/lib/db";
import { buildContext, type HQuestion } from "@/lib/handoff";
import { loadLab } from "@/lib/lab";

export const dynamic = "force-dynamic";

export default async function HandoffAnswers({ params }: PageProps<"/handoff/[token]">) {
  const { token } = await params;
  const h = (await list("handoffs")).find((x) => x.token === token);
  if (!h) notFound();
  const lab = await loadLab();
  const ctx = buildContext(lab, h.person_id);
  const questions = ((h.questions as HQuestion[] | null) ?? []).filter((q) => q.include);
  const remembered = [...ctx.tasks.filter((t) => t.status === "done").map((t) => `${t.title} (${t.project})`), ...ctx.tasks.filter((t) => t.status === "open").map((t) => `${t.title} (${t.project}), still open`)];

  return (
    <div className="mx-auto flex min-h-screen max-w-[1100px] flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5 px-2 py-2">
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-crimson font-heading text-base font-bold text-white">H</span>
        <span className="font-heading text-xl font-bold">Handover</span>
      </div>
      <div className="px-2">
        <h1 className="font-heading text-[30px] font-bold">Thank you, {ctx.first}</h1>
        <p className="text-sm text-muted">Dr. Rivera asked a few questions so the next person can pick up your work. Save a draft any time.</p>
      </div>
      <HandoffAnswerForm
        token={token}
        first={ctx.first}
        thanks={h.thanks ?? ""}
        questions={questions}
        initial={(h.answers as Record<string, string> | null) ?? {}}
        remembered={remembered}
        submittedAlready={h.status === "answered" || h.status === "saved"}
      />
    </div>
  );
}
