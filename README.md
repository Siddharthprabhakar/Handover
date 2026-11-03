# Handover

**A weekly check-in that becomes a living project memory for research labs. When someone leaves, nothing is lost.**

Built solo for the Meta Global AI Developer Hackathon (Indie Developer track, theme: Build for Your World) by an HCI student who lives this problem: research assistants rotate between professors, and the professor who trained them loses everything they knew.

Everything in this repository was built during the hackathon window (Oct 27 – Nov 4, 2026).

## The problem

University labs track phases, people and tasks across chat threads, Drive folders and spreadsheets. Quiet students get stuck without saying so, RAs can be overloaded with no visible limit, and knowledge disappears when a student leaves.

## What it does

| Area | What you get |
|---|---|
| **Weekly check-in** | A no-login magic link. The RA answers the four questions the professor already asks, in two minutes. Last week's tasks show as a checklist, and an RA on two projects is asked about both. |
| **Journey map** | Every project is seven phases (lab study or master's thesis). Blockers an RA mentions appear on the right phase with their own words. |
| **Weekly digest** | Muse reads the week's check-ins and writes the digest: who is stuck (with a quote), who needs tasks, who is missing, what help people asked for. The professor edits and shares it. |
| **New project from a goal** | Describe a goal; Muse drafts phases, tasks and owners. The professor edits the plan. |
| **Handoff for a leaving RA** | Muse drafts questions from that person's own tasks, plus a kind thank-you note written only from completed work. The professor edits both, the RA answers in their own time, and Muse compiles the brief for the next person. |
| **Workload guard** | A cap of 5 tasks and 10 hours a week per RA. Going past it needs an overtime window (a reason and an end date, up to 14 days), followed by a recovery week with no new tasks. |
| **Reminders** | Friendly emails, at most two a week, that stop the moment someone submits. |

## Where Muse is used

All calls go through [`src/lib/muse.ts`](src/lib/muse.ts) on the server. The API key never reaches the browser, and every reply is validated against a schema ([`src/lib/schemas.ts`](src/lib/schemas.ts)) with one retry.

| Job | Input | Output |
|---|---|---|
| Parse a check-in | The RA's text and their projects | Done, blockers (quoted), next steps, support asked for, phase, needs tasks |
| Weekly digest | All check-ins and loads this week | Summary, stuck, needs tasks, missing, support requests |
| Plan from a goal | Goal, project type, deadline, who has room | Seven phases with tasks, hours and owners |
| Handoff questions + thanks | One person's tasks, blockers and check-ins | Sourced questions and a thank-you note |
| Handoff brief | History plus the RA's answers | Where things stand, contributions, code and backups, decisions, open work, unanswered |

Design rules: Muse only uses the data it is given, blocker quotes must appear in what the person wrote (checked in code), and a human approves everything Muse suggests. **The workload rules are plain code, not AI**, so they cannot be talked around.

## Honest status

- The Muse client is written against the Meta Model API's Chat Completions format ([`src/lib/muse.ts`](src/lib/muse.ts)). **Mock mode** (`MUSE_MOCK=1`, or no `MODEL_API_KEY`) uses rule-based stand-ins built from the real data, so the whole app runs without credits. Check the live mode before relying on it: set a key and open `/api/muse/smoke`.
- Data lives in memory (seeded, fake people) unless Supabase keys are set. Schema: [`supabase/schema.sql`](supabase/schema.sql). In memory, changes reset when the server restarts.
- Emails are never sent to the seeded addresses. Real delivery needs `RESEND_API_KEY` and `DEMO_EMAIL_TO`; otherwise messages show in `/outbox`.
- The demo is pinned to the week of Nov 2, 2026 ([`src/lib/demo.ts`](src/lib/demo.ts)).
- Not built: login and roles (the professor view is open), editing default limits, a client-facing read-only view, Slack/Teams import.

## Run it

```bash
npm install
cp .env.example .env.local   # works as-is in mock mode
npm run dev
```

Open http://localhost:3000. Useful links in the demo data:

- Professor: `/` (Lab overview), `/projects`, `/people`, `/workload`, `/checkins`, `/outbox`
- A check-in as a student: `/checkin/tok-emi-nov2` (Emi is on two projects, so she gets the second-project nudge)

### Environment

See [`.env.example`](.env.example). Key variables: `MODEL_API_KEY`, `MUSE_MODEL`, `MUSE_MOCK`, the three Supabase keys (then run `npm run seed` after applying `supabase/schema.sql`), `RESEND_API_KEY` + `DEMO_EMAIL_TO`, and `CRON_SECRET` for the reminder cron in [`vercel.json`](vercel.json).

## Tech

Next.js (App Router) · TypeScript · Tailwind · Supabase (Postgres) · Meta Model API · Resend · zod. Designed in Figma first; the screens match the design file.

## Docs

- [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md): architecture and build order
- [`docs/DEMO.md`](docs/DEMO.md): the 3-minute demo script
