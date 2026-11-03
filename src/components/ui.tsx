import Link from "next/link";
import type { ReactNode } from "react";

const ICONS: Record<string, string> = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.6 3.5 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cc: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  arrow: '<path d="M7 17L17 7M8 7h9v9"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
};

export function Icon({ name, className = "h-[18px] w-[18px]" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

export function Card({ children, className = "", dark = false }: { children: ReactNode; className?: string; dark?: boolean }) {
  return <div className={`rounded-3xl p-5 ${dark ? "bg-dark text-white" : "bg-surface"} ${className}`}>{children}</div>;
}

const TONES = {
  crimson: "bg-crimson-soft text-crimson",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  dark: "bg-dark text-white",
  light: "bg-bg text-muted",
} as const;
export type Tone = keyof typeof TONES;

export function Chip({ children, tone = "crimson" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}

export function Avatar({ initials, size = 32, dark = false }: { initials: string; size?: number; dark?: boolean }) {
  return (
    <span
      style={{ width: size, height: size, fontSize: size > 26 ? 11 : 9 }}
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold ${dark ? "bg-dark text-white" : "bg-crimson-soft text-crimson"}`}
    >
      {initials}
    </span>
  );
}

export function Btn({ href, children, kind = "out", small = false }: { href: string; children: ReactNode; kind?: "pri" | "dark" | "out"; small?: boolean }) {
  const k = { pri: "bg-crimson text-white", dark: "bg-dark text-white", out: "border border-line text-ink" }[kind];
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold ${small ? "px-3 py-1.5 text-xs" : "px-[18px] py-2.5 text-sm"} ${k}`}>
      {children}
    </Link>
  );
}

export function PageHeader({ title, sub, back, right }: { title: string; sub?: string; back?: { href: string; label: string }; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-2 py-1">
      <div className="flex-1">
        {back && (
          <Link href={back.href} className="text-[13px] font-semibold text-crimson">
            ← {back.label}
          </Link>
        )}
        <h1 className="font-heading text-[30px] font-bold leading-tight">{title}</h1>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function ActionBar({ hint, children }: { hint?: string; children: ReactNode }) {
  return (
    <div className="sticky bottom-4 mt-auto flex flex-wrap items-center gap-2.5 rounded-[20px] bg-surface px-5 py-3">
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
      <span className="flex-1" />
      {children}
    </div>
  );
}

/** Seven-segment journey strip: done phases dark, current crimson, rest grey. */
export function Segments({ current, total = 7 }: { current: number; total?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2 flex-1 rounded ${i < current - 1 ? "bg-dark" : i === current - 1 ? "bg-crimson" : "bg-line"}`} />
      ))}
    </div>
  );
}

export function Soon({ title, stage }: { title: string; stage: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <p className="text-muted">This screen is built in {stage}.</p>
      </Card>
    </>
  );
}
