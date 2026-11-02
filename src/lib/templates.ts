export const PHASES = {
  lab: ["Plan", "Recruit", "Interview", "Synthesize", "Design", "Test", "Report"],
  thesis: ["Proposal", "Literature", "Method", "Data", "Analysis", "Writing", "Defense"],
} as const;
export type Kind = keyof typeof PHASES;
