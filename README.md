# Handover

**Human-subjects research that survives turnover.** Handover turns a research lab's weekly check-ins, interview recordings and project plans into a living project memory, so when a student graduates or a research assistant moves on, nothing they learned walks out the door.

Built solo for the Meta Global AI Developer Hackathon (Indie Developer track, theme: Build for Your World), by an HCI student who lives this problem. Everything in this repository was built during the hackathon window.

- **Live demo:** https://handover-dusky.vercel.app/
- **Judge login (no authenticator code needed):** `judge@handover.demo` / `MetaMuse2026`
- **Demo video:** https://youtu.be/5ULRvvWC-4g

## The problem

HCI and social-science labs run on students who rotate every year or two. What they know lives in chat threads, Drive folders, consent forms and their heads. Quiet students get stuck without saying so, research assistants get overloaded with no visible limit, interview evidence is scattered across recordings, and when someone leaves, the next person starts over.

## What it does

| Area | What you get |
|---|---|
| **Weekly check-in** | A personal link, no account. Students answer four short questions by typing or by **talking**; Meta Voice Transcribe turns speech into text. Blockers appear on the right phase of the project in the student's own words. |
| **Weekly digest** | Muse reads the week's check-ins and writes who is stuck, who needs tasks, who is missing and what help people asked for. The professor edits and approves before anything is shared. |
| **Interviews** | Record or upload an interview under a consent gate. Meta transcribes it with speaker labels, and Muse suggests which study it belongs to. The professor accepts or ignores the suggestion. |
| **Evidence** | Muse analyses one interview into themes with exact quotes, then synthesizes across interviews per research question. Every quote is checked against the transcripts in code. |
| **Studies** | Phases with due dates, research questions, IRB status, participant target and a sign-up roster by label (P1, P2, never names). Import a plan from a Word or Excel file and Muse turns it into editable phases and tasks. |
| **Handoff** | When someone leaves, Muse drafts questions from that person's own tasks and a thank-you written only from completed work. The leaver answers in their own time, and the next person gets a brief plus a **Study pack** with research questions, IRB, participant progress and evidence. |
| **Workload guard** | Five tasks and ten hours a week per person. Going past it needs an overtime window (a reason and an end date, up to 14 days), then a recovery week with no new tasks. Nobody goes past 20 hours. |
| **Calendar** | Weekly meetings per project, an `.ics` feed for Google Calendar, Outlook or Teams, and read-only subscriptions to your own calendars. |

## How Meta's models are used

Every call goes through [`src/lib/muse.ts`](src/lib/muse.ts) on the server, so the API key never reaches the browser. Muse jobs use the OpenAI-compatible Chat Completions endpoint of the Meta Model API with `muse-spark-1.3`, and ask the model for **structured output**: the JSON schema is generated from the same zod schema the app validates against ([`src/lib/schemas.ts`](src/lib/schemas.ts)). Audio goes to Meta's Voice Transcribe endpoint (`/asr/transcribe`) with speaker diarization for interviews.

| Job | Input | Output |
|---|---|---|
| `checkin` | A student's answers and their projects | Done, blockers (quoted), next steps, support asked for, needs tasks |
| `digest` | All check-ins and loads this week | Summary, stuck, needs tasks, missing, support requests |
| `plan` | A goal, project type, deadline, who has room | Phases with tasks, hours and owners |
| `projectplan` | A Word, Excel or text plan | Editable phases with dates, tasks, resources, communication notes |
| `interview` | One transcript | Summary, themes with quotes, follow-up questions |
| `synthesis` | Every transcript in a study and its research questions | Themes per question with quotes, coverage, gaps |
| `filing` | A new transcript and the lab's studies | A suggested study and title, with the reason |
| `questions`, `brief` | A leaver's tasks, blockers, check-ins, answers | Sourced questions, thank-you note, handoff brief |
| `summary` | A project's history | Where the project stands |
| Speech to text | A 16 kHz mono WAV | Transcript with speakers (voice check-ins and interviews) |

`npm run verify:meta` runs all ten jobs and the speech call once against the configured model and prints `ok` or `FAILED` for each. On Meta they all pass.

## AI proposes, code enforces

Muse never decides anything that matters. These are plain code, with tests (`npm test`):

- **Quotes must exist.** A blocker or evidence quote is kept only if it appears word for word in what the person said. A theme with no surviving quote is dropped, and the Evidence card shows "N of M quotes verified".
- **Counts come from code.** Participants per research question and "x of 12 signed up" are computed from the records, never taken from the model.
- **Workload limits are rules,** re-checked on the server for every assignment.
- **A person approves everything Muse suggests:** the digest, the plan, the filing suggestion, the handoff questions.
- **Consent first.** An interview cannot be uploaded without a participant label and a consent confirmation.
- **A budget.** Model calls are capped per hour so a loop or a curious click cannot drain the credits.

## Architecture

Next.js 16 (App Router, TypeScript, Tailwind v4) on Vercel. Supabase for Postgres, Auth (password plus TOTP two-factor for professors) and a private Storage bucket for recordings. Row-level security is on for every table with no policies, so only the server can read or write, and every lab-scoped route checks the signed-in professor's lab. Students use unguessable personal links. Email goes through Gmail SMTP. Documents are read with `mammoth` (.docx) and `read-excel-file` (.xlsx).

## Run it

```bash
npm install
cp .env.example .env.local        # fill in Supabase, the Meta key and Gmail values
npm run check                     # prints set/missing for each variable, never a value
npm run verify:meta               # runs every Muse job once
npm test                          # workload rules and quote grounding
npm run dev                       # http://localhost:3000
```

1. In the Supabase SQL editor run `supabase/schema.sql`, then `schema_v3.sql` through `schema_v11.sql` in order. `verify.sql` checks that every update is in place.
2. Sign up at `/signup` and add an authenticator app when asked.
3. The judge account already has the demo lab loaded: made-up people, three projects, check-ins, meetings and interview transcripts. To load it into your own lab, run `fetch("/api/demo", { method: "POST" })` in the browser console while signed in. `supabase/reset_data.sql` clears it again.

Environment variables are listed in [`.env.example`](.env.example). `MODEL_API_KEY` is the Meta key, `MUSE_MODEL=muse-spark-1.3`, `MUSE_MOCK=0` turns live mode on. Set `JUDGE_EMAIL` to let one shared account skip the authenticator code.

## Honest status

- Tested live on the Meta Model API: all ten Muse jobs and the speech-to-text call (`npm run verify:meta`). Voice recording is checked on desktop Chrome; mobile Safari is not verified yet.
- Demo data is fake. Never put real participant audio or names into a hosted demo.
- Not built: student accounts (they use links), Slack or Teams import, per-lab editing of the default limits. Sign-up is open to anyone, and public token routes have no per-link rate limit. [`docs/SECURITY_TODO.md`](docs/SECURITY_TODO.md) lists what was found and what is still open.
- The calendar feed addresses people paste are stored as plain text.

## Docs

[`docs/DEMO.md`](docs/DEMO.md) is the three-minute demo script. [`docs/SECURITY_TODO.md`](docs/SECURITY_TODO.md) is the security backlog. [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) is the original plan and is partly out of date.
