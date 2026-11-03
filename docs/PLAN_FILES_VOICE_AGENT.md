# Plan: Files + voice, structured output, agent

Status: PLAN ONLY. Nothing here is built. Facts below were checked live against the Meta Model API on Nov 2.

## 1. Facts we verified (so we build on proof, not guesses)

| Ability | Result |
|---|---|
| Transcribe (`POST {base}/asr/transcribe`) | Works. Multipart: part `request` (JSON: `model`, `audioEncoding: "WAV"`, `mode`) and part `audio` (WAV). Reply: `sessionId, transcript, audioDurationMs, turns[]`. |
| Audio rules | WAV only, mono, 16-bit, 16 kHz or 24 kHz. Max 10 minutes and 32 MB per request. Phone/browser recordings are not WAV, so the browser must convert. |
| Speed | 17 to 23 seconds of audio took 3.5 to 8 seconds. A 10-minute file will take minutes, so it must run in the background. |
| Speakers | `DIARIZATION` labelled a two-voice interview correctly (A and B). A single voice gets no label. |
| Quality | Good. It sometimes repeats a word ("joining. joining."), so transcripts must be editable. |
| Structured output | Works. `response_format: { type: "json_schema", json_schema: { name, schema } }`, schema made from our zod types. Valid first try. |
| Tool calling | Works on Chat Completions (`tools`, `finish_reason: "tool_calls"`, reply with `role: "tool"`). Only `tool_choice: "auto"`. |
| Prompt caching | Not seen in a quick test (cached tokens stayed 0). We will not rely on it. |
| Price | Standard: $1.25 in / $4.25 out per million tokens. Voice: $0.18 per hour (a 10-minute interview costs about 3 cents). Contributor mode is about 12x cheaper but lets Meta train on the content, so use it only with fake data. |

Cost note: our calls use under 2,000 tokens, which is well under 1 cent each. A "50 cents per request" charge does not match that. It is probably the $0.50 card hold; check Billing > usage before assuming each call costs that.

## 2. Build order

| Step | What | Time | Why this order |
|---|---|---|---|
| A | Native structured output + longer history in the summary | 1.5 h | Small, lowers cost and retries, and the summary will later include interview transcripts |
| B | Files section + voice check-in + interview recording | 6 h | The biggest visible new Muse ability |
| C | Agent that proposes assignments and nudges | 4.5 h | Optional. Decide after B is deployed and working |
| D | Deploy to Vercel, test on a phone, README, video | 3 h | Must start by Tuesday midday |

Deadline: Wed Nov 4, 9:00 PM ET.

## 3. Step A: structured output + long history

- `museJson` sends `response_format` built with `z.toJSONSchema(schema)`. We keep the zod check, but the "Return JSON" boilerplate goes and the retry only covers network errors.
- The project summary reads all check-ins (not the last 6), resolved blockers, and interview transcripts for that project. It shows "Based on N check-ins and M recordings". The text is trimmed from the oldest end if it gets too long.

## 4. Step B: Files and voice

### What users see
- **Student check-in (personal link):** a "Record instead" button. Up to 2 minutes. The transcript appears in a box they can edit, then Send. It goes through the same reading as a typed check-in.
- **Professor, new "Files" page** in the sidebar: every recording in one list (title, type, project, person or participant, length, status, date), filters, and search inside transcripts.
- **File detail:** audio player, transcript with speaker names you can rename (A becomes "Interviewer", B becomes "P3"), link it to a project or person, **Analyze with Muse** (themes with quotes that must appear in the transcript, like our check-in rule), download as text, delete.
- **Add a recording:** record live (interview) or upload any audio file. A consent box and a participant label ("P3", no real names) are required.

### How it works
- **Recording:** the browser records, then converts to 16 kHz mono WAV itself (no server tools needed).
- **Upload:** straight from the browser to a private Supabase Storage bucket with a short-lived signed link. Vercel limits request bodies to about 4.5 MB, so audio cannot pass through our server.
- **Transcribing:** the server downloads the file from Storage, sends it to Muse, and saves the transcript. It runs after the response (`after()`), and the page shows "Transcribing…" until it is ready.
- **Students have no accounts:** the signed upload link is created from their personal check-in token and only allows their own folder.
- **Security:** bucket is private. Playback uses signed links that expire. A professor sees only their own lab's files.

### Data (SQL you run once, as `supabase/schema_v3.sql`)
- Table `files`: id, lab_id, kind (`voice_checkin` | `interview` | `upload`), person_id, project_id, checkin_id, title, storage_path, duration_sec, size_bytes, consent (bool), participant_label, transcript (jsonb), transcript_text (for search), analysis (jsonb), status, error, created_at.
- Storage bucket `recordings` (private), created by the same SQL.

### Limits we will state in the UI
- 10 minutes per recording (a Muse limit). Longer interviews are recorded in parts.
- Very long files can take minutes to transcribe.
- Supabase free storage is 1 GB, about 9 hours of audio.

## 5. Step C: the agent (only if B is done and deployed)

- A "Plan my week" button on Workload. Muse gets tools: `get_workload`, `get_checkin_status`, `list_unassigned_tasks`, `check_assignment`, `propose_assignment`, `propose_nudge`.
- `check_assignment` runs our existing limits code. If a proposal breaks a limit, the tool says no and Muse must try another person. That is the "AI proposes, code enforces" story.
- It runs up to 8 turns in the background (about 20 seconds). The screen shows the steps, then a list of proposals with Approve buttons.
- Approving an assignment uses the existing assign route, so limits are checked again. Approving a nudge sends the email.
- New table `agent_runs` (steps and proposals).

## 6. Risks to watch

- Phone recording needs HTTPS, so we test on the deployed site. On a laptop, localhost works.
- iPhone Safari recording and conversion is the least certain part. We test it on a real phone.
- Vercel function time limits for transcribing long files are unverified.
- Interview audio is sensitive. We store it privately and require consent. Do not use contributor mode with real recordings.
- Muse sometimes repeats words, so we never treat a transcript as final without a way to edit it.

## 7. Decisions (Nov 2)

- Voice check-in: the student reviews and edits the transcript, then sends.
- Voice check-in audio is kept and appears in Files.
- Agent nudges are emailed only after the professor approves them.
- Order: A, then B, deploy and test on a phone, then decide on C.
