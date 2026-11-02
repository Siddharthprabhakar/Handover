"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { initials } from "@/lib/format";
import { phaseOneCheck, type Load, type PlanData } from "@/lib/limits";
import { Avatar, Card, Chip } from "./ui";

const input = "w-full rounded-xl bg-bg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-crimson/30";
const first = (n: string) => n.split(" ")[0];

export function NewProjectForm({ ras }: { ras: Load[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<"lab" | "thesis">("lab");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selected, setSelected] = useState<string[]>(ras.filter((r) => r.tasks < r.maxTasks && r.hours < r.weeklyHours).map((r) => r.id));
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState<"" | "plan" | "create">("");
  const [error, setError] = useState("");

  const over = useMemo(() => (plan ? phaseOneCheck(plan, ras) : []), [plan, ras]);
  const people = ras.filter((r) => selected.includes(r.id));
  const total = plan ? plan.phases.reduce((s, p) => s + p.tasks.reduce((a, t) => a + (Number(t.hours) || 0), 0), 0) : 0;
  const canGenerate = name.trim() && goal.trim() && selected.length > 0 && !busy;

  async function generate() {
    setBusy("plan");
    setError("");
    setPlan(null);
    const res = await fetch("/api/projects/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, name, goal, deadline, people: selected }) });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) return setError(body.error ?? "Could not draft a plan");
    setPlan(body.plan);
    setOpen(null);
  }

  async function create() {
    if (!plan) return;
    setBusy("create");
    setError("");
    const res = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, name, goal, deadline, people: selected, plan }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy("");
      return setError(body.error ?? "Could not create the project");
    }
    router.push(`/projects/${body.id}`);
  }

  const edit = (fn: (p: PlanData) => void) => {
    if (!plan) return;
    const next = structuredClone(plan);
    fn(next);
    setPlan(next);
  };

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[460px_1fr]">
        <Card className="flex flex-col gap-3.5 !p-6">
          <div className="text-xs font-semibold text-muted">Project type</div>
          <div className="flex gap-1 rounded-xl bg-bg p-[3px]">
            {([["lab", "Lab study"], ["thesis", "Thesis"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => { setKind(k); setPlan(null); }} className={`flex-1 rounded-[10px] px-4 py-2 text-[13px] font-semibold ${kind === k ? "bg-dark text-white" : "text-muted"}`}>{l}</button>
            ))}
          </div>
          <label className="text-xs font-semibold text-muted">Project name
            <input className={`${input} mt-1.5 text-ink`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Campus Wayfinding Study" />
          </label>
          <label className="text-xs font-semibold text-muted">{kind === "lab" ? "Study goal" : "Thesis topic"}
            <textarea rows={4} className={`${input} mt-1.5 resize-none text-ink`} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Understand how first-year students find rooms on campus, using 12 interviews and a short survey, finished by the end of spring." />
          </label>
          <label className="text-xs font-semibold text-muted">Deadline
            <input className={`${input} mt-1.5 text-ink`} value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="May 2" />
          </label>
          <div className="text-xs font-semibold text-muted">Who could work on it</div>
          <div className="flex flex-wrap gap-1.5">
            {ras.map((r) => {
              const on = selected.includes(r.id);
              const full = r.tasks >= r.maxTasks || r.hours >= r.weeklyHours;
              return (
                <button key={r.id} type="button" onClick={() => setSelected(on ? selected.filter((x) => x !== r.id) : [...selected, r.id])}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${on ? "bg-dark text-white" : full ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok"}`}>
                  {first(r.name)} · {full ? "at limit" : `${r.hours}/${r.weeklyHours}h`}
                </button>
              );
            })}
          </div>
          <button type="button" disabled={!canGenerate} onClick={generate} className="mt-2 rounded-full bg-crimson px-[18px] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy === "plan" ? "Muse is working…" : plan ? "Generate again" : "Generate plan with Muse"}
          </button>
        </Card>

        <Card className="!p-6">
          <div className="flex items-center gap-2.5">
            <h2 className="font-heading text-[22px] font-bold">Draft plan</h2>
            {busy === "plan" ? <Chip>Muse is working…</Chip> : plan && <Chip>Suggested by Muse · edit anything</Chip>}
            <span className="flex-1" />
            {plan && <span className="text-[13px] text-muted">7 phases · {total} h</span>}
          </div>

          {busy === "plan" && (
            <div className="mt-3.5 space-y-2.5">
              <div className="rounded-2xl bg-bg p-4 text-sm">
                <div className="text-muted">✓ Read your goal and deadline</div>
                <div className="mt-1.5 text-muted">✓ Checked who has room under their weekly limits</div>
                <div className="mt-1.5 font-semibold">● Drafting 7 phases and tasks…</div>
              </div>
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-11 animate-pulse rounded-xl bg-bg" />)}
            </div>
          )}

          {!plan && busy !== "plan" && <p className="mt-3 text-sm text-muted">Describe the goal, pick who could work on it, and Muse will draft the phases, tasks and who takes them. Nothing is created until you press Create project.</p>}

          {plan && busy !== "plan" && (
            <div className="mt-2">
              {plan.phases.map((ph, i) => {
                const owners = [...new Set(ph.tasks.map((t) => t.owner).filter(Boolean))] as string[];
                const hours = ph.tasks.reduce((s, t) => s + (Number(t.hours) || 0), 0);
                return (
                  <div key={i} className="border-t border-line first:border-t-0">
                    {open === i ? (
                      <div className="my-2 rounded-[18px] bg-bg p-4">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-crimson text-xs font-semibold text-white">{i + 1}</span>
                          <span className="font-semibold">{ph.name}</span>
                          <Chip>Editing</Chip>
                          <span className="flex-1" />
                          <button type="button" onClick={() => setOpen(null)} className="text-xs font-semibold text-muted">Done</button>
                        </div>
                        {i === 0 && <p className="mt-2 text-xs text-muted">Phase 1 tasks are assigned now and count toward weekly limits. Later phases are assigned when they start.</p>}
                        <div className="mt-3 space-y-2">
                          {ph.tasks.map((t, j) => (
                            <div key={j} className="flex items-center gap-2">
                              <input className="min-w-0 flex-1 rounded-[10px] bg-surface px-3 py-2 text-sm outline-none" value={t.title} onChange={(e) => edit((p) => (p.phases[i].tasks[j].title = e.target.value))} />
                              <input type="number" min={0} className="w-16 rounded-[10px] bg-surface px-3 py-2 text-sm outline-none" value={t.hours} onChange={(e) => edit((p) => (p.phases[i].tasks[j].hours = Number(e.target.value)))} />
                              <select className="rounded-[10px] bg-surface px-2 py-2 text-sm outline-none" value={t.owner ?? ""} onChange={(e) => edit((p) => (p.phases[i].tasks[j].owner = e.target.value || null))}>
                                <option value="">Unassigned</option>
                                {people.map((r) => <option key={r.id} value={r.name}>{first(r.name)}</option>)}
                              </select>
                              <button type="button" aria-label="Remove task" onClick={() => edit((p) => p.phases[i].tasks.splice(j, 1))} className="px-1 text-muted">✕</button>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => edit((p) => p.phases[i].tasks.push({ title: "New task", hours: 1, owner: people[0]?.name ?? null }))} className="mt-3 rounded-full border border-line px-3 py-1.5 text-xs font-semibold">+ Add task</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setOpen(i)} className="flex w-full items-center gap-3.5 py-3 text-left">
                        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-crimson-soft text-xs font-semibold text-crimson">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold">{ph.name}</span>
                          <span className="block truncate text-[13px] text-muted">{ph.tasks.map((t) => t.title).join(" · ") || "No tasks yet"}</span>
                        </span>
                        <Chip tone="light">{hours} h</Chip>
                        <span className="flex gap-1">{owners.map((o) => <Avatar key={o} initials={initials(o)} size={26} />)}</span>
                      </button>
                    )}
                  </div>
                );
              })}
              {over.length > 0 ? (
                <div className="mt-3 rounded-[14px] bg-warn-soft p-3 text-[13px] text-ink">
                  <b className="mb-1 block text-warn">Over a weekly limit</b>
                  {over.map((o) => <div key={o.id}>{first(o.name)} would reach {o.hours} of {o.weeklyHours} hours and {o.tasks} of {o.maxTasks} tasks. Reassign a phase 1 task to continue.</div>)}
                </div>
              ) : (
                <div className="mt-3 rounded-[14px] bg-ok-soft p-3 text-[13px] font-medium text-ok">Phase 1 stays within everyone&apos;s weekly limits. Hours are estimates.</div>
              )}
            </div>
          )}
        </Card>
      </div>

      <div className="sticky bottom-4 mt-auto flex items-center gap-2.5 rounded-[20px] bg-surface px-5 py-3">
        <span className="text-[13px] text-muted">{error ? <span className="text-crimson">{error}</span> : "Nothing is created until you press Create project."}</span>
        <span className="flex-1" />
        <Link href="/projects" className="rounded-full border border-line px-[18px] py-2.5 text-sm font-semibold">Cancel</Link>
        <button type="button" disabled={!plan || over.length > 0 || busy !== ""} onClick={create} className="rounded-full bg-crimson px-[18px] py-2.5 text-sm font-semibold text-white disabled:opacity-40">
          {busy === "create" ? "Creating…" : "Create project"}
        </button>
      </div>
    </>
  );
}
