// Client-safe helpers (lab.ts imports the database, so it cannot be used in client components).
export const initials = (name: string) =>
  name.replace(/^Dr\.\s*/, "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
