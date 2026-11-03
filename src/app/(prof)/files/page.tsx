import { museStatus } from "@/lib/muse";
import Link from "next/link";
import { AddRecording } from "@/components/AddRecording";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Card, Chip, Icon, PageHeader, type Tone } from "@/components/ui";
import { list, recordings } from "@/lib/db";
import { kindLabel } from "@/lib/files";
import { fmtDate } from "@/lib/lab";
import { participantStats } from "@/lib/participants";
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

export default async function Files({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string; folder?: string }> }) {
  const session = await requireProfessor();
  const { q = "", kind = "", folder = "" } = await searchParams;
  const [all, projects, people, roster] = await Promise.all([
    list("files", { col: "lab_id", eq: session.labId }),
    list("projects", { col: "lab_id", eq: session.labId }),
    list("people", { col: "lab_id", eq: session.labId }),
    list("participants", { col: "lab_id", eq: session.labId }).catch(() => []), // needs the v11 database update
  ]);
  const needle = q.trim().toLowerCase();
  const open = folder === "unfiled" ? "unfiled" : projects.find((p) => p.id === folder)?.id ?? "";
  const files = all
    .filter((f) => (!open || (open === "unfiled" ? !f.project_id : f.project_id === open)) && (!kind || f.kind === kind) && (!needle || [f.title, f.participant_label, f.transcript_text].some((s) => s?.toLowerCase().includes(needle))))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const project = (id: string | null) => projects.find((p) => p.id === id)?.name;
  const person = (id: string | null) => people.find((p) => p.id === id)?.name;
  const field = "rounded-full bg-surface px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-crimson/30";
  const current = projects.find((p) => p.id === open);
  const showFolders = !open && !needle && !kind;
  const unfiled = all.filter((f) => !f.project_id);
  const stats = (id: string) => participantStats(roster.filter((r) => r.project_id === id), all.filter((f) => f.project_id === id));

  return (
    <>
      <AutoRefresh active={all.some((f) => f.status === "transcribing")} />
      <PageHeader
        title={current ? current.name : open === "unfiled" ? "Unfiled" : "Files"}
        sub={current || open ? `${files.length} recording${files.length === 1 ? "" : "s"} in this folder.` : `One folder per study. Recordings are transcribed by ${museStatus().voice} and Muse suggests where each belongs.`}
        back={open ? { href: "/files", label: "All folders" } : undefined}
      />

      {recordings ? (
        <AddRecording projects={projects.map((p) => ({ id: p.id, name: p.name }))} maxSec={MAX_SEC} defaultProjectId={current?.id} />
      ) : (
        <Card><p className="text-sm text-muted">Recordings need Supabase. This demo runs without it, so files are switched off.</p></Card>
      )}

      <form className="flex flex-wrap gap-2.5">
        {open && <input type="hidden" name="folder" value={open} />}
        <input name="q" defaultValue={q} placeholder={open ? "Search this folder" : "Search every folder, titles and transcripts"} className={`${field} min-w-0 flex-1`} />
        <select name="kind" defaultValue={kind} className={field}>
          <option value="">All types</option>
          {Object.entries(kindLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button className="rounded-full bg-dark px-4 py-2 text-sm font-semibold text-white">Search</button>
      </form>

      {current && (
        <Card className="flex flex-wrap items-center gap-2.5">
          {(() => {
            const s = stats(current.id);
            const t = current.participant_target;
            return (
              <>
                <Chip tone={t && s.signedUp >= t ? "ok" : "warn"}>{t ? `${s.signedUp} of ${t} signed up` : `${s.signedUp} signed up`}</Chip>
                <span className="text-[13px] text-muted">{s.interviewed} interviewed · {s.transcribed} transcribed</span>
                <span className="flex-1" />
                <Link href={`/projects/${current.id}`} className="text-[13px] font-semibold text-crimson">Open the study</Link>
              </>
            );
          })()}
        </Card>
      )}

      {showFolders && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...projects].sort((a, b) => a.name.localeCompare(b.name)).map((p) => {
            const mine = all.filter((f) => f.project_id === p.id);
            const s = stats(p.id);
            const last = mine.map((f) => f.created_at).sort().at(-1);
            return (
              <Link key={p.id} href={`/files?folder=${p.id}`}>
                <Card className="flex h-full flex-col gap-2">
                  <div className="flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-crimson-soft text-crimson"><Icon name="folder" /></span><b className="min-w-0 flex-1 truncate font-heading text-lg">{p.name}</b></div>
                  <p className="text-[13px] text-muted">{mine.length} recording{mine.length === 1 ? "" : "s"} · {mine.filter((f) => f.kind === "interview").length} interview{mine.filter((f) => f.kind === "interview").length === 1 ? "" : "s"}{last ? ` · last ${fmtDate(last.slice(0, 10))}` : ""}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    <Chip tone={p.participant_target && s.signedUp >= p.participant_target ? "ok" : "light"}>{p.participant_target ? `${s.signedUp} of ${p.participant_target} signed up` : `${s.signedUp} signed up`}</Chip>
                    {mine.length === 0 && <Chip tone="light">Empty</Chip>}
                  </div>
                </Card>
              </Link>
            );
          })}
          <Link href="/files?folder=unfiled">
            <Card className="flex h-full flex-col gap-2">
              <div className="flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-bg text-muted"><Icon name="folder" /></span><b className="font-heading text-lg">Unfiled</b></div>
              <p className="text-[13px] text-muted">{unfiled.length} recording{unfiled.length === 1 ? "" : "s"} not in a study yet.</p>
              {unfiled.some((f) => f.suggestion?.project_id) && <div className="mt-auto"><Chip>{unfiled.filter((f) => f.suggestion?.project_id).length} Muse suggestion{unfiled.filter((f) => f.suggestion?.project_id).length === 1 ? "" : "s"}</Chip></div>}
            </Card>
          </Link>
        </div>
      )}

      {!showFolders && files.length === 0 && <Card><p className="text-sm text-muted">{needle || kind ? "Nothing matches that search." : "Nothing in this folder yet. Add an interview with the round button."}</p></Card>}
      {!showFolders &&
        files.map((f) => {
          const [label, tone] = STATUS[f.status];
          const hit = snippet(f.transcript_text, q.trim());
          const suggested = !f.project_id && f.suggestion?.project_id ? project(f.suggestion.project_id) : null;
          return (
            <Link key={f.id} href={`/files/${f.id}`}>
              <Card className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-[15px]">{f.title}</b>
                  <Chip tone="light">{kindLabel[f.kind]}</Chip>
                  <Chip tone={tone}>{label}</Chip>
                  {suggested && <Chip>Muse suggests: {suggested}</Chip>}
                  <span className="flex-1" />
                  <span className="text-xs text-muted">{fmtDate(f.created_at.slice(0, 10))}</span>
                </div>
                <p className="text-[13px] text-muted">{[mins(f.duration_sec), person(f.person_id) ?? f.participant_label, !open && project(f.project_id)].filter(Boolean).join(" · ")}</p>
                {hit && <p className="text-[13px] italic">{hit}</p>}
              </Card>
            </Link>
          );
        })}
    </>
  );
}
