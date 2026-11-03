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

- **Accounts:** professors sign up with a password and are required to add two-step sign-in (an authenticator app) before they can use the app. Each professor has their own lab and only sees its data. Students and RAs have no account: the professor invites them by email and they use personal links for check-ins and handoffs.
- **Muse** is written against the Meta Model API Chat Completions format (`src/lib/muse.ts`). With `MUSE_MOCK=1`, or no key, rule-based stand-ins built from the real data are used. Check live mode by signing in and opening `/api/muse/smoke`.
- **Email** goes through Gmail SMTP (`GMAIL_USER`, `GMAIL_APP_PASSWORD`). Addresses ending in `.invalid` (the demo data) are never sent. Every message is also shown at `/outbox`.
- Without Supabase keys the app runs as an in-memory demo with sample people (no sign-in).
- Not built: student accounts and screens, editing the default limits, a client-facing view, Slack/Teams import. Sign-up is open to anyone.

## Run it

```bash
npm install
cp .env.example .env.local   # then add your Supabase and Gmail values; run the SQL in supabase/schema.sql first
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
