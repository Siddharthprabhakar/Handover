import { z } from "zod";
import { insert, list, update } from "@/lib/db";
import { WEEK } from "@/lib/lab";

export const dynamic = "force-dynamic";

const Body = z.object({ text: z.string().min(1).max(4000), share: z.boolean().optional() });

// Save the professor's edited digest and/or mark it shared with the lab.
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { text, share } = body.data;
  const existing = (await list("digests")).find((d) => d.week === WEEK);
  const shared_at = share ? new Date().toISOString() : (existing?.shared_at ?? null);
  if (existing) await update("digests", existing.id, { text, shared_at });
  else await insert("digests", { week: WEEK, text, shared_at });
  return Response.json({ ok: true, shared: Boolean(shared_at) });
}
