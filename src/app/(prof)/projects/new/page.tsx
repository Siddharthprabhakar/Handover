import { requireProfessor } from "@/lib/session";
import { NewProjectForm } from "@/components/NewProjectForm";
import { Btn, Card, PageHeader } from "@/components/ui";
import { loadLab } from "@/lib/lab";
import { loadsOf } from "@/lib/loads";

export const dynamic = "force-dynamic";

export default async function NewProject() {
  const session = await requireProfessor();
  const lab = await loadLab(session.labId);
  if (lab.ras.length === 0) {
    return (
      <>
        <PageHeader title="New project" sub="Add someone first, so Muse has people to assign tasks to." back={{ href: "/projects", label: "All projects" }} />
        <Card className="flex flex-col items-start gap-3 !p-6"><p className="text-sm text-muted">Muse drafts a plan and suggests owners from the people in your lab. Invite at least one person first.</p><Btn href="/people" kind="pri">Invite people</Btn></Card>
      </>
    );
  }
  return (
    <>
      <PageHeader title="New project" sub="Describe the goal. Muse drafts a plan you can edit before anything is created." back={{ href: "/projects", label: "All projects" }} />
      <NewProjectForm ras={loadsOf(lab)} />
    </>
  );
}
