import { Sidebar } from "@/components/Sidebar";

export default function ProfLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col gap-4 p-4 lg:flex-row">
      <Sidebar />
      <main className="flex min-h-[calc(100vh-2rem)] w-full min-w-0 flex-1 flex-col gap-4">{children}</main>
    </div>
  );
}
