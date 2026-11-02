# Handover: build plan

Source of truth for design: Figma file "Handover — UI" (Professor and Student pages). Product scope: see SPEC.md.
Hackathon deadline: Wed Nov 4, 9:00 PM ET. Everything in this repo is built during the hackathon window.

## 1. Architecture

| Layer | Choice | Notes |
|---|---|---|
| App | Next.js (App Router) on Vercel | Pages + route handlers in one project |
| Database + auth | Supabase Postgres | RLS off for the demo; one seeded lab |
| AI | Meta Model API, server side only | `MODEL_API_KEY` never reaches the browser |
| Email | Resend | Send only to the builder's own address in the demo |
| Reminders | Vercel cron hitting `/api/cron/reminders` | Fallback: a manual "send reminder" button |

Not verified yet: exact Muse model id available to our key, structured-output behaviour, cron limits on the Vercel plan. Check on day one.

## 2. Folder layout (src/)

```
app/
  (prof)/layout.tsx           professor shell (sidebar, 5 items)
  (prof)/page.tsx             Lab overview
  (prof)/projects/page.tsx    Projects list
  (prof)/projects/new/page.tsx  New project from a goal
  (prof)/projects/[id]/page.tsx Journey
  (prof)/people/page.tsx
  (prof)/people/[id]/handoff/page.tsx        questions, then brief
  (prof)/workload/page.tsx
  (prof)/checkins/page.tsx
  (student)/layout.tsx
  (student)/checkin/[token]/page.tsx         magic link, no login
  (student)/handoff/[token]/page.tsx
  api/
    checkin/route.ts          POST: save + Muse parse
    digest/route.ts           POST: weekly digest
    projects/plan/route.ts    POST: goal -> plan
    handoff/questions/route.ts
    handoff/brief/route.ts
    tasks/assign/route.ts     POST: enforces limits
    cron/reminders/route.ts
lib/
  muse.ts        one client: chat(), json(schema), mock mode
  prompts.ts     all prompts in one file
  schemas.ts     zod schemas for every Muse output
  limits.ts      pure functions: canAssign(), recoveryWeek()
  db.ts          supabase server client
  email.ts       Resend
components/      Card, Chip, Avatar, Journey, ActionBar, Sidebar
```

## 3. Data (Supabase)

```sql
create table people (id uuid primary key default gen_random_uuid(), name text, email text unique,
  role text check (role in ('professor','ra')), weekly_hours int default 10, max_tasks int default 5,
  status text default 'active', leaving_on date);
create table projects (id uuid primary key default gen_random_uuid(), name text, kind text check (kind in ('lab','thesis')),
  goal text, phase_template text[] , current_phase int default 1, deadline date);
create table project_members (project_id uuid references projects, person_id uuid references people, primary key (project_id, person_id));
create table tasks (id uuid primary key default gen_random_uuid(), project_id uuid references projects, phase int,
  title text, est_hours numeric, assignee uuid references people, status text default 'open', due date);
create table checkins (id uuid primary key default gen_random_uuid(), person_id uuid references people, week date,
  raw jsonb, parsed jsonb, token text unique, submitted_at timestamptz, reminders_sent int default 0);
create table blockers (id uuid primary key default gen_random_uuid(), project_id uuid references projects, phase int,
  person_id uuid references people, quote text, opened_at timestamptz default now(), resolved_at timestamptz);
create table overtime (id uuid primary key default gen_random_uuid(), person_id uuid references people,
  reason text, starts date, ends date check (ends - starts <= 14));
create table handoffs (id uuid primary key default gen_random_uuid(), person_id uuid references people, project_id uuid references projects,
  questions jsonb, thanks text, answers jsonb, brief jsonb, token text unique, status text default 'draft');
```

Seed: 1 professor, 6 RAs, 3 projects (2 lab, 1 thesis), 3 weeks of check-ins, 1 open blocker, 1 overtime row. All fake.

## 4. Rules in code (never in Muse)

`limits.ts`: `canAssign(person, task)` is false when open tasks >= max_tasks, or open hours + est_hours > weekly_hours, or the person is in a recovery week (the 7 days after an overtime period ends). Overtime needs a reason and a deadline, and is capped at 14 days. The API returns the reason so the UI can show it.

## 5. Muse jobs

All calls go through `lib/muse.ts`. Output is validated with zod; on failure retry once, then return a visible error. `MUSE_MOCK=1` returns saved JSON from `lib/mock/`.

| Job | Route | Input | Output schema |
|---|---|---|---|
| Parse check-in | `/api/checkin` | raw text + person's projects | per project: `done[]`, `blockers[{quote}]`, `next[]`, `support[]`, `phase`, `needs_tasks` |
| Missing-project nudge | `/api/checkin` | projects not mentioned | one short question per project |
| Weekly digest | `/api/digest` | all parsed check-ins this week | `on_track[]`, `stuck[{person,quote}]`, `needs_tasks[]`, `missing[]`, `support[]`, `summary` |
| Plan from goal | `/api/projects/plan` | goal, kind, deadline, people + load | `phases[{name,tasks[{title,hours,owner}]}]` |
| Handoff questions | `/api/handoff/questions` | leaving person's tasks, decisions, check-ins | `questions[{text,source}]` + `thanks` |
| Handoff brief | `/api/handoff/brief` | history + answers | `where_we_are`, `contributed`, `code_and_backups[]`, `decisions`, `open_work`, `advice`, `unanswered[]` |

Prompt rules (put at the top of every prompt): answer only from the provided data, never invent names or dates, quote the person's own words for blockers, keep the tone kind. The thank-you note uses completed work only.

## 6. Build order (about 10 hours)

| # | Stage | Hours | Done when |
|---|---|---|---|
| 1 | Supabase schema + seed, `lib/db`, `lib/muse` with mock mode | 1.5 | pages read seeded data |
| 2 | Shell + Lab overview + Projects + Journey (read-only) | 2.0 | click project -> journey with blocker dot |
| 3 | Check-in form (magic link) + Muse parse + blocker appears | 1.5 | submit text -> journey updates |
| 4 | Digest + Check-ins page | 1.0 | digest shows quote from real check-in |
| 5 | Plan from goal | 1.0 | goal -> editable draft -> project created |
| 6 | Handoff flow (questions -> answers -> brief) | 1.5 | brief matches answers |
| 7 | Workload guard + overtime modal | 0.5 | sixth task is blocked with reason |
| 8 | Email (Resend) + polish + README + 3-minute video | 1.0 | email arrives, video recorded |

Cut first if late: stage 7, then the real email (show the Figma/inbox mock instead).

## 7. Env vars (`.env.local`, never committed)

`MODEL_API_KEY`, `MUSE_MODEL`, `MUSE_MOCK`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`.

## 8. Day-one checklist

1. Confirm credits are on the Meta Billing page and set a Spend Limit alert.
2. One real Muse call returning valid JSON for the check-in schema.
3. Supabase project created and seed script run.
4. Repo public, first commit pushed, Vercel connected.
