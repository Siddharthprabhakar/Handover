import type { ReactNode } from "react";

export function AuthShell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[440px] flex-col justify-center gap-5 p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-crimson font-heading text-lg font-bold text-white">H</span>
        <span className="font-heading text-2xl font-bold">Handover</span>
      </div>
      <div className="rounded-3xl bg-surface p-7">
        <h1 className="font-heading text-[26px] font-bold leading-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted">{sub}</p>
        <div className="mt-5 flex flex-col gap-3.5">{children}</div>
      </div>
    </div>
  );
}

export const inputCls = "w-full rounded-xl bg-bg px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-crimson/30";
export const btnCls = "w-full rounded-full bg-crimson px-[18px] py-3 text-sm font-semibold text-white disabled:opacity-50";
