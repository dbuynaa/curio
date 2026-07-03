"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { SiteFooter, SiteNav } from "~/app/_components/site-nav";
import { searchAll } from "~/lib/mock-data";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [q, setQ] = useState(initialQuery);
  const results = searchAll(q);
  const hasQuery = q.trim().length > 0;
  const empty =
    hasQuery &&
    results.collections.length === 0 &&
    results.curators.length === 0 &&
    results.creators.length === 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-8 border-b border-foreground pb-6">
          <div className="font-mono text-[10px] text-primary uppercase tracking-widest mb-3">
            Catalogue search
          </div>
          <h1 className="text-4xl font-semibold tracking-tighter mb-6">Search</h1>
          <input
            type="search"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try: brutalism, jazz, @julian_s, Dieter Rams…"
            className="w-full bg-paper border border-border px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </header>

        {!hasQuery && (
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest">
            Start typing to query collections, curators and cited creators.
          </p>
        )}

        {empty && (
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest">
            No matches in the archive.
          </p>
        )}

        {hasQuery && (
          <div className="space-y-12 mt-8">
            {results.collections.length > 0 && (
              <Section title={`Collections (${results.collections.length})`}>
                <ul className="divide-y divide-border border-y border-border">
                  {results.collections.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/collection/${c.id}`}
                        className="flex items-baseline justify-between py-4 hover:text-primary transition-colors"
                      >
                        <span className="font-semibold">{c.name}</span>
                        <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
                          {c.category}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {results.curators.length > 0 && (
              <Section title={`Curators (${results.curators.length})`}>
                <ul className="space-y-3">
                  {results.curators.map((c) => (
                    <li key={c.username}>
                      <Link
                        href={`/u/${c.username}`}
                        className="flex items-center gap-3 group"
                      >
                        <img
                          src={c.avatar}
                          alt={c.displayName}
                          className="size-10 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-semibold group-hover:text-primary transition-colors">
                            @{c.username}
                          </div>
                          <div className="font-mono text-[10px] text-muted uppercase tracking-widest">
                            {c.displayName} / {c.location}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {results.creators.length > 0 && (
              <Section title={`Cited creators (${results.creators.length})`}>
                <ul className="divide-y divide-border border-y border-border">
                  {results.creators.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/creator/${c.slug}`}
                        className="flex items-baseline justify-between py-4 hover:text-primary transition-colors"
                      >
                        <span className="font-semibold">{c.name}</span>
                        <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
                          {c.items.length} works
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-mono text-[10px] text-primary uppercase tracking-widest mb-4 pb-2 border-b border-border">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SearchPageClient() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
