import Link from "next/link";
import type { StoredSynthesis } from "@/lib/synthesis";
import { fmtDate } from "@/lib/format";
import { Card, Chip, type Tone } from "./ui";

const IRB: Record<string, [string, Tone]> = { pending: ["IRB: submitted, waiting", "warn"], approved: ["IRB: approved", "ok"], exempt: ["IRB: exempt or not needed", "ok"] };

export type StudyPackData = {
  id: string;
  name: string;
  goal: string | null;
  phase: string;
  phaseNumber: number;
  phaseCount: number;
  irbStatus: string | null;
  irbRef: string | null;
  irbDate: string | null;
  target: number | null;
  recruited: number;
  transcribed: number;
  questions: string[];
  synthesis: StoredSynthesis | null;
};

/** What the next person inherits besides the leaver's own notes: the study itself. Built from the records by code, so nothing in it is invented. */
export function StudyPack({ p }: { p: StudyPackData }) {
  const s = p.synthesis;
  return (
    <Card className="flex flex-col gap-3.5 !p-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="font-heading text-xl font-bold">Study pack</h2>
        <Chip tone="light">{p.name}</Chip>
        <span className="flex-1" />
        <Link href={`/projects/${p.id}`} className="text-[13px] font-semibold text-crimson">Open the study</Link>
      </div>
      <p className="text-[13px] text-muted">The study the next person takes over. It comes from the project records, not from {`the leaver's`} answers.</p>
      {p.goal && <p className="text-sm leading-relaxed">{p.goal}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Chip>Phase {p.phaseNumber} of {p.phaseCount} · {p.phase}</Chip>
        {p.irbStatus ? <Chip tone={IRB[p.irbStatus][1]}>{IRB[p.irbStatus][0]}</Chip> : <Chip tone="warn">IRB not recorded</Chip>}
        {p.irbRef && <span className="text-[13px]">{p.irbRef}</span>}
        {p.irbDate && <span className="text-[13px] text-muted">decided {fmtDate(p.irbDate)}</span>}
        <Chip tone="light">{p.recruited}{p.target ? ` of ${p.target}` : ""} participants recorded · {p.transcribed} transcribed</Chip>
      </div>

      <div>
        <b className="mb-1 block text-xs text-crimson">Research questions</b>
        {p.questions.length === 0 ? <p className="text-sm text-muted">None written down yet. Add them in Study setup.</p> : <ol className="list-decimal space-y-0.5 pl-5 text-sm leading-relaxed">{p.questions.map((q) => <li key={q}>{q}</li>)}</ol>}
      </div>

      <div>
        <b className="mb-1 block text-xs text-crimson">What the interviews say so far</b>
        {!s ? (
          <p className="text-sm text-muted">Not synthesized yet. Run Synthesize on the study page so the next person starts from the evidence.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {s.coverage.map((c) => <div key={c.rq} className="text-sm"><b className="font-semibold">Question {c.rq}:</b> {c.participants} of {s.based_on} participants. <span className="text-muted">{c.note}</span></div>)}
            {s.themes.slice(0, 5).map((t) => (
              <div key={t.title} className="rounded-[14px] bg-bg p-3 text-sm">
                <b className="font-semibold">{t.title}</b>
                <span className="text-muted"> · {t.summary}</span>
                {t.evidence[0] && <blockquote className="mt-1.5 border-l-2 border-crimson pl-3 italic">&ldquo;{t.evidence[0].quote}&rdquo; <span className="not-italic font-semibold text-muted">· {t.evidence[0].participant}</span></blockquote>}
              </div>
            ))}
            {s.gaps.length > 0 && <p className="text-[13px]"><b className="font-semibold">Still to find out:</b> {s.gaps.join("; ")}.</p>}
          </div>
        )}
      </div>
    </Card>
  );
}
