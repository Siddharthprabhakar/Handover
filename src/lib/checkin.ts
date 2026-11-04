import type { z } from "zod";
import type { CheckinParse } from "./schemas";

export type Parsed = z.infer<typeof CheckinParse>;
export type ProjectInfo = { name: string; phase: number };

export type Answer = { projectName: string; challenges: string; plans: string; support: string; needsTasks: boolean; done?: string[]; skipped?: ("challenges" | "plans" | "support")[] }; // skipped: questions a voice check-in did not cover

/** Plain text the RA wrote, grouped by project. Muse and the fallback both read this. */
const SKIP_NAME = { challenges: "challenges", plans: "plans for next week", support: "support that would help" } as const;
export function composeText(answers: Answer[]): string {
  return answers
    .map((a) =>
      [
        `Project: ${a.projectName}`,
        a.done?.length ? `Finished from last week: ${a.done.join("; ")}.` : "",
        a.challenges && `Challenges: ${a.challenges}`,
        a.plans && `Plans for next week: ${a.plans}`,
        a.support && `Support that would help: ${a.support}`,
        a.needsTasks ? "I need more tasks." : "",
        ...(a.skipped ?? []).filter((k) => !a[k]).map((k) => `Not mentioned (${SKIP_NAME[k]}): the student did not cover this question in the voice check-in.`),
      ].filter(Boolean).join("\n"),
    )
    .join("\n\n");
}

const sentences = (s: string) => s.split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).filter(Boolean);
const BLOCKER = /\b(not sure|stuck|only \d+|haven'?t|can'?t|cannot|struggl|confus|blocked|taking longer|behind|problem|no replies?)\b/i;

/** Rule-based stand-in for Muse (mock mode). Quotes are always copied from the text. */
export function heuristicParse(text: string, projects: ProjectInfo[]): Parsed {
  const blocks = text.split(/^Project: /m).slice(1);
  const parts = blocks.length
    ? blocks.map((b) => ({ name: b.split("\n")[0].trim(), body: b.split("\n").slice(1) }))
    : [{ name: projects[0]?.name ?? "", body: text.split("\n") }];
  const DONE = /\b(ran|finished|completed|tagged|wrote|sent|posted|done|edited|transcribed|cleaned|updated)\b/i;
  return {
    projects: parts
      .map((p) => {
        const out = { done: [] as string[], blockers: [] as { quote: string }[], next: [] as string[], support: [] as string[], needs: false };
        for (const line of p.body) {
          if (/^Not mentioned \(/.test(line)) continue;
          const m = line.match(/^(Challenges|Plans for next week|Support that would help|Finished from last week):\s*(.*)$/);
          const label = m?.[1] ?? "Challenges";
          const value = m ? m[2] : line;
          if (/^i need more tasks/i.test(value)) { out.needs = true; continue; }
          if (label === "Finished from last week") out.done.push(...value.replace(/\.$/, "").split(";").map((x) => x.trim()).filter(Boolean));
          else if (label === "Plans for next week") out.next.push(...sentences(value));
          else if (label === "Support that would help") out.support.push(...sentences(value));
          else for (const sn of sentences(value)) { if (BLOCKER.test(sn)) out.blockers.push({ quote: sn }); else if (/would help|walkthrough|workshop|need help|guidance/i.test(sn)) out.support.push(sn); else if (/next week/i.test(sn)) out.next.push(sn); else if (DONE.test(sn)) out.done.push(sn); }
        }
        const info = projects.find((x) => x.name === p.name);
        return { project: p.name, done: out.done, blockers: out.blockers, next: out.next, support: out.support, phase: info?.phase ?? null, needs_tasks: out.needs || /need (more )?tasks|no plans/i.test(p.body.join(" ")) };
      })
      .filter((p) => p.done.length || p.blockers.length || p.next.length || p.support.length || p.needs_tasks),
  };
}

/** Keep only blocker quotes that really appear in what the person wrote. */
export function groundedQuotes(parsed: Parsed, raw: string): Parsed {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const hay = norm(raw);
  return { projects: parsed.projects.map((p) => ({ ...p, blockers: p.blockers.filter((b) => b.quote.trim() && hay.includes(norm(b.quote))) })) };
}
