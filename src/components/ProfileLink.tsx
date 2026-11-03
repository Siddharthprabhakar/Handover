import Link from "next/link";
import { initials } from "@/lib/format";

/** The round profile button in the top right corner of every professor page. */
export function ProfileLink({ name }: { name: string }) {
  return (
    <Link href="/profile" aria-label="Your profile" title={name} className="absolute right-0 top-0 z-10 grid h-11 w-11 place-items-center rounded-full bg-crimson text-sm font-semibold text-white shadow-md">
      {initials(name)}
    </Link>
  );
}
