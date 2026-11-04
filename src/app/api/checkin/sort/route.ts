import { z } from "zod";
import { list } from "@/lib/db";
import { museJson } from "@/lib/muse";
import { voiceSortPrompt } from "@/lib/prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({ token: z.string().min(1), text: z.string().trim().min(1).max(6000) });

// Sorts a spoken check-in into the form's answers. The personal link is the credential, like the check-in itself.
// If Muse is down or returns more words than were spoken, the whole text goes under challenges and nothing is lost.
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { token, text } = body.data;
  const [checkin] = await list("checkins", { col: "token", eq: token });
  if (!checkin) return Response.json({ error: "Link not found" }, { status: 404 });
  if (checkin.submitted_at) return Response.json({ error: "Already submitted" }, { status: 409 });

  const plain = { challenges: text, plans: "", support: "", needs_tasks: false, sorted: false };
  try {
    const r = await museJson("voicesort", voiceSortPrompt(text), plain);
    const sorted = `${r.challenges} ${r.plans} ${r.support}`;
    if (sorted.length > text.length * 1.3 + 40) return Response.json(plain); // invented words
    // nothing the student said may disappear: a sentence that fits none of the questions (what they did this week, small talk) stays in the first answer
    const words = (s: string) => s.toLowerCase().match(/[a-z0-9']{3,}/g) ?? [];
    const have = new Set(words(sorted));
    const left = text.split(/(?<=[.!?])\s+/).filter((s) => { const w = words(s); return w.length > 0 && w.filter((x) => have.has(x)).length / w.length < 0.7; });
    if (left.length === 0 && sorted.trim() === "") return Response.json(plain);
    return Response.json({ ...r, challenges: [r.challenges, ...left].filter(Boolean).join("\n"), sorted: true });
  } catch (e) {
    console.error("Voice sort failed; the text stays whole:", e instanceof Error ? e.message : e);
    return Response.json(plain);
  }
}
