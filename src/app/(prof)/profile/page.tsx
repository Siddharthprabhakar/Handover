import { CalendarLinks } from "@/components/CalendarLinks";
import { ManageMeetingsButton } from "@/components/MeetingsCard";
import { Avatar, Card, Chip, PageHeader } from "@/components/ui";
import { list } from "@/lib/db";
import { appUrl } from "@/lib/email";
import { initials, loadLab } from "@/lib/lab";
import { DAYS, fmtTime } from "@/lib/meetings";
import { requireProfessor } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Profile() {
  const session = await requireProfessor();
  const lab = await loadLab(session.labId);
  // these need the v8 and v9 database updates; until they are run the lists are simply empty
  const [meetings, links, labRows] = await Promise.all([
    list("meetings", { col: "lab_id", eq: session.labId }).catch(() => []),
    list("calendar_links", { col: "person_id", eq: session.personId }).catch(() => []),
    list("labs", { col: "id", eq: session.labId }).catch(() => []),
  ]);
  const token = labRows[0]?.calendar_token;
  const project = (id: string | null) => lab.projects.find((p) => p.id === id)?.name;
  const ordered = [...meetings].sort((a, b) => (a.weekday ?? 9) - (b.weekday ?? 9) || a.starts.localeCompare(b.starts));

  return (
    <>
      <PageHeader title="Your profile" sub="Your schedule and connected calendars." />

      <Card className="flex flex-wrap items-center gap-4">
        <Avatar initials={initials(session.name)} size={56} />
        <div className="min-w-0 flex-1">
          <div className="font-heading text-xl font-bold">{session.name}</div>
          <div className="truncate text-sm text-muted">{session.email}</div>
          <div className="mt-1.5 flex gap-2"><Chip>Professor</Chip><Chip tone="light">{session.demo ? "Demo lab" : session.labName}</Chip></div>
        </div>
        {!session.demo && (
          <form action="/logout" method="post"><button className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-crimson">Sign out</button></form>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <h2 className="font-heading text-xl font-bold">Your schedule</h2>
            <p className="text-sm text-muted">Class times, office hours and lab meetings. They show on your Overview, and you can subscribe to them from Google Calendar, Outlook or Teams.</p>
          </div>
          <ManageMeetingsButton label="Edit schedule" meetings={meetings} projects={lab.projects.map((p) => ({ id: p.id, name: p.name }))} feedUrl={token ? `${appUrl()}/api/calendar/${token}.ics` : null} />
        </div>
        {ordered.length === 0 && <p className="text-sm text-muted">Nothing scheduled yet. Choose Edit schedule to add a weekly meeting or a class.</p>}
        {ordered.map((m) => (
          <div key={m.id} className="flex items-center gap-3 border-t border-line py-2.5 text-sm first:border-t-0">
            <span className="w-[96px] shrink-0 font-semibold">{m.weekday !== null ? `Every ${DAYS[m.weekday]}` : m.on_date}</span>
            <span className="w-[76px] shrink-0">{fmtTime(m.starts)}</span>
            <span className="min-w-0 flex-1"><span className="block">{m.title}</span><span className="block truncate text-xs text-muted">{[project(m.project_id), m.place].filter(Boolean).join(" · ")}</span></span>
          </div>
        ))}
      </Card>

      <CalendarLinks links={links.map((l) => ({ id: l.id, label: l.label, host: new URL(l.url).host }))} />
    </>
  );
}
