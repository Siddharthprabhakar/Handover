"use client";

import { useState } from "react";

/** Splits the saved check-in text ("Project: X", then "Label: answer" lines) so it reads as a form. */
function sections(text: string) {
  return text.split(/^Project: /m).filter((b) => b.trim()).map((block) => {
    const [head, ...lines] = block.split("\n");
    return { project: head.trim(), lines: lines.filter((l) => l.trim()).map((l) => { const m = l.match(/^([^:]{3,40}):\s*(.*)$/); return m ? { label: m[1], value: m[2] } : { label: "", value: l }; }) };
  });
}

/** A small button that opens everything one person wrote in their check-in. */
export function CheckinAnswers({ name, text }: { name: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold">View</button>
      {open && (
        <div className="fixed inset-0 z-20 flex overflow-auto bg-black/55 p-5" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="m-auto flex w-full max-w-[560px] flex-col gap-4 rounded-[28px] bg-surface p-7 text-left">
            <h2 className="font-heading text-2xl font-bold">{name.split(" ")[0]}&apos;s check-in</h2>
            {sections(text).map((s, i) => (
              <div key={i} className="flex flex-col gap-2.5">
                {s.project && <b className="font-heading text-[17px]">{s.project}</b>}
                {s.lines.map((l, j) => (
                  <div key={j} className="rounded-2xl bg-bg p-3.5 text-sm leading-relaxed">
                    {l.label && <b className="mb-1 block text-xs text-muted">{l.label}</b>}
                    {l.value}
                  </div>
                ))}
              </div>
            ))}
            <button type="button" onClick={() => setOpen(false)} className="self-start rounded-full border border-line px-[18px] py-2.5 text-sm font-semibold">Close</button>
          </div>
        </div>
      )}
    </>
  );
}
