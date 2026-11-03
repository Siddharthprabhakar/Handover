import type { Mail } from "./email";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function layout(title: string, body: string, link: { href: string; label: string }, foot: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f2ee;font-family:Inter,Arial,sans-serif;color:#1b1a1f">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">
<div style="background:#fff;border-radius:20px;padding:32px">
<div style="margin-bottom:18px"><span style="display:inline-block;width:36px;height:36px;line-height:36px;text-align:center;border-radius:11px;background:#990000;color:#fff;font-weight:700">H</span> <b style="vertical-align:middle;margin-left:8px">Handover</b></div>
<h1 style="font-size:24px;line-height:1.3;margin:0 0 14px">${esc(title)}</h1>
${body}
<p style="margin:22px 0"><a href="${esc(link.href)}" style="background:#990000;color:#fff;text-decoration:none;padding:12px 20px;border-radius:99px;font-weight:600;display:inline-block">${esc(link.label)}</a></p>
<hr style="border:0;border-top:1px solid #e8e5df;margin:20px 0">
<p style="font-size:12px;color:#6f6d75;line-height:1.5;margin:0">${foot}</p>
</div></div></body></html>`;
}

const p = (s: string) => `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">${s}</p>`;
const FOOT = "Sent for Dr. Rivera&rsquo;s lab. Your professor sees what you share, and so do you.";

export function checkinEmail(o: { to: string; name: string; link: string; planned: string[]; projects: string[] }): Mail {
  const first = esc(o.name.split(" ")[0]);
  const plan = o.planned.length ? p("Last week you planned to:") + `<ul style="margin:0 0 12px;padding-left:20px;font-size:15px;line-height:1.7">${o.planned.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "";
  const more = o.projects.length > 1 ? p(`You are on ${o.projects.length} projects, so we will ask about all of them: ${o.projects.map(esc).join(" and ")}.`) : "";
  return {
    to: o.to, toName: o.name, subject: "Your weekly check-in",
    html: layout(`Hi ${first}, your weekly check-in`, p("It takes about 2 minutes, and a few words per box is plenty.") + plan + more, { href: o.link, label: "Open my check-in" }, `No login needed. This link is only for you. ${FOOT}`),
  };
}

export function reminderEmail(o: { to: string; name: string; link: string; number: number }): Mail {
  const first = esc(o.name.split(" ")[0]);
  return {
    to: o.to, toName: o.name, subject: "No rush: your check-in whenever you are ready",
    html: layout(`Hi ${first}, a gentle nudge`, p("Your check-in takes about 2 minutes. If you are stuck on something, that is a good thing to write down. It helps your professor help you.") + p(`<span style="color:#6f6d75">Reminder ${o.number} of 2. It stops as soon as you send your check-in.</span>`), { href: o.link, label: "Open my check-in" }, FOOT),
  };
}

export function handoffEmail(o: { to: string; name: string; link: string; project: string }): Mail {
  const first = esc(o.name.split(" ")[0]);
  return {
    to: o.to, toName: o.name, subject: "A few questions before you go",
    html: layout(`Thank you, ${first}`, p(`Dr. Rivera asked a few questions so the next person can pick up your work on ${esc(o.project)}. Answer in your own time and save a draft whenever you like.`) + p("There is also a short note of thanks waiting for you."), { href: o.link, label: "Open my questions" }, "Only your professor sees your answers until she shares the brief."),
  };
}
