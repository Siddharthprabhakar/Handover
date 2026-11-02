import { Sidebar } from "@/components/Sidebar";

export default function ProfLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen gap-4 p-4">
      <Sidebar />
      <main className="flex min-h-[calc(100vh-2rem)] min-w-0 max-w-[1240px] flex-1 flex-col gap-4">{children}</main>
    </div>
  );
}
