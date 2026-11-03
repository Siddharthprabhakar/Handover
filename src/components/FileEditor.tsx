"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Analysis } from "@/lib/analysis";
import type { FileRow, Turn } from "@/lib/seed";
import { ActionBar, Card, Chip } from "./ui";

const input = "w-full rounded-[14px] bg-bg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-crimson/30";
const ghost = "rounded-full border border-line px-4 py-2 text-[13px] font-semibold disabled:opacity-50";

export function FileEditor({ file, projects }: { file: FileRow; projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(file.title);
  const [projectId, setProjectId] = useState(file.project_id ?? "");
  const [label, setLabel] = useState(file.participant_label ?? "");
  const [turns, setTurns] = useState<Turn[]>(file.transcript ?? []);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const demo = file.storage_path.startsWith("demo/"); // sample transcript with no audio behind it
  const analysis = file.analysis as Analysis | null;
  const speakers = [...new Set(turns.map((t) => t.speaker).filter((s): s is string => Boolean(s)))];

  async function call(what: string, url: string, init: RequestInit, done?: string) {
    setBusy(what);
    setMsg("");
    const res = await fetch(url, { ...init, headers: { "content-type": "application/json" } });
    const body = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMsg(body.error ?? "Something went wrong");
      return null;
    }
    if (done) setMsg(done);
    router.refresh();
    return body;
  }
  const patch = (b: object, what: string, done: string) => call(what, `/api/files/${file.id}`, { method: "PATCH", body: JSON.stringify(b) }, done);
  const rename = (from: string, to: string) => setTurns(turns.map((t) => (t.speaker === from ? { ...t, speaker: to } : t)));

  function download() {
    const text = turns.map((t) => (t.speaker ? `${t.speaker}: ${t.text}` : t.text)).join("\n\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([text], { type: "text/plain" })), download: `${title}.txt` });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function remove() {
    if (!confirm("Delete this recording and its transcript? This cannot be undone.")) return;
    if (await call("Deleting…", `/api/files/${file.id}`, { method: "DELETE" })) router.push("/files");
  }

  return (
    <>
      <Card className="flex flex-col gap-3">
        {!demo && <audio controls preload="none" src={`/api/files/${file.id}/audio`} className="w-full" />}
        <div className="grid gap-3 sm:grid-cols-3">
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
          <select className={input} value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Project">
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {file.kind !== "voice_checkin" && <input className={input} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Participant label" aria-label="Participant label" />}
        </div>
        <button type="button" disabled={!!busy || !title.trim()} onClick={() => patch({ title, projectId: projectId || null, participantLabel: label }, "Saving…", "Saved")} className={`self-start ${ghost}`}>
          Save details
        </button>
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="font-heading text-xl font-bold">Transcript</h2>
          {file.status !== "ready" && <Chip tone={file.status === "failed" ? "crimson" : "warn"}>{file.status === "failed" ? "Failed" : "Transcribing…"}</Chip>}
        </div>
        {(file.status === "failed" || file.status === "transcribing") && (
          <p className={`text-sm ${file.status === "failed" ? "text-crimson" : "text-muted"}`}>
            {file.status === "failed" ? file.error : "Taking more than a minute or two? It may have stopped."}{" "}
            <button type="button" className="font-semibold underline" onClick={() => call("Retrying…", "/api/files/transcribe", { method: "POST", body: JSON.stringify({ id: file.id }) })}>
              Try again
            </button>
          </p>
        )}
        {file.status === "ready" && <p className="text-xs text-muted">Transcripts can contain mistakes, such as a repeated word. Fix them here before you analyse.</p>}
        {speakers.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {speakers.map((s) => (
              <label key={s} className="flex items-center gap-2 text-xs text-muted">
                Speaker
                <input className="w-28 rounded-full bg-bg px-3 py-1.5 text-sm text-ink outline-none" defaultValue={s} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== s && rename(s, e.target.value.trim())} />
              </label>
            ))}
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className="flex flex-col gap-1">
            {t.speaker && <b className="text-xs text-crimson">{t.speaker}</b>}
            <textarea rows={Math.max(2, Math.ceil(t.text.length / 90))} className={`${input} resize-none`} value={t.text} onChange={(e) => setTurns(turns.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
          </div>
        ))}
      </Card>

      {analysis && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="font-heading text-xl font-bold">Analysis</h2>
            <Chip>Muse</Chip>
          </div>
          <p className="text-sm leading-relaxed">{analysis.summary}</p>
          {analysis.themes.map((t) => (
            <div key={t.title} className="rounded-2xl bg-bg p-3.5 text-sm">
              <b>{t.title}</b>
              <p className="text-muted">{t.description}</p>
              {t.quotes.map((q) => (
                <blockquote key={q} className="mt-1.5 border-l-2 border-crimson pl-3 italic">&ldquo;{q}&rdquo;</blockquote>
              ))}
            </div>
          ))}
          {analysis.follow_ups.length > 0 && (
            <div>
              <b className="mb-1 block text-xs text-crimson">Worth asking next</b>
              <ul className="list-disc pl-5 text-sm">{analysis.follow_ups.map((q) => <li key={q}>{q}</li>)}</ul>
            </div>
          )}
        </Card>
      )}

      <ActionBar hint={busy || msg}>
        <button type="button" disabled={!!busy} onClick={remove} className={`${ghost} text-crimson`}>Delete</button>
        {!demo && <a href={`/api/files/${file.id}/audio?download=1`} className={ghost}>Download audio</a>}
        <button type="button" disabled={!turns.length} onClick={download} className={ghost}>Download text</button>
        <button type="button" disabled={!!busy || file.status !== "ready"} onClick={() => patch({ turns }, "Saving…", "Transcript saved")} className={ghost}>Save transcript</button>
        <button type="button" disabled={!!busy || file.status !== "ready"} onClick={() => call("Muse is reading…", `/api/files/${file.id}/analyze`, { method: "POST" }, "Analysis ready")} className="rounded-full bg-crimson px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
          {analysis ? "Analyse again" : "Analyse with Muse"}
        </button>
      </ActionBar>
    </>
  );
}
