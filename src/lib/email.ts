export type Mail = { to: string; toName: string; subject: string; html: string };
export type OutboxItem = Mail & { at: string; mode: "sent" | "preview"; error?: string };

const g = globalThis as { __outbox?: OutboxItem[] };
const outbox = (g.__outbox ??= []);
export const getOutbox = () => [...outbox].reverse();

export const appUrl = () => process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/**
 * The seeded people have made-up addresses, so real delivery needs DEMO_EMAIL_TO: every message is
 * redirected there with "[to Name]" in the subject. Without it (or without a Resend key) mail is
 * only recorded in the outbox preview at /outbox.
 */
export async function sendMail(m: Mail): Promise<OutboxItem> {
  const key = process.env.RESEND_API_KEY;
  const redirect = process.env.DEMO_EMAIL_TO;
  const item: OutboxItem = { ...m, at: new Date().toISOString(), mode: "preview" };
  if (key && redirect) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ from: process.env.RESEND_FROM ?? "Handover <onboarding@resend.dev>", to: [redirect], subject: `[to ${m.toName}] ${m.subject}`, html: m.html }),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) item.mode = "sent";
      else item.error = `Resend ${res.status}: ${(await res.text()).slice(0, 200)}`;
    } catch (e) {
      item.error = e instanceof Error ? e.message : "Email failed";
    }
  }
  outbox.push(item);
  if (outbox.length > 50) outbox.shift();
  return item;
}
