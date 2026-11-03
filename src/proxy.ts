import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate: refreshes the session cookies and sends people to the right screen. Every page and
// API route still checks the session itself (src/lib/session.ts); this is not the only protection.
const OPEN = ["/login", "/signup", "/checkin/", "/handoff/", "/api/checkin", "/api/handoff", "/api/files/", "/api/cron/", "/logout"];
const TOKEN_FLOWS = ["/checkin/", "/handoff/", "/api/checkin", "/api/handoff", "/api/files/", "/api/cron/", "/logout"];
const starts = (path: string, list: string[]) => list.some((p) => (p.endsWith("/") ? path.startsWith(p) : path === p || path.startsWith(`${p}/`)));

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.next(); // demo mode: no accounts

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (all) => {
        all.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        all.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const go = (to: string) => {
    const r = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  const path = request.nextUrl.pathname;
  // getClaims checks the token signature locally, with no round trip to Supabase on each click
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;
  if (!user) return starts(path, OPEN) ? response : go(`/login?next=${encodeURIComponent(path)}`);
  if (starts(path, TOKEN_FLOWS)) return response;

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const needsSetup = aal?.nextLevel === "aal1"; // no second factor yet: make them add one
  const needsVerify = aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2";
  if (needsSetup && !path.startsWith("/security/setup")) return go("/security/setup");
  if (needsVerify && !path.startsWith("/security/verify")) return go("/security/verify");
  if (!needsSetup && !needsVerify && (path === "/login" || path === "/signup" || path.startsWith("/security"))) return go("/");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
