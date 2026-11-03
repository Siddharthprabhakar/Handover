import { findFile, resolveAccess } from "@/lib/files";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const access = await resolveAccess(q.get("token"));
  if (!access) return Response.json({ error: "Sign in required" }, { status: 401 });
  const file = await findFile(q.get("id") ?? "", access);
  if (!file) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ status: file.status, text: file.transcript_text, error: file.error });
}
