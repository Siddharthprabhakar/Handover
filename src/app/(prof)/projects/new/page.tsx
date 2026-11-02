import { NewProjectForm } from "@/components/NewProjectForm";
import { PageHeader } from "@/components/ui";
import { loadLab } from "@/lib/lab";
import { loadsOf } from "@/lib/loads";

export const dynamic = "force-dynamic";

export default async function NewProject() {
  const lab = await loadLab();
  return (
    <>
      <PageHeader title="New project" sub="Describe the goal. Muse drafts a plan you can edit before anything is created." back={{ href: "/projects", label: "All projects" }} />
      <NewProjectForm ras={loadsOf(lab)} />
    </>
  );
}
