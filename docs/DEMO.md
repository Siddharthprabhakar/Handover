# Demo script (3 minutes)

**The one story:** a PhD student's study keeps going when the RA who ran it graduates. Handover turns weekly check-ins, interview recordings and plans into a project memory the next person can pick up, and Muse does the reading while plain code keeps the rules.

Position it as **human-subjects research that survives turnover**, not a project tracker. Lead with consent, interviews and the handoff; the dashboard is only the home screen.

## Before you hit record

1. `npm run verify:meta` prints `ok` for all 10 jobs plus speech-to-text, and the sidebar badge says **Muse live · Meta**.
2. Run `supabase/reset_data.sql`, then **Load demo lab** (People page). Fake people only; the demo addresses end in `.invalid` and never receive mail.
3. Have a 20 to 30 second voice sample ready (you speaking as a student), and a 1 to 2 minute interview recording (two voices) saved as a file. Use a real recording of yourself, never a real participant.
4. Browser at 1440 px wide, no bookmarks bar, notifications off. A terminal window ready in the repo folder.
5. Do one full dry run. Record in one take if you can; cut only dead air.

## Timeline

| Time | Screen | Say | Show |
|---|---|---|---|
| 0:00 | Lab overview | "Research assistants rotate. The professor who trained them loses what they learned. This is Handover, built solo on the Meta Model API." | Overview: digest, Needs attention (Ana's own words), tasks due, workload |
| 0:20 | Student link | "A student gets a personal link and no account. She can just talk." | Open the check-in link (People page or `/outbox`), tap record, speak 20 s, send. Meta Voice Transcribe fills the text; show the "what we understood" page |
| 0:50 | Files | "Interviews are recorded under consent and transcribed with speakers." | Record or upload the interview, show the consent box, the transcript with Interviewer and Participant, then **Analyse with Muse**: themes with exact quotes |
| 1:20 | Project, Evidence | "Across interviews, Muse finds themes per research question. Then code checks every quote." | **Synthesize**. Point at "N of N quotes verified" and the participant count per question (counted in code, not by the model) |
| 1:50 | People, Farah, Handoff | "Farah graduates in three weeks. Muse drafts questions from her own tasks and a thank-you from what she finished." | Handoff page, the **Study pack** (research questions, IRB, participants 3 of 12, evidence), Send |
| 2:15 | Workload | "Muse proposes, code enforces. Five tasks and ten hours a week per person." | Assign Ben a task: refused with the numbers and a suggestion of who has room. Show overtime (reason plus end date), the 20-hour hard cap and the recovery week |
| 2:40 | Terminal | "And the rules are tested, not just prompted." | `npm test`: 8 passing, including "a quote that is not in the transcript is removed" |
| 2:55 | Overview | "Weekly check-ins, interviews, plans and handoffs in one memory. Thank you." | End on the overview |

## Lines worth keeping

- "Muse reads. Code decides what stays." (quotes, participant counts, workload limits)
- "Nothing is sent without a person approving it."
- "The audio is transcribed by Meta's speech model; the recording stays in a private bucket."

## If something fails live

- Muse slow: say "Muse takes a few seconds to read," keep talking over it, cut in editing.
- Voice recording blocked: allow the microphone for the site and retry over https.
- A page looks empty: the demo lab was not loaded, or `reset_data.sql` was run after loading.

## Submission checklist

- Public repo, README explains what was built and how Meta is used
- Live link and the judge login in the submission notes
- Demo video, 3 minutes or less
- Submit before Wed Nov 4, 9:00 PM ET; post the video on X for the community prize
