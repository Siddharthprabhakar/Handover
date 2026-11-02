"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./ui";

const ITEMS = [
  { href: "/", label: "Lab overview", icon: "grid" },
  { href: "/projects", label: "Projects", icon: "folder" },
  { href: "/people", label: "People", icon: "users" },
  { href: "/workload", label: "Workload", icon: "clock" },
  { href: "/checkins", label: "Check-ins", icon: "cc" },
] as const;

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-4 flex h-[calc(100vh-2rem)] w-[220px] shrink-0 flex-col gap-1.5 rounded-3xl bg-surface p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-crimson font-heading text-base font-bold text-white">H</span>
        <span className="font-heading text-xl font-bold">Handover</span>
      </div>
      {ITEMS.map((it) => {
        const on = it.href === "/" ? path === "/" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm ${on ? "bg-crimson font-semibold text-white" : "font-medium text-muted hover:bg-bg"}`}
          >
            <Icon name={it.icon} />
            {it.label}
          </Link>
        );
      })}
      <div className="flex-1" />
      <div className="rounded-2xl bg-bg p-3.5">
        <div className="text-xs text-muted">Viewing as</div>
        <div className="text-sm font-semibold">Professor</div>
      </div>
    </aside>
  );
}
