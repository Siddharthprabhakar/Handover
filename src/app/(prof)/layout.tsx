import { ProfileLink } from "@/components/ProfileLink";
import { Sidebar } from "@/components/Sidebar";
import { requireProfessor } from "@/lib/session";

export default async function ProfLayout({ children }: LayoutProps<"/">) {
  const s = await requireProfessor();
  return (
    <div className="flex min-h-screen flex-col gap-4 p-4 lg:flex-row">
      <Sidebar user={{ name: s.name, email: s.email, lab: s.labName, demo: s.demo }} />
      <main className="relative flex min-h-[calc(100vh-2rem)] w-full min-w-0 flex-1 flex-col gap-4"><ProfileLink name={s.name} />
        {children}
      </main>
    </div>
  );
}
