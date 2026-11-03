"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { fmtDate, initials } from "@/lib/format";
import { phaseOneCheck, type Load, type PlanData } from "@/lib/limits";
import { Avatar, Card, Chip } from "./ui";

const input = "w-full rounded-xl bg-bg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-crimson/30";
const first = (n: string) => n.split(" ")[0];
const MAX_PHASES = 12;
type Notes = { resources: string[]; communication: string[] };

/** The phase a project already in progress should start in: the first one not yet past due. */
function startPhase(plan: PlanData) {
  const today = new Date().toISOString().slice(0, 10);
  const i = plan.phases.findIndex((p) => p.due && p.due >= today);
  return i >= 0 ? i + 1 : plan.phases.some((p) => p.due) ? plan.phases.length : 1;
}

export function NewProjectForm({ ras }: { ras: Load[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<"lab" | "thesis">("lab");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selected, setSelected] = useState<string[]>(ras.filter((r) => r.tasks < r.maxTasks && r.hours < r.weeklyHours).map((r) => r.id));
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [notes, setNotes] = useState<Notes | null>(null);
  const [current, setCurrent] = useState(1);
  const [fromDoc, setFromDoc] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState<"" | "plan" | "doc" | "create">("");
  const [error, setError] = useState("");

  const cur = plan ? Math.min(current, plan.phases.length) : 1;
  const over = useMemo(() => (plan ? phaseOneCheck({ phases: [plan.phases[cur - 1]] }, ras) : []), [plan, ras, cur]);
  const people = ras.filter((r) => selected.includes(r.id));
  const total = plan ? plan.phases.reduce((s, p) => s + p.tasks.reduce((a, t) => a + (Number(t.hours) || 0), 0), 0) : 0;
  const canGenerate = name.trim() && goal.trim() && selected.length > 0 && !busy;

  async function generate() {
    setBusy("plan");
    setError("");
    setPlan(null);
    setNotes(null);
    setFromDoc("");
    const res = await fetch("/api/projects/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, name, goal, deadline, people: selected }) });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) return setError(body.error ?? "Could not draft a plan");
    setPlan(body.plan);
    setCurrent(1);
    setOpen(null);
  }

  async function readDocument(file: File) {
    setBusy("doc");
    setError("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/projects/import", { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) return setError(body.error ?? "Could not read that file");
    const d = body.draft;
    const next: PlanData = { phases: d.phases };
    setKind(d.kind);
    setName(d.name);
    setGoal(d.goal);
    setDeadline(d.deadline ?? "");
    setPlan(next);
    setNotes({ resources: d.resources, communication: d.communication });
    setCurrent(startPhase(next));
    setFromDoc(file.name);
    setOpen(null);
  }

  async function create() {
    if (!plan) return;
    setBusy("create");
    setError("");
    const res = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, name, goal, deadline, people: selected, plan, current: cur, notes }) });
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

  /** Move a phase up or down; the "project starts in" choice follows its phase. */
  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (!plan || j < 0 || j >= plan.phases.length) return;
    edit((p) => ([p.phases[i], p.phases[j]] = [p.phases[j], p.phases[i]]));
    setOpen(j);
    if (cur === i + 1) setCurrent(j + 1);
    else if (cur === j + 1) setCurrent(i + 1);
  };

  const removePhase = (i: number) => {
    if (!plan || plan.phases.length <= 1) return;
    edit((p) => p.phases.splice(i, 1));
    setOpen(null);
    if (cur > i + 1) setCurrent(cur - 1);
  };

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[460px_1fr]">
        <Card className="flex flex-col gap-3.5 !p-6">
          <label className={`flex cursor-pointer flex-col gap-1 rounded-2xl border-2 border-dashed border-line p-4 text-center hover:border-crimson hover:bg-crimson-soft ${busy ? "pointer-events-none opacity-60" : ""}`}>
            <b className="text-sm">{busy === "doc" ? "Muse is reading your document…" : fromDoc ? `Read ${fromDoc}. Choose another?` : "Start from a document"}</b>
            <span className="text-xs text-muted">A Word, Excel or text project plan. Muse sets up the phases, dates and tasks. The file is read once and not kept.</span>
            <input type="file" accept=".docx,.xlsx,.txt,.md,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) readDocument(f); }} />
          </label>
          <div className="text-center text-xs text-muted">or describe it</div>
          <div className="text-xs font-semibold text-muted">Project type</div>
          <div className="flex gap-1 rounded-xl bg-bg p-[3px]">
            {([["lab", "Lab study"], ["thesis", "Thesis"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => { setKind(k); if (!fromDoc) setPlan(null); }} className={`flex-1 rounded-[10px] px-4 py-2 text-[13px] font-semibold ${kind === k ? "bg-dark text-white" : "text-muted"}`}>{l}</button>
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
            {busy === "plan" ? "Muse is working…" : plan && !fromDoc ? "Generate again" : fromDoc ? "Replace with a fresh plan from the goal" : "Generate plan with Muse"}
          </button>
        </Card>

        <Card className="!p-6">
          {error && <div role="alert" className="mb-4 rounded-2xl bg-crimson-soft p-4 text-sm font-semibold text-crimson">{error}</div>}
          <div className="flex items-center gap-2.5">
            <h2 className="font-heading text-[22px] font-bold">Draft plan</h2>
            {busy === "plan" || busy === "doc" ? <Chip>Muse is working…</Chip> : plan && <Chip>{fromDoc ? "Read from your document" : "Suggested by Muse"} · edit anything</Chip>}
            <span className="flex-1" />
            {plan && <span className="text-[13px] text-muted">{plan.phases.length} phases · {total} h</span>}
          </div>

          {(busy === "plan" || busy === "doc") && (
            <div className="mt-3.5 space-y-2.5">
              <div className="rounded-2xl bg-bg p-4 text-sm">
                <div className="text-muted">✓ {busy === "doc" ? "Opened your document" : "Read your goal and deadline"}</div>
                <div className="mt-1.5 text-muted">✓ {busy === "doc" ? "Found the stages and dates" : "Checked who has room under their weekly limits"}</div>
                <div className="mt-1.5 font-semibold">● Drafting phases and tasks…</div>
              </div>
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-11 animate-pulse rounded-xl bg-bg" />)}
            </div>
          )}

          {!plan && !busy && <p className="mt-3 text-sm text-muted">Upload a project plan, or describe the goal and pick who could work on it. Muse drafts the phases, tasks and who takes them. You can rename phases, set dates and change anything. Nothing is created until you press Create project.</p>}

          {plan && !busy && (
            <div className="mt-2">
              {plan.phases.map((ph, i) => {
                const owners = [...new Set(ph.tasks.map((t) => t.owner).filter(Boolean))] as string[];
                const hours = ph.tasks.reduce((s, t) => s + (Number(t.hours) || 0), 0);
                return (
                  <div key={i} className="border-t border-line first:border-t-0">
                    {open === i ? (
                      <div className="my-2 rounded-[18px] bg-bg p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-crimson text-xs font-semibold text-white">{i + 1}</span>
                          <input className="min-w-0 flex-1 rounded-[10px] bg-surface px-3 py-2 text-sm font-semibold outline-none" value={ph.name} maxLength={80} onChange={(e) => edit((p) => (p.phases[i].name = e.target.value))} aria-label="Phase name" />
                          <input type="date" className="rounded-[10px] bg-surface px-2 py-2 text-sm outline-none" value={ph.due ?? ""} onChange={(e) => edit((p) => (p.phases[i].due = e.target.value || null))} aria-label="Phase due date" />
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-full border border-line px-2.5 py-1 font-semibold disabled:opacity-30">↑ Up</button>
                          <button type="button" disabled={i === plan.phases.length - 1} onClick={() => move(i, 1)} className="rounded-full border border-line px-2.5 py-1 font-semibold disabled:opacity-30">↓ Down</button>
                          <button type="button" disabled={plan.phases.length <= 1} onClick={() => removePhase(i)} className="rounded-full border border-line px-2.5 py-1 font-semibold text-crimson disabled:opacity-30">Remove phase</button>
                          <span className="flex-1" />
                          <button type="button" onClick={() => setOpen(null)} className="font-semibold text-muted">Done</button>
                        </div>
                        {i + 1 === cur && <p className="mt-2 text-xs text-muted">The project starts in this phase. Its tasks are assigned now and count toward weekly limits. Later phases are assigned when they start.</p>}
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
                        <button type="button" onClick={() => edit((p) => p.phases[i].tasks.push({ title: "New task", hours: 1, owner: null }))} className="mt-3 rounded-full border border-line px-3 py-1.5 text-xs font-semibold">+ Add task</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setOpen(i)} className="flex w-full items-center gap-3.5 py-3 text-left">
                        <span className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-xs font-semibold ${i + 1 === cur ? "bg-crimson text-white" : "bg-crimson-soft text-crimson"}`}>{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold">{ph.name}{ph.due && <span className="ml-2 text-xs font-medium text-muted">due {fmtDate(ph.due)}</span>}</span>
                          <span className="block truncate text-[13px] text-muted">{ph.tasks.map((t) => t.title).join(" · ") || "No tasks yet"}</span>
                        </span>
                        <Chip tone="light">{hours} h</Chip>
                        <span className="flex gap-1">{owners.map((o) => <Avatar key={o} initials={initials(o)} size={26} />)}</span>
                      </button>
                    )}
                  </div>
                );
              })}

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button type="button" disabled={plan.phases.length >= MAX_PHASES} onClick={() => { edit((p) => p.phases.push({ name: "New phase", due: null, tasks: [] })); setOpen(plan.phases.length); }} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40">+ Add phase</button>
                <label className="flex items-center gap-2 text-xs font-semibold text-muted">
                  Project starts in
                  <select className="rounded-[10px] bg-bg px-2 py-1.5 text-sm text-ink outline-none" value={cur} onChange={(e) => setCurrent(Number(e.target.value))}>
                    {plan.phases.map((p, i) => <option key={i} value={i + 1}>{i + 1}. {p.name}</option>)}
                  </select>
                </label>
              </div>
              {cur > 1 && <p className="mt-1.5 text-xs text-muted">Phases before the starting one are treated as finished, and their tasks are marked done.</p>}

              {notes && (notes.resources.length > 0 || notes.communication.length > 0) && (
                <div className="mt-4 grid gap-4 rounded-2xl bg-bg p-4 sm:grid-cols-2">
                  {([["What the partner provides", "resources"], ["How the team communicates", "communication"]] as const).map(([title, key]) => notes[key].length > 0 && (
                    <div key={key}>
                      <b className="mb-1.5 block text-xs text-muted">{title}</b>
                      {notes[key].map((x, i) => (
                        <div key={i} className="flex items-start gap-2 py-0.5 text-[13px] leading-snug">
                          <span className="flex-1">{x}</span>
                          <button type="button" aria-label="Remove" onClick={() => setNotes({ ...notes, [key]: notes[key].filter((_, j) => j !== i) })} className="px-1 text-muted">✕</button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {over.length > 0 ? (
                <div className="mt-3 rounded-[14px] bg-warn-soft p-3 text-[13px] text-ink">
                  <b className="mb-1 block text-warn">Over a weekly limit</b>
                  {over.map((o) => <div key={o.id}>{o.detail} Reassign a task in the starting phase to continue.</div>)}
                </div>
              ) : (
                <div className="mt-3 rounded-[14px] bg-ok-soft p-3 text-[13px] font-medium text-ok">The starting phase stays within everyone&apos;s weekly limits. Hours are estimates.</div>
              )}
            </div>
          )}
        </Card>
      </div>

      <div className="sticky bottom-4 mt-auto flex flex-wrap items-center gap-2.5 rounded-[20px] bg-surface px-5 py-3">
        {error ? <span role="alert" className="min-w-0 flex-1 rounded-xl bg-crimson-soft px-3.5 py-2 text-sm font-semibold text-crimson">{error}</span> : <span className="text-[13px] text-muted">Nothing is created until you press Create project.</span>}
        <span className="flex-1" />
        <Link href="/projects" className="rounded-full border border-line px-[18px] py-2.5 text-sm font-semibold">Cancel</Link>
        <button type="button" disabled={!plan || !name.trim() || plan.phases.some((p) => !p.name.trim()) || over.length > 0 || busy !== ""} onClick={create} className="rounded-full bg-crimson px-[18px] py-2.5 text-sm font-semibold text-white disabled:opacity-40">
          {busy === "create" ? "Creating…" : "Create project"}
        </button>
      </div>
    </>
  );
}
