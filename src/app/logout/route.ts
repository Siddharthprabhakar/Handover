import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) await (await createServerSupabase()).auth.signOut();
  return NextResponse.redirect(new URL("/login", req.url), 303);
}
