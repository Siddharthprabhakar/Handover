import { recordings } from "@/lib/db";
import { findFile, resolveAccess } from "@/lib/files";

export const dynamic = "force-dynamic";

// Sends the professor to a short-lived signed link, so the bucket stays private.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await resolveAccess();
  if (!access) return Response.json({ error: "Sign in required" }, { status: 401 });
  const file = await findFile((await ctx.params).id, access);
  if (!file || !recordings) return Response.json({ error: "Not found" }, { status: 404 });
  const download = new URL(req.url).searchParams.has("download");
  const { data } = await recordings.createSignedUrl(file.storage_path, 300, download ? { download: `${file.title}.wav` } : undefined);
  if (!data) return Response.json({ error: "Audio not found" }, { status: 404 });
  return Response.redirect(data.signedUrl, 302);
}
