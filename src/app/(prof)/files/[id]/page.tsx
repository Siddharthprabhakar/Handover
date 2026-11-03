import { museStatus } from "@/lib/muse";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { FileEditor } from "@/components/FileEditor";
import { PageHeader } from "@/components/ui";
import { list } from "@/lib/db";
import { kindLabel } from "@/lib/files";
import { requireProfessor } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function FileDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireProfessor();
  const [file] = await list("files", { col: "id", eq: (await params).id });
  if (!file || file.lab_id !== session.labId) notFound();
  const projects = await list("projects", { col: "lab_id", eq: session.labId });
  return (
    <>
      <AutoRefresh active={file.status === "transcribing"} />
      <PageHeader title={file.title} sub={`${kindLabel[file.kind]} · ${new Date(file.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`} back={{ href: "/files", label: "Files" }} />
      <FileEditor asr={museStatus().voice} file={file} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
    </>
  );
}
