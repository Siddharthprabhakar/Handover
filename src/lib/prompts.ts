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
