import { list } from "@/lib/db";
import { WEEK } from "@/lib/demo";
import { toIcs } from "@/lib/meetings";

export const dynamic = "force-dynamic";

// The address a calendar app subscribes to. The long random token is the only credential, like a check-in link, so it can be pasted into Google Calendar or Outlook.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const lab = (await list("labs", { col: "calendar_token", eq: token.replace(/\.ics$/, "") }))[0];
  if (!lab) return new Response("Not found", { status: 404 });
  const [meetings, projects] = await Promise.all([list("meetings", { col: "lab_id", eq: lab.id }), list("projects", { col: "lab_id", eq: lab.id })]);
  const name = (id: string | null) => projects.find((p) => p.id === id)?.name ?? null;
  return new Response(toIcs(meetings, WEEK, lab.name, name), { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, max-age=300" } });
}
