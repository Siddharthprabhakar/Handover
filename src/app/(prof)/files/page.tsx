import Link from "next/link";
import { AddRecording } from "@/components/AddRecording";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Card, Chip, PageHeader, type Tone } from "@/components/ui";
import { list, recordings } from "@/lib/db";
import { kindLabel } from "@/lib/files";
import { fmtDate } from "@/lib/lab";
import { requireProfessor } from "@/lib/session";
import { MAX_SEC } from "@/lib/transcribe";

export const dynamic = "force-dynamic";

const STATUS: Record<string, [string, Tone]> = { uploaded: ["Uploaded", "light"], transcribing: ["Transcribing…", "warn"], ready: ["Ready", "ok"], failed: ["Failed", "crimson"] };
const mins = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "");

/** A short stretch of transcript around the first match, for search results. */
function snippet(text: string | null, q: string) {
  if (!text || !q) return null;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  return i < 0 ? null : `${i > 40 ? "…" : ""}${text.slice(Math.max(0, i - 40), i + 100)}…`;
}

export default async function Files({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  const session = await requireProfessor();
  const { q = "", kind = "" } = await searchParams;
  const [all, projects, people] = await Promise.all([list("files", { col: "lab_id", eq: session.labId }), list("projects", { col: "lab_id", eq: session.labId }), list("people", { col: "lab_id", eq: session.labId })]);
  const needle = q.trim().toLowerCase();
  const files = all
    .filter((f) => (!kind || f.kind === kind) && (!needle || [f.title, f.participant_label, f.transcript_text].some((s) => s?.toLowerCase().includes(needle))))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const project = (id: string | null) => projects.find((p) => p.id === id)?.name;
  const person = (id: string | null) => people.find((p) => p.id === id)?.name;
  const field = "rounded-full bg-surface px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-crimson/30";

  return (
    <>
      <AutoRefresh active={all.some((f) => f.status === "transcribing")} />
      <PageHeader title="Files" sub="Voice check-ins and interview recordings, with transcripts, in one place." />
      {recordings ? (
        <AddRecording projects={projects.map((p) => ({ id: p.id, name: p.name }))} maxSec={MAX_SEC} />
      ) : (
        <Card><p className="text-sm text-muted">Recordings need Supabase. This demo runs without it, so files are switched off.</p></Card>
      )}
      <form className="flex flex-wrap gap-2.5">
        <input name="q" defaultValue={q} placeholder="Search titles and transcripts" className={`${field} min-w-0 flex-1`} />
        <select name="kind" defaultValue={kind} className={field}>
          <option value="">All types</option>
          {Object.entries(kindLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button className="rounded-full bg-dark px-4 py-2 text-sm font-semibold text-white">Search</button>
      </form>
      {files.length === 0 && <Card><p className="text-sm text-muted">{all.length ? "Nothing matches that search." : "No recordings yet. Add an interview above, or students can record their check-in from their link."}</p></Card>}
      {files.map((f) => {
        const [label, tone] = STATUS[f.status];
        const hit = snippet(f.transcript_text, q.trim());
        return (
          <Link key={f.id} href={`/files/${f.id}`}>
            <Card className="flex flex-col gap-1.5 transition hover:bg-white">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-[15px]">{f.title}</b>
                <Chip tone="light">{kindLabel[f.kind]}</Chip>
                <Chip tone={tone}>{label}</Chip>
                <span className="flex-1" />
                <span className="text-xs text-muted">{fmtDate(f.created_at.slice(0, 10))}</span>
              </div>
              <p className="text-[13px] text-muted">
                {[mins(f.duration_sec), person(f.person_id) ?? f.participant_label, project(f.project_id)].filter(Boolean).join(" · ")}
              </p>
              {hit && <p className="text-[13px] italic">{hit}</p>}
            </Card>
          </Link>
        );
      })}
    </>
  );
}
