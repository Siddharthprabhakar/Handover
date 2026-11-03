import { requireProfessor } from "@/lib/session";
import { Card, Chip, PageHeader } from "@/components/ui";
import { getOutbox } from "@/lib/email";

export const dynamic = "force-dynamic";

export default async function Outbox() {
  const session = await requireProfessor();
  const items = getOutbox(session.labId);
  return (
    <>
      <PageHeader title="Sent emails" sub="Everything Handover has emailed for your lab. If Gmail is not set up, messages are only shown here." />
      {items.length === 0 && <Card><p className="text-sm text-muted">Nothing sent yet. Send a reminder from Check-ins, or start a handoff.</p></Card>}
      {items.map((m, i) => (
        <Card key={i} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-[15px]">{m.subject}</b>
            <Chip tone={m.mode === "sent" ? "ok" : "light"}>{m.mode === "sent" ? "Sent" : "Preview only"}</Chip>
            {m.error && <Chip tone="warn">{m.error}</Chip>}
            <span className="flex-1" />
            <span className="text-xs text-muted">to {m.toName} · {new Date(m.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
          </div>
          <div className="overflow-hidden rounded-2xl" dangerouslySetInnerHTML={{ __html: m.html }} />
        </Card>
      ))}
    </>
  );
}
