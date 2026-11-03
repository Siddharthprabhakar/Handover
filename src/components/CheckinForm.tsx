"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Chip } from "./ui";
import { VoiceCheckin } from "./VoiceCheckin";

type Project = { id: string; name: string; kind: "lab" | "thesis" };

const field = "w-full resize-none rounded-[14px] bg-bg px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-crimson/30";

const Label = ({ children }: { children: string }) => <label className="mt-4 block text-[13px] font-semibold">{children}</label>;

export function CheckinForm({ token, name, projects, planned }: { token: string; name: string; projects: Project[]; planned: string[] }) {
  const router = useRouter();
  const [main, ...others] = projects;
  const [done, setDone] = useState<string[]>([]);
  const [f, setF] = useState({ challenges: "", plans: "", support: "", needsTasks: false });
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setBusy(true);
    setError("");
    const answers = [
      { projectId: main.id, ...f, done },
      ...others.map((p) => ({ projectId: p.id, challenges: extra[p.id] ?? "", plans: "", support: "", needsTasks: false, done: [] })),
    ];
    const res = await fetch("/api/checkin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, answers }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "Something went wrong. Your answers are still here.");
    router.refresh();
  }


  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="!p-6">
          <div className="flex items-center gap-2.5">
            <h2 className="font-heading text-[22px] font-bold">{main.name}</h2>
            <Chip>{main.kind === "lab" ? "Lab" : "Thesis"}</Chip>
          </div>
          {planned.length > 0 && (
            <>
              <div className="mb-1.5 mt-3.5 text-xs font-semibold text-muted">Last week you planned</div>
              {planned.map((t) => {
                const on = done.includes(t);
                return (
                  <button key={t} type="button" onClick={() => setDone(on ? done.filter((x) => x !== t) : [...done, t])} className="flex w-full items-center gap-3 py-1.5 text-left">
                    <span className={`grid h-[22px] w-[22px] place-items-center rounded-[7px] ${on ? "bg-crimson text-white" : "border-[1.5px] border-line"}`}>
                      {on && <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
                    </span>
                    <span className="text-[15px] font-medium">{t}</span>
                  </button>
                );
              })}
            </>
          )}
          <VoiceCheckin token={token} onText={(t) => setF((x) => ({ ...x, challenges: x.challenges ? `${x.challenges}\n${t}` : t }))} />
          <Label>What challenges or confusions did you have? Still need help?</Label>
          <textarea rows={2} className={`${field} mt-1.5`} value={f.challenges} onChange={(e) => setF({ ...f, challenges: e.target.value })} />
          <Label>Plans for next week</Label>
          <textarea rows={2} className={`${field} mt-1.5`} value={f.plans} onChange={(e) => setF({ ...f, plans: e.target.value })} />
          <Label>Any support, workshops or materials that would help?</Label>
          <textarea rows={2} className={`${field} mt-1.5`} value={f.support} onChange={(e) => setF({ ...f, support: e.target.value })} />
          <button type="button" onClick={() => setF({ ...f, needsTasks: !f.needsTasks })} className="mt-4 flex items-center gap-3">
            <span className={`grid h-[22px] w-[22px] place-items-center rounded-[7px] ${f.needsTasks ? "bg-crimson text-white" : "border-[1.5px] border-line"}`}>
              {f.needsTasks && <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
            </span>
            <span className="text-[15px] font-medium">I need more tasks</span>
          </button>
        </Card>

        <div className="flex flex-col gap-4">
          {others.map((p) => (
            <div key={p.id} className="flex flex-col gap-2.5 rounded-[28px] bg-crimson p-5 text-white">
              <span className="self-start rounded-full bg-bg px-2.5 py-0.5 text-xs font-semibold text-muted">Quick one</span>
              <h3 className="font-heading text-[21px] font-bold leading-snug">You are also on {p.name}</h3>
              <p className="text-sm">Anything to share there? One line is fine, or skip if nothing changed.</p>
              <textarea rows={2} placeholder="Optional" className="w-full resize-none rounded-[14px] bg-white px-3.5 py-3 text-sm text-ink outline-none" value={extra[p.id] ?? ""} onChange={(e) => setExtra({ ...extra, [p.id]: e.target.value })} />
            </div>
          ))}
          <Card>
            <h3 className="font-heading text-[17px] font-bold">You can see what is shared</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">Your professor and you can both see this check-in and any note drawn from it. Nothing is sent to others automatically.</p>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-4 mt-4 flex flex-wrap items-center gap-2.5 rounded-[20px] bg-surface px-5 py-3">
        <span className="text-[13px] text-muted">{error ? <span className="text-crimson">{error}</span> : `Thanks, ${name}. Your professor and you can both see what you share.`}</span>
        <span className="flex-1" />
        <button type="button" disabled={busy} onClick={send} className="rounded-full bg-crimson px-[18px] py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Sending…" : "Send check-in"}
        </button>
      </div>
    </>
  );
}
