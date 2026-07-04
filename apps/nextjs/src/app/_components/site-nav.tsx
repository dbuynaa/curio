"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function PillLink({
  href,
  label,
  exact,
}: {
  href: string;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={
        active
          ? "px-4 py-2 rounded-full text-[13px] font-medium bg-foreground text-background"
          : "px-4 py-2 rounded-full text-[13px] font-medium text-muted hover:text-foreground transition-colors"
      }
    >
      {label}
    </Link>
  );
}

export function SiteNav() {
  return (
    <nav className="px-6 py-5 flex justify-between items-center bg-background">
      <Link href="/" className="flex items-center gap-2 group">
        <span className="grid place-items-center size-7 rounded-md bg-foreground text-background font-semibold text-sm">
          C
        </span>
        <span className="text-lg font-semibold tracking-tight">Curio</span>
      </Link>
      <div className="hidden md:flex gap-1 items-center">
        <PillLink href="/" label="Explore" exact />
        <PillLink href="/following" label="Following" />
        <PillLink href="/search" label="Search" />
        <PillLink href="/saved" label="Saved" />
        <PillLink href="/about" label="About" />
      </div>

      <div className="flex gap-2 items-center">
        <Link
          href="/u/julian_s"
          className="hidden sm:inline-flex px-4 py-2 rounded-full text-[13px] font-medium text-muted hover:text-foreground transition-colors"
        >
          @julian_s
        </Link>
        <Link
          href="/new"
          className="px-4 py-2 rounded-full text-[13px] font-medium bg-foreground text-background hover:bg-foreground/85 transition-colors"
        >
          New collection
        </Link>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="py-16 mt-24 px-6">
      <div className="max-w-6xl mx-auto rounded-3xl bg-foreground text-background p-10 md:p-14 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <span className="grid place-items-center size-7 rounded-md bg-background text-foreground font-semibold text-sm">
              C
            </span>
            <span className="text-lg font-semibold tracking-tight">Curio</span>
          </div>
          <h3 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-xl leading-[1.05]">
            Curation, with credit.
          </h3>
        </div>
        <div className="flex gap-8 text-sm text-background/60">
          <div className="flex flex-col gap-2">
            <Link href="/" className="hover:text-background">
              Explore
            </Link>
            <Link href="/about" className="hover:text-background">
              About
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-background/40">© Curio 2026</span>
            <span className="text-background/40">Made with care</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
