"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./ui";

const ITEMS = [
  { href: "/", label: "Lab overview", icon: "grid" },
  { href: "/projects", label: "Projects", icon: "folder" },
  { href: "/people", label: "People", icon: "users" },
  { href: "/workload", label: "Workload", icon: "clock" },
  { href: "/checkins", label: "Check-ins", icon: "cc" },
  { href: "/files", label: "Files", icon: "mic" },
] as const;

function Logo() {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-crimson font-heading text-base font-bold text-white">H</span>
      <span className="font-heading text-xl font-bold">Handover</span>
    </div>
  );
}

function Nav({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return (
    <>
      {ITEMS.map((it) => {
        const on = it.href === "/" ? path === "/" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm ${on ? "bg-crimson font-semibold text-white" : "font-medium text-muted hover:bg-bg"}`}
          >
            <Icon name={it.icon} />
            {it.label}
          </Link>
        );
      })}
    </>
  );
}

export type SidebarUser = { name: string; email: string; lab: string; demo: boolean };

function UserBox({ user }: { user: SidebarUser }) {
  return (
    <div className="rounded-2xl bg-bg p-3.5">
      <div className="truncate text-sm font-semibold">{user.name}</div>
      <div className="truncate text-xs text-muted">{user.demo ? "Demo mode: sample data" : user.lab}</div>
      {!user.demo && (
        <form action="/logout" method="post" className="mt-2">
          <button className="text-xs font-semibold text-crimson">Sign out</button>
        </form>
      )}
    </div>
  );
}

export function Sidebar({ user }: { user: SidebarUser }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Escape closes the drawer; the page behind it does not scroll while it is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* phone and tablet: a slim bar with a menu button, and a slide-in drawer */}
      <div className="sticky top-2 z-20 flex items-center gap-3 rounded-3xl bg-surface p-3 shadow-sm lg:hidden">
        <Logo />
        <span className="flex-1" />
        <button type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl bg-bg">
          <Icon name="menu" className="h-5 w-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col gap-1.5 overflow-y-auto rounded-r-3xl bg-surface p-5">
            <div className="mb-4 flex items-center">
              <Logo />
              <span className="flex-1" />
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-bg">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            <Nav path={path} onNavigate={() => setOpen(false)} />
            <div className="flex-1" />
            <UserBox user={user} />
          </aside>
        </div>
      )}

      {/* desktop: the fixed sidebar */}
      <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[220px] shrink-0 flex-col gap-1.5 rounded-3xl bg-surface p-5 lg:flex">
        <div className="mb-4"><Logo /></div>
        <Nav path={path} />
        <div className="flex-1" />
        <UserBox user={user} />
      </aside>
    </>
  );
}
