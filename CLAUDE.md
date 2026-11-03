# Handover: notes for Claude

@AGENTS.md

## Secrets: do not read env files

**Never open, read, search, print, copy or summarise any `.env*` file** (`.env.local`, `.env`, `.env.production`, and so on). That includes `cat`, `type`, `Get-Content`, the Read tool, Grep/Glob that would surface their contents, and editors. Do not echo environment variables in commands or logs, and do not ask the user to paste a key into chat.

- `.env.example` is the only env file you may read. It lists variable names with empty values.
- To find out whether config works, run the app or a script that tests the connection and prints only `set`/`missing` or `ok`/`failed`, never the values. Example: `npm run check`.
- Never commit secrets. `.env*` is git-ignored except `.env.example`. If a value could have leaked into a commit, tell the user so they can rotate it.
- The Supabase service-role key and the Meta API key must stay on the server. Never use them in a client component or a `NEXT_PUBLIC_*` variable.

## What this is

Handover: a weekly check-in that becomes a living project memory for research labs. Professors run a lab, invite RAs and students by email, and Muse (Meta Model API) turns check-ins into a digest, drafts project plans, and runs a kind handoff when someone leaves. Built solo for the Meta Global AI Developer Hackathon (deadline Wed Nov 4, 2026, 9:00 PM ET). Everything here was built during the hackathon window.

Docs: `README.md`, `docs/BUILD_PLAN.md`, `docs/DEMO.md`. Design source: the Figma file "Handover — UI" (Professor and Student pages).

## Stack and commands

Next.js 16 (App Router, TypeScript, Tailwind v4), Supabase (Postgres + Auth), Meta Model API, nodemailer (Gmail SMTP), zod. This Next.js version differs from older ones: read the matching guide in `node_modules/next/dist/docs/` before using an unfamiliar API (route handlers, `params`/`searchParams` are Promises, `PageProps<"/route">` helpers).

```
npm run dev        # dev server
npm run build      # production build (also type-checks)
npx next typegen   # regenerate route types if PageProps types go stale
npx tsc --noEmit   # type check
npx eslint         # lint (react-hooks rules are strict: no components defined during render)
```

Windows shell. In Bash use `/d/MetaMuse/handover`. Temp files for node scripts must use relative paths inside the repo (and be deleted), because `/tmp` differs between Bash and Node.

## Architecture rules

- **All data goes through `src/lib/db.ts`** (`list`, `insert`, `update`). It uses Supabase when its env vars are set and falls back to in-memory seed data otherwise.
- **Muse is called only from the server**, through `src/lib/muse.ts` (`museJson(job, prompt, fallback)`), and every reply is validated with a zod schema in `src/lib/schemas.ts`. Prompts live in `src/lib/prompts.ts`. `MUSE_MOCK=1` or no key uses rule-based fallbacks.
- **Workload rules are plain code, never AI**: `src/lib/limits.ts` (5 tasks, 10 hours a week, overtime up to 14 days with a reason, then a recovery week). The server re-checks them on every assignment.
- **Blocker quotes must appear in what the person wrote** (`groundedQuotes` in `src/lib/checkin.ts`). Muse only uses the data it is given.
- Humans approve everything Muse suggests. The thank-you note in a handoff is written only from completed work.
- Check-ins and handoffs use personal token links (no login for RAs). Professors sign in.
- Never email made-up addresses. Seed people use fake emails; real mail goes only through `sendMail` in `src/lib/email.ts`.

## Status

- `demo-v1` (git tag): the working concept with mock data and no accounts. Fallback for the submission.
- Built: real accounts (Supabase Auth, password + TOTP 2FA enforced in `src/proxy.ts` and `getSession`), one lab per professor (`labs`, `lab_id`), people invited by email with personal links, Gmail SMTP, real dates, sample projects, Muse project summary. Without Supabase env vars the app runs as an in-memory demo.
- Tested live against Supabase: sign-up, 2FA, invites, check-ins, digest, handoff, tenant isolation. Not yet verified: live Muse (MUSE_MOCK=1 until the user flips it), delivery of real email, Vercel deploy.

## Style

Match the surrounding code: small files, plain functions, comments only for the why. Colours and fonts come from the Tailwind tokens in `src/app/globals.css` (crimson `#990000`). Keep the UI calm and plain; no scores or labels on people.
