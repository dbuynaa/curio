import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter, SiteNav } from "~/app/_components/site-nav";
import {
  collections,
  getCurator,
  getReferencedCreators,
} from "~/lib/mock-data";

export const metadata: Metadata = {
  title: "Curio — Curate the things you love",
  description:
    "Build public collections around your taste — art, music, films, writing. Every item links back to its source.",
  openGraph: {
    title: "Curio — Curate the things you love",
    description:
      "Build public collections around your taste. Every item links back to its source.",
  },
};

export default function ExplorePage() {
  const creators = getReferencedCreators().slice(0, 6);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="max-w-6xl mx-auto px-6 pt-4 pb-12">
        <section className="animate-reveal [animation-delay:80ms] mt-6">
          <header className="mb-8 flex items-end justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-soft mb-2">
                Recently updated
              </div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Fresh from curators
              </h2>
            </div>
            <Link
              href="/search"
              className="hidden md:inline px-4 py-2 rounded-full bg-paper border border-border text-sm hover:border-foreground/40 transition-colors"
            >
              Browse all →
            </Link>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {collections.map((c, idx) => {
              const curator = getCurator(c.curatorUsername);
              return (
                <Link
                  key={c.id}
                  href={`/collection/${c.id}`}
                  className="group bg-paper rounded-2xl border border-border hover:border-foreground/30 transition-colors overflow-hidden flex flex-col"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                    <img
                      src={c.cover}
                      alt={c.name}
                      loading={idx < 3 ? "eager" : "lazy"}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-semibold tracking-tight">{c.name}</h3>
                      <span className="text-[11px] text-muted-soft shrink-0">
                        {c.items.length} items
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <img
                        src={curator.avatar}
                        alt={curator.displayName}
                        loading="lazy"
                        className="size-5 rounded-full object-cover"
                      />
                      <span>@{curator.username}</span>
                    </div>
                    <div className="mt-auto pt-3 flex items-center gap-3 text-[11px] text-muted">
                      <span>♡ {c.likes}</span>
                      <span>◳ {c.saves}</span>
                      <span className="ml-auto text-muted-soft">{c.category}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="animate-reveal [animation-delay:320ms] mt-20">
          <header className="mb-6 flex items-end justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-soft mb-2">
                Cited creators
              </div>
              <h2 className="text-3xl font-semibold tracking-tight">
                People worth crediting
              </h2>
            </div>
          </header>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {creators.map((c) => {
              const inCollections = new Set(
                c.items.map((i) => i.collection.id),
              ).size;
              return (
                <Link
                  key={c.slug}
                  href={`/creator/${c.slug}`}
                  className="bg-paper rounded-2xl border border-border p-5 hover:border-foreground/30 transition-colors flex flex-col gap-4 group"
                >
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span className="px-2.5 py-1 rounded-full bg-background border border-border">
                      {c.items.length} cited
                    </span>
                    <span className="text-muted-soft">
                      {inCollections} collection
                      {inCollections === 1 ? "" : "s"}
                    </span>
                  </div>
                  <h4 className="text-xl font-semibold tracking-tight group-hover:text-primary transition-colors">
                    {c.name}
                  </h4>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
