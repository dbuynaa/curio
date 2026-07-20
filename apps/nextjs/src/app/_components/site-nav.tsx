"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@acme/ui/theme";

import { AuthNav } from "~/app/_components/auth-nav";

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
          ? "bg-foreground text-background rounded-full px-4 py-2 text-[13px] font-medium"
          : "text-muted hover:text-foreground rounded-full px-4 py-2 text-[13px] font-medium transition-colors"
      }
    >
      {label}
    </Link>
  );
}

export function SiteNav() {
  return (
    <nav className="bg-background flex items-center justify-between px-6 py-5">
      <Link href="/" className="group flex items-center gap-2">
        <span className="bg-foreground text-background grid size-7 place-items-center rounded-md text-sm font-semibold">
          C
        </span>
        <span className="text-lg font-semibold tracking-tight">Curio</span>
      </Link>
      <div className="hidden items-center gap-1 md:flex">
        <PillLink href="/" label="Explore" exact />
        <PillLink href="/search" label="Search" />
        <PillLink href="/saved" label="Saved" />
        <PillLink href="/about" label="About" />
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <AuthNav />
        <Link
          href="/collection/new"
          className="bg-foreground text-background hover:bg-foreground/85 rounded-full px-4 py-2 text-[13px] font-medium transition-colors"
        >
          New collection
        </Link>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 px-6 py-16">
      <div className="bg-foreground text-background mx-auto flex max-w-6xl flex-col justify-between gap-8 rounded-3xl p-10 md:flex-row md:items-end md:p-14">
        <div>
          <div className="mb-6 flex items-center gap-2">
            <span className="bg-background text-foreground grid size-7 place-items-center rounded-md text-sm font-semibold">
              C
            </span>
            <span className="text-lg font-semibold tracking-tight">Curio</span>
          </div>
          <h3 className="max-w-xl text-4xl leading-[1.05] font-semibold tracking-tight md:text-5xl">
            Curation, with credit.
          </h3>
        </div>
        <div className="text-background/60 flex gap-8 text-sm">
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
