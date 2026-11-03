# Demo script (3 minutes)

Record on a clean browser window at 1440 wide. Restart the server first so the seeded data is fresh (changes live in memory).

**Before recording:** claim credits, set a spend alert, set `MODEL_API_KEY` and `MUSE_MOCK=0`, open `/api/muse/smoke` and confirm `"mode":"live"`. If live Muse is not working, say so in the video and keep mock mode.

## Story: when a core person leaves, the lab keeps going

| Time | Screen | Say | Show |
|---|---|---|---|
| 0:00 | Title | "RAs rotate and the professor who trained them loses everything. Handover turns the weekly check-in into a living project memory." | Lab overview |
| 0:20 | Lab overview | "Muse read this week's check-ins." | Digest, Needs attention (Ben's own words), workload bars |
| 0:45 | Student check-in `/checkin/tok-emi-nov2` | "This is what a student sees: two minutes, no login, and she is asked about her second project too." | Fill and send; the "what we understood" page |
| 1:15 | Journey `/projects` → Wayfinding | "Her blocker is now on the right phase, in her words." | Red-ringed Interview phase, blocker callout |
| 1:35 | Digest | "The digest updated. I edit and share it." | Edit → Approve & share |
| 1:50 | Workload `/workload` | "Limits protect people. Ana is at 5 tasks." | Assign 4 h to Ana: guard, Farah suggestion, overtime form (reason + date), recovery week |
| 2:15 | People → Ben → Handoff | "Ben is leaving. Muse drafts questions from his own tasks and a thank-you note from what he finished." | Edit a question, add one, Send |
| 2:35 | Student handoff `/handoff/<token>` | "He answers in his own time." | Fill two answers, Submit |
| 2:50 | Brief | "The next person starts from his repos, backups and decisions." | Brief with code and backups, thank-you card |
| 3:00 | Close | "New project from a goal is in too. Built solo during the hackathon with Next.js, Supabase and the Meta Model API." | |

## Checklist

- Public repo, README states what was built during the hackathon
- Say which parts use Muse (README table) and that the workload rules are plain code
- Mention the privacy stance: students see what is shared, nothing is sent without approval
- Fake people only
- Submit on the CV platform before Wed Nov 4, 9:00 PM ET; post the demo on X for the community prize
