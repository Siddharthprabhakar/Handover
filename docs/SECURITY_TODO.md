# Security and robustness backlog

Things found in the audit and while building. Nothing here is fixed yet unless it says so. Ordered by how much it matters.
Checked against the code on Nov 3, 2026. "Not verified" means I believe it but did not prove it.

## Fix before the submission (small, high value)

1. **Open redirect after sign-in** (`src/components/auth/LoginForm.tsx:27`)
   The check is `next.startsWith("/")`. A link like `/login?next=//evil.example` passes it and sends the person to another site after they sign in.
   Fix: accept only paths that start with a single `/` and not `//` or `/\`.

2. **Handoff links are too short to be secret** (`src/app/api/handoff/route.ts:67`)
   The token is `hf-` plus 8 hex characters (32 bits). Check-in links already use a full UUID.
   Fix: `hf-${crypto.randomUUID().replace(/-/g, "")}`. Old links keep working; only new ones change.

3. **Blockers can be lost on a failed save** (`src/app/api/checkin/route.ts`, the Muse upgrade step)
   The quick blockers are deleted first, then the Muse ones are inserted. If the insert fails, the person's blockers are gone.
   Fix: insert the new ones first, then delete the old ones.

4. **The week and today are frozen when the server starts** (`src/lib/demo.ts`)
   `TODAY` and `WEEK` are computed once when the process loads. A long-lived server shows last week's data after Monday, and the weekly cron may label rows with the old week.
   Fix: make them functions called per request. Most pages import the constants, so this touches many files.

5. **Open sign-up** (`src/components/auth/SignupForm.tsx`)
   Anyone who finds the URL can create labs without limit.
   Fix: an invite code in an env variable, or restrict to university email domains.

## Soon

6. **No rate limiting on the public token routes** (`/api/checkin`, `/api/handoff`, `/api/files/*`)
   A leaked link can be hit in a loop. Files are capped at 5 per check-in, but transcription can be re-triggered, which burns the model quota (25 a day on Gemini's free tier).
   Fix: a per-token limit, for example with Upstash or a small table.

7. **Document import can be zip-bombed** (`src/lib/docs.ts`)
   The 4 MB limit applies to the compressed upload. A .docx or .xlsx is a zip, and mammoth and read-excel-file unpack it in memory.
   Fix: cap the uncompressed size, or run the parse with a time limit.

8. **Calendar feed addresses are stored in plain text** (`calendar_links.url`)
   They are secret addresses for a person's calendar. Anyone with database read access can see them.
   Fix: encrypt at rest with a server key, or store only a hash plus fetch on demand.

9. **The lab calendar feed address cannot be rotated** (`labs.calendar_token`)
   If it leaks, there is no way to change it.
   Fix: a "Reset address" button that writes a new token.

10. **DNS rebinding on pasted calendar feeds** (`src/lib/ics-import.ts`)
    The host is checked, then fetched again, so a hostile DNS server could answer differently the second time. Marked as a shortcut in the code.
    Fix: connect to the address that was checked, or use a fetch that pins the IP.

11. **A removed user stays signed in for up to a minute** (`src/lib/session.ts`, the `known` cache)
    Safe for display names, but a deleted account keeps working for the cache window.
    Fix: shorten the window, or skip the cache for write routes.

12. **Prompt injection in uploaded text**
    Documents, transcripts and check-ins are given to the model as data. Muse has no tools and every result is validated and reviewed by a person, so the risk is wrong text, not actions.
    This changes the moment an agent with tools (assigning tasks, sending email) is added. Keep "AI proposes, code enforces".

## Later

13. **Muse routes may lack a time limit** (digest, plan, summary): not verified. Only `checkin`, `files/transcribe`, `demo` and a few others set `maxDuration`.
14. **The sent-emails page is per server instance**, so it can look empty after a deploy. Emails still go out.
15. **Gemini free tier may use prompts to improve Google's products.** Use fake or consented data only, and move to Meta before any real interview audio.
16. **No automated tests.** The access check in `src/lib/files.ts` and the limit rules in `src/lib/limits.ts` should each have one.
17. **`npm audit` reports advisories** after the last installs. Not triaged.
18. **README.md and docs/BUILD_PLAN.md are out of date** (they mention Resend, `DEMO_EMAIL_TO` and `npm run seed`).

## Already in place

- Row-level security is on for every table with no policies, so only the server (service role) can read or write.
- Every professor route checks the session, and every lab-scoped read checks the lab id.
- Two-factor sign-in is enforced; deleting a project needs a fresh authenticator code.
- Recordings sit in a private bucket with 5-minute signed links, a 12 MB limit and WAV only.
- Calendar feed fetching refuses non-https and private addresses, and never follows redirects.
- Keys stay on the server; `.env*` files are never committed.
