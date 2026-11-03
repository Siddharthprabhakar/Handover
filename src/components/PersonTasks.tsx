"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type TaskItem = { id: string; title: string; project: string; phase: string; hours: number };
type Person = { id: string; name: string };

const field = "rounded-xl bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-crimson/30";

/** A button showing how many open tasks someone has. It opens a list where each task can be renamed, resized, handed to someone else, or finished. */
export function PersonTasks({ person, tasks, people }: { person: Person; tasks: TaskItem[]; people: Person[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">Tasks ({tasks.length})</button>
      {open && (
        <div className="fixed inset-0 z-20 flex overflow-auto bg-black/55 p-5" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="m-auto flex w-full max-w-[640px] flex-col gap-3 rounded-[28px] bg-surface p-7 text-left">
            <h2 className="font-heading text-2xl font-bold">{person.name.split(" ")[0]}&apos;s open tasks</h2>
            {tasks.length === 0 && <p className="text-sm text-muted">Nothing open. Use Assign task to give {person.name.split(" ")[0]} some work.</p>}
            {tasks.map((t) => <Row key={t.id} task={t} owner={person} people={people} />)}
            <button type="button" onClick={() => setOpen(false)} className="self-start rounded-full border border-line px-[18px] py-2.5 text-sm font-semibold">Close</button>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ task, owner, people }: { task: TaskItem; owner: Person; people: Person[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [hours, setHours] = useState(String(task.hours));
  const [who, setWho] = useState(owner.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changed = title.trim() !== task.title || Number(hours) !== task.hours || who !== owner.id;

  async function call(url: string, body: object) {
    setBusy(true);
    setError("");
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.others?.length ? `${data.error} ${data.others[0]} has room.` : (data.error ?? "That did not work"));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line p-3.5">
      <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Task name" />
      <div className="text-xs text-muted">{task.project} · {task.phase}</div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="number" min={0.5} step={0.5} className={`${field} w-20`} value={hours} onChange={(e) => setHours(e.target.value)} aria-label="Hours" />
        <span className="text-xs text-muted">hours</span>
        <select className={`${field} min-w-0 flex-1`} value={who} onChange={(e) => setWho(e.target.value)} aria-label="Assigned to">
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button type="button" disabled={busy || !changed || !title.trim() || !(Number(hours) >= 0.5)} onClick={() => call("/api/tasks/update", { taskId: task.id, title: title.trim(), hours: Number(hours), assignee: who })} className="rounded-full bg-crimson px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-40">Save</button>
        <button type="button" disabled={busy} onClick={() => call("/api/tasks/status", { taskId: task.id, status: "done" })} className="rounded-full border border-line px-3.5 py-2 text-xs font-semibold disabled:opacity-40">Mark done</button>
      </div>
      {error && <p className="text-[13px] text-crimson">{error}</p>}
    </div>
  );
}
