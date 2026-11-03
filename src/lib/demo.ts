// Real dates: "today" and the Monday that starts this week (UTC). The check-in week is the Monday date.
const today = new Date().toISOString().slice(0, 10);
const mondayOf = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};
export const TODAY = today;
export const WEEK = mondayOf(today);
