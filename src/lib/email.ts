import nodemailer from "nodemailer";

export type Mail = { to: string; toName: string; subject: string; html: string; replyTo?: string };
export type OutboxItem = Mail & { labId: string; at: string; mode: "sent" | "preview"; error?: string };

const g = globalThis as { __outbox?: OutboxItem[] };
const outbox = (g.__outbox ??= []);
export const getOutbox = (labId: string) => outbox.filter((m) => m.labId === labId).reverse();

export const appUrl = () => process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const gmail = () =>
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } })
    : null;

/**
 * Sends through Gmail SMTP. Addresses ending in .invalid (the demo people) are never sent, and without
 * Gmail credentials the message is only recorded. Every message is also kept in the lab's /outbox.
 */
export async function sendMail(m: Mail, labId: string): Promise<OutboxItem> {
  const item: OutboxItem = { ...m, labId, at: new Date().toISOString(), mode: "preview" };
  const transport = gmail();
  if (!transport) item.error = "Gmail is not configured";
  else if (m.to.toLowerCase().endsWith(".invalid")) item.error = "Demo address: not sent";
  else {
    try {
      await transport.sendMail({
        from: `"Handover" <${process.env.GMAIL_USER}>`,
        to: m.to,
        replyTo: m.replyTo,
        subject: m.subject,
        html: m.html,
      });
      item.mode = "sent";
    } catch (e) {
      item.error = e instanceof Error ? e.message.slice(0, 160) : "Email failed";
    }
  }
  outbox.push(item);
  if (outbox.length > 200) outbox.shift();
  return item;
}
