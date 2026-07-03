import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter, SiteNav } from "~/app/_components/site-nav";
import { collections, curators, getCurator } from "~/lib/mock-data";

export const metadata: Metadata = {
  title: "Following — Curio",
  description:
    "A chronological feed of updates from the curators you follow. No algorithm, no ranking.",
  openGraph: {
    title: "Following — Curio",
    description:
      "A chronological feed of updates from the curators you follow. No algorithm, no ranking.",
  },
};

export default function FollowingPage() {
  const feed = [...collections].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="max-w-3xl mx-auto px-6 py-12 animate-reveal">
        <header className="mb-12 border-b border-foreground pb-6 flex items-baseline justify-between">
          <div>
            <div className="font-mono text-[10px] text-primary uppercase tracking-widest mb-3">
              Feed / Chronological
            </div>
            <h1 className="text-4xl font-semibold tracking-tighter">
              Following
            </h1>
          </div>
          <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
            {Object.keys(curators).length} curators
          </span>
        </header>

        <ol className="space-y-1">
          {feed.map((c, idx) => {
            const curator = getCurator(c.curatorUsername);
            return (
              <li
                key={c.id}
                className="bg-paper border border-border p-6 hover:border-foreground transition-colors"
              >
                <div className="flex items-baseline justify-between gap-4 font-mono text-[10px] uppercase tracking-widest text-muted mb-4">
                  <span>
                    {String(idx + 1).padStart(3, "0")} ·{" "}
                    <Link
                      href={`/u/${curator.username}`}
                      className="hover:text-primary"
                    >
                      @{curator.username}
                    </Link>{" "}
                    updated a collection
                  </span>
                  <time>{c.updatedAt}</time>
                </div>

                <div className="grid grid-cols-[88px_1fr] gap-5">
                  <Link
                    href={`/collection/${c.id}`}
                    className="block size-22 aspect-square overflow-hidden border border-border"
                  >
                    <img
                      src={c.cover}
                      alt={c.name}
                      width={176}
                      height={176}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </Link>
                  <div>
                    <Link
                      href={`/collection/${c.id}`}
                      className="text-xl font-semibold tracking-tight hover:text-primary"
                    >
                      {c.name}
                    </Link>
                    <p className="text-sm text-muted mt-1 line-clamp-2">
                      {c.description}
                    </p>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {c.tags.slice(0, 4).map((t) => (
                        <Link
                          key={t}
                          href={`/search?q=${encodeURIComponent(t.replace(/^#/, ""))}`}
                          className="font-mono text-[10px] text-muted hover:text-primary"
                        >
                          {t}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </main>
      <SiteFooter />
    </div>
  );
}
