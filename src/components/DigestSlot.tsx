import { getDigest } from "@/lib/digest";
import type { Lab } from "@/lib/lab";
import type { DigestRow } from "@/lib/seed";
import { DigestCard } from "./DigestCard";

// These wait for Muse. Pages render them inside <Suspense> so the rest of the page never waits.

export async function MuseDigestCard({ lab, saved }: { lab: Lab; saved?: DigestRow }) {
  const text = saved?.text ?? (await getDigest(lab)).summary;
  return <DigestCard key={text} initialText={text} initialShared={Boolean(saved?.shared_at)} />;
}

export async function MuseDigestText({ lab, text }: { lab: Lab; text?: string }) {
  return <p className="text-sm leading-relaxed">{text ?? (await getDigest(lab)).summary}</p>;
}

export function DigestSkeleton() {
  return (
    <div className="flex flex-col gap-3.5 rounded-[28px] bg-crimson p-6 text-white">
      <span className="self-start rounded-full bg-bg px-2.5 py-0.5 text-xs font-semibold text-muted">Suggested by Muse</span>
      <h2 className="font-heading text-[26px] font-bold">Weekly digest</h2>
      <div className="space-y-2.5">
        <div className="h-4 w-full animate-pulse rounded bg-white/20" />
        <div className="h-4 w-11/12 animate-pulse rounded bg-white/20" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-white/20" />
      </div>
      <p className="text-xs opacity-80">Muse is reading this week&apos;s check-ins…</p>
    </div>
  );
}
