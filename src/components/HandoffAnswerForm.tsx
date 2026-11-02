"use client";

import { useState } from "react";
import type { HQuestion } from "@/lib/handoff";
import { Card } from "./ui";

export function HandoffAnswerForm({ token, first, thanks, questions, initial, remembered, submittedAlready }: { token: string; first: string; thanks: string; questions: HQuestion[]; initial: Record<string, string>; remembered: string[]; submittedAlready: boolean }) {
  const [answers, setAnswers] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "draft" | "done">(submittedAlready ? "done" : "idle");
  const [error, setError] = useState("");
  const answered = questions.filter((q) => (answers[q.id] ?? "").trim()).length;

  async function save(submit: boolean) {
    setState("saving");
    setError("");
    const res = await fetch("/api/handoff", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "answers", token, answers, submit }) });
    if (!res.ok) {
      setState("idle");
      return setError((await res.json().catch(() => ({}))).error ?? "Could not save. Your answers are still here.");
    }
    setState(submit ? "done" : "draft");
  }

  if (state === "done") {
    return (
      <Card className="!p-6">
        <h2 className="font-heading text-2xl font-bold">Thank you, {first}</h2>
        <p className="mt-2 text-sm text-muted">Your answers were sent to your professor. They review the brief before anyone else sees it.</p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-3">
          {questions.map((q, i) => (
            <Card key={q.id} className="flex flex-col gap-2.5 !rounded-[22px] !p-[18px]">
              <div className="flex items-start gap-2.5">
                <span className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-xs font-semibold ${(answers[q.id] ?? "").trim() ? "bg-ok-soft text-ok" : "bg-crimson-soft text-crimson"}`}>{i + 1}</span>
                <h3 className="text-[15px] font-semibold leading-snug">{q.text}</h3>
              </div>
              <textarea rows={2} placeholder="Add your answer…" value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} className="w-full resize-none rounded-[14px] bg-bg px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-crimson/30" />
            </Card>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5 rounded-[28px] bg-crimson p-5 text-white">
            <h3 className="font-heading text-xl font-bold">A note from your professor</h3>
            <p className="text-sm leading-relaxed">{thanks}</p>
          </div>
          <Card>
            <h3 className="font-heading text-[17px] font-bold">What Muse remembers you did</h3>
            <ul className="mt-2 space-y-1.5 text-sm">{remembered.map((r) => <li key={r}>• {r}</li>)}</ul>
            <p className="mt-2 text-xs text-muted">This comes from the tasks recorded for you. Add anything missing in your answers.</p>
          </Card>
          <p className="px-1 text-xs text-muted">Only your professor sees your answers until she shares the brief.</p>
        </div>
      </div>

      <div className="sticky bottom-4 mt-4 flex items-center gap-2.5 rounded-[20px] bg-surface px-5 py-3">
        <span className="text-[13px] text-muted">{error ? <span className="text-crimson">{error}</span> : state === "draft" ? "Draft saved." : `${answered} of ${questions.length} answered. You can save a draft any time.`}</span>
        <span className="flex-1" />
        <button type="button" disabled={state === "saving"} onClick={() => save(false)} className="rounded-full border border-line px-[18px] py-2.5 text-sm font-semibold disabled:opacity-50">Save draft</button>
        <button type="button" disabled={state === "saving"} onClick={() => save(true)} className="rounded-full bg-crimson px-[18px] py-2.5 text-sm font-semibold text-white disabled:opacity-50">Submit answers</button>
      </div>
    </>
  );
}
