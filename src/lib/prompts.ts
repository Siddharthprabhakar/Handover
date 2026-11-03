// All Muse prompts live here. Later stages add the rest of the jobs.
export const SYSTEM = `You are Muse inside Handover, a tool that helps a research lab keep projects going when people change.
Rules:
- Use only the data provided. Never invent names, dates, repos or numbers.
- Quote a person's own words for blockers. Do not label or judge people.
- Keep a kind, plain tone.
- Reply with one JSON object only, no markdown, matching the shape described.`;

export function checkinPrompt(text: string, projects: { name: string; phases: string[] }[]) {
  return `A research assistant wrote this weekly check-in:
"""${text}"""

Their projects: ${JSON.stringify(projects)}

Return JSON: {"projects":[{"project": string (one of their project names),"done": string[],"blockers":[{"quote": string copied from the text}],"next": string[],"support": string[],"phase": number|null (1-based index into that project's phases),"needs_tasks": boolean}]}
Only include projects the text actually talks about. If the text mentions no blocker, use an empty array.`;
}

export function digestPrompt(
  rows: { name: string; projects: string[]; checkin: string | null; reminders: number; openTasks: number; hours: number; weeklyHours: number }[],
  blockers: { person: string; project: string; quote: string }[],
) {
  return `This week's check-ins for the lab:
${JSON.stringify(rows)}
Open blockers: ${JSON.stringify(blockers)}

Return JSON: {"summary": string (3-4 plain sentences),"on_track": string[] (names),"stuck":[{"person": name,"quote": exact words from their check-in}],"needs_tasks": string[] (names who asked for tasks),"missing": string[] (names with no check-in),"support": string[] (what people asked help with, names in brackets)}.
Use only names that appear in the data.`;
}

export function planPrompt(input: { kind: string; name: string; goal: string; deadline: string; phases: readonly string[]; people: { name: string; openTasks: number; hours: number; weeklyHours: number }[] }) {
  return `A professor wants to start a new ${input.kind} project.
Name: ${input.name}
Goal: ${input.goal}
Deadline: ${input.deadline || "not set"}
Phases, in order (use exactly these, exactly ${input.phases.length}): ${JSON.stringify(input.phases)}
People who could work on it, with their current load: ${JSON.stringify(input.people)}

Return JSON: {"phases":[{"name": string (one of the phases above, in order),"tasks":[{"title": string,"hours": number,"owner": string|null (a name from the list, or null)}]}]}
Give each phase 1-3 concrete tasks. Hours are realistic estimates. Phase 1 tasks are assigned now, so give them only to people with room (open tasks under 5, hours under their weekly limit); later phases can use any listed person.`;
}

export function questionsPrompt(ctx: unknown) {
  return `A research assistant is leaving the lab and the professor wants a handoff. Here is everything we know about them:
${JSON.stringify(ctx)}

Return JSON: {"questions":[{"text": string,"source": string}],"thanks": string}
- 6 to 8 questions that help the next person take over: repos and what changed, where recordings/files/trackers live and who has access, decisions and why, accounts to hand back, advice for day one, and always one asking if anything was unclear or they felt unsupported.
- "source" says where the question came from, e.g. "From: <task title>" or "Always asked".
- "thanks" is a short, warm note of thanks written ONLY from their completed tasks. Do not mention problems or criticism, whatever the rest of the data says.`;
}

export function briefPrompt(ctx: unknown, qa: { question: string; answer: string }[]) {
  return `Compile a handoff brief for the next person taking over from a departing research assistant.
Records: ${JSON.stringify(ctx)}
Questions and the assistant's own answers: ${JSON.stringify(qa)}

Return JSON: {"where_we_are": string,"contributed": string,"code_and_backups":[{"name": string,"detail": string,"backup": string}],"decisions": string,"open_work": string,"advice": string,"unanswered": string[]}
Use their answers and the records only. List every question with an empty answer in "unanswered". Do not invent repos, paths or dates.`;
}

export function summaryPrompt(ctx: unknown) {
  return `Summarise this research project for the professor who runs the lab.
Data: ${JSON.stringify(ctx)}

Return JSON: {"summary": string (2-3 plain sentences),"progress": string (one sentence on what is done and what is in progress),"risks": string[] (real problems visible in the data, quoting a person's own words where there are blockers; empty if none),"next_steps": string[] (2-4 concrete next steps drawn from open tasks and blockers)}.
Use only the data. Do not invent people, dates or numbers. If there is very little data, say so plainly.`;
}
