import { z } from "zod";
import { insert, list, update } from "@/lib/db";
import { buildContext, heuristicBrief, heuristicQuestions, type HQuestion } from "@/lib/handoff";
import { loadLab } from "@/lib/lab";
import { getSession } from "@/lib/session";
import { museJson } from "@/lib/muse";
import { briefPrompt, questionsPrompt } from "@/lib/prompts";
import { appUrl, sendMail } from "@/lib/email";
import { handoffEmail } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const Q = z.object({ id: z.string(), text: z.string().min(1).max(500), source: z.string().max(200), include: z.boolean() });
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("questions"), personId: z.string() }),
  z.object({ action: z.literal("send"), personId: z.string(), questions: z.array(Q).min(1).max(20), thanks: z.string().max(2000) }),
  z.object({ action: z.literal("answers"), token: z.string(), answers: z.record(z.string(), z.string().max(4000)), submit: z.boolean() }),
  z.object({ action: z.literal("brief"), handoffId: z.string() }),
  z.object({ action: z.literal("finish"), handoffId: z.string() }),
]);

const err = (message: string, status = 400) => Response.json({ error: message }, { status });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return err("Invalid request");
  const b = body.data;
  if (b.action === "answers") {
    // the student's personal link is the only credential here
    const [h] = await list("handoffs", { col: "token", eq: b.token });
    if (!h) return err("Link not found", 404);
    if (h.status === "saved") return err("This handoff is already saved", 409);
    await update("handoffs", h.id, { answers: b.answers, status: b.submit ? "answered" : "sent", ...(b.submit ? { brief: null } : {}) });
    return Response.json({ ok: true });
  }

  const session = await getSession();
  if (!session) return err("Sign in required", 401);
  const lab = await loadLab(session.labId);
  const handoffs = lab.handoffs;

  if (b.action === "questions") {
    if (!lab.byId.has(b.personId)) return err("Person not found", 404);
    const ctx = buildContext(lab, b.personId);
    try {
      const r = await museJson("questions", questionsPrompt(ctx), heuristicQuestions(ctx));
      return Response.json({
        questions: r.questions.map((q, i): HQuestion => ({ id: `q${i + 1}`, text: q.text, source: q.source, include: true })),
        thanks: r.thanks,
      });
    } catch (e) {
      return err(e instanceof Error ? e.message : "Muse failed", 502);
    }
  }

  if (b.action === "send") {
    const person = lab.byId.get(b.personId);
    if (!person) return err("Person not found", 404);
    const existing = handoffs.find((h) => h.person_id === b.personId);
    const projectId = lab.members.find((m) => m.person_id === b.personId)?.project_id;
    if (!projectId) return err("This person is not on a project");
    if (existing) {
      await update("handoffs", existing.id, { questions: b.questions, thanks: b.thanks, status: "sent" });
      await sendMail(handoffEmail({ to: person.email, name: person.name, link: `${appUrl()}/handoff/${existing.token}`, project: lab.projects.find((p) => p.id === projectId)?.name ?? "your project", professor: session.name, replyTo: session.email }), session.labId);
      return Response.json({ ok: true, token: existing.token });
    }
    const token = `hf-${crypto.randomUUID().replace(/-/g, "")}`;
    await insert("handoffs", { person_id: b.personId, project_id: projectId, questions: b.questions, thanks: b.thanks, answers: {}, brief: null, token, status: "sent" });
    await update("people", b.personId, { status: "leaving" });
    await sendMail(handoffEmail({ to: person.email, name: person.name, link: `${appUrl()}/handoff/${token}`, project: lab.projects.find((p) => p.id === projectId)?.name ?? "your project", professor: session.name, replyTo: session.email }), session.labId);
    return Response.json({ ok: true, token });
  }

  const h = handoffs.find((x) => x.id === b.handoffId);
  if (!h) return err("Handoff not found", 404);

  if (b.action === "brief") {
    const qs = ((h.questions as HQuestion[]) ?? []).filter((q) => q.include);
    const answers = (h.answers as Record<string, string>) ?? {};
    const qa = qs.map((q) => ({ question: q.text, answer: answers[q.id] ?? "" }));
    const ctx = buildContext(lab, h.person_id);
    try {
      const brief = await museJson("brief", briefPrompt(ctx, qa), heuristicBrief(ctx, qa));
      await update("handoffs", h.id, { brief });
      return Response.json({ brief });
    } catch (e) {
      return err(e instanceof Error ? e.message : "Muse failed", 502);
    }
  }

  await update("handoffs", h.id, { status: "saved" });
  return Response.json({ ok: true });
}
