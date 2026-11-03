"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TODAY } from "@/lib/demo";
import { fmtDate } from "@/lib/format";
import { MAX_OVERTIME_DAYS, addDays, daysBetween, fits, suggestOthers, type Load } from "@/lib/limits";

type Project = { id: string; name: string; phases: string[] };
const field = "w-full rounded-xl bg-bg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-crimson/30";
const first = (n: string) => n.split(" ")[0];

export function AssignTask({ personId, loads, projects, label = "Assign task" }: { personId?: string; loads: Load[]; projects: Project[]; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">{label}</button>
      {open && <Modal personId={personId ?? loads[0].id} loads={loads} projects={projects} onClose={() => setOpen(false)} />}
    </>
  );
}

function Modal({ personId, loads, projects, onClose }: { personId: string; loads: Load[]; projects: Project[]; onClose: () => void }) {
  const router = useRouter();
  const [who, setWho] = useState(personId);
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState(2);
  const [projectId, setProjectId] = useState(projects[0].id);
  const [phase, setPhase] = useState(1);
  const [ot, setOt] = useState(false);
  const [reason, setReason] = useState("");
  const [ends, setEnds] = useState(addDays(TODAY, 7));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const person = loads.find((l) => l.id === who)!;
  const project = projects.find((p) => p.id === projectId)!;
  const fit = fits(person, 1, hours);
  const others = suggestOthers(loads, who, hours);
  const days = daysBetween(TODAY, ends);
  const otValid = reason.trim().length >= 3 && days >= 0 && days <= MAX_OVERTIME_DAYS;
  const baseOk = title.trim().length > 0 && hours > 0;

  async function submit() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/tasks/assign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ personId: who, projectId, phase, title, hours, ...(!fit.ok && ot ? { overtime: { reason, ends } } : {}) }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "Could not assign");
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-20 flex overflow-auto bg-black/55 p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="m-auto flex w-full max-w-[560px] flex-col gap-3.5 rounded-[28px] bg-surface p-7 text-left">
        <h2 className="font-heading text-2xl font-bold">Assign task to {first(person.name)}</h2>
        <label className="text-xs font-semibold text-muted">Task
          <input autoFocus className={`${field} mt-1.5 text-ink`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Prepare poster for the HCI showcase" />
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          <label className="text-xs font-semibold text-muted">Hours
            <input type="number" min={0.5} step={0.5} className={`${field} mt-1.5 text-ink`} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          </label>
          <label className="col-span-2 text-xs font-semibold text-muted">Project
            <select className={`${field} mt-1.5 text-ink`} value={projectId} onChange={(e) => { setProjectId(e.target.value); setPhase(1); }}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">Phase
            <select className={`${field} mt-1.5 text-ink`} value={phase} onChange={(e) => setPhase(Number(e.target.value))}>
              {project.phases.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
            </select>
          </label>
          <label className="col-span-2 text-xs font-semibold text-muted">Person
            <select className={`${field} mt-1.5 text-ink`} value={who} onChange={(e) => { setWho(e.target.value); setOt(false); }}>
              {loads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
        </div>

        {fit.kind === "ok" && <div className="rounded-2xl bg-ok-soft p-3.5 text-[13px] font-medium text-ok">Within limits: {fit.tasks} of {person.maxTasks} tasks and {fit.hours} of {person.weeklyHours} hours after this.</div>}
        {fit.kind === "overtime" && <div className="rounded-2xl bg-crimson-soft p-3.5 text-[13px] font-medium text-crimson">{fit.detail} The weekly cap is lifted until then.</div>}

        {fit.kind === "recovery" && (
          <div className="rounded-2xl bg-warn-soft p-4">
            <b className="mb-1 block text-[13px] text-warn">Recovery week</b>
            <span className="text-sm leading-relaxed">{fit.detail} This protects the time after overtime. Give the task to someone else, or assign it when the week ends.</span>
          </div>
        )}

        {fit.kind === "cap" && (
          <>
            <div className="rounded-2xl bg-warn-soft p-4">
              <b className="mb-1 block text-[13px] text-warn">{first(person.name)} is at the weekly limit</b>
              <span className="text-sm leading-relaxed">{fit.detail}</span>
            </div>
            {!ot && others.length > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-line p-3.5">
                <div className="flex-1 text-sm"><b className="font-semibold">{first(others[0].name)} has room</b><div className="text-xs text-muted">{others[0].tasks} tasks, {others[0].hours} of {others[0].weeklyHours} hours</div></div>
                <button type="button" onClick={() => setWho(others[0].id)} className="rounded-full bg-crimson px-3 py-1.5 text-xs font-semibold text-white">Assign to {first(others[0].name)}</button>
              </div>
            )}
            {!ot ? (
              <button type="button" onClick={() => setOt(true)} className="self-start text-[13px] font-semibold text-crimson">Need {first(person.name)} specifically? Start overtime</button>
            ) : (
              <div className="flex flex-col gap-2.5 rounded-2xl border border-line p-4">
                <div className="font-heading text-[17px] font-bold">Start overtime for {first(person.name)}</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="text-xs font-semibold text-muted">Reason (required)
                    <input className={`${field} mt-1.5 text-ink`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Showcase poster due Nov 7" />
                  </label>
                  <label className="text-xs font-semibold text-muted">Ends (required)
                    <input type="date" min={TODAY} max={addDays(TODAY, MAX_OVERTIME_DAYS)} className={`${field} mt-1.5 text-ink`} value={ends} onChange={(e) => setEnds(e.target.value)} />
                  </label>
                </div>
                <p className="text-xs leading-relaxed text-muted">
                  Up to {MAX_OVERTIME_DAYS} days. {first(person.name)} sees the reason and dates. A recovery week follows ({days >= 0 && days <= MAX_OVERTIME_DAYS ? `until ${fmtDate(addDays(ends, 7))}` : "7 days"}) with no new tasks. Overtime hours are recorded for payroll; the tool does not decide pay.
                </p>
              </div>
            )}
          </>
        )}

        {error && <p className="text-[13px] text-crimson">{error}</p>}
        <div className="flex gap-2.5">
          <button type="button" onClick={submit} disabled={busy || !baseOk || fit.kind === "recovery" || (fit.kind === "cap" && !(ot && otValid))} className="rounded-full bg-dark px-[18px] py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            {busy ? "Saving…" : fit.kind === "cap" ? "Start overtime & assign" : "Assign"}
          </button>
          <button type="button" onClick={onClose} className="rounded-full border border-line px-[18px] py-2.5 text-sm font-semibold">Cancel</button>
        </div>
      </div>
    </div>
  );
}
