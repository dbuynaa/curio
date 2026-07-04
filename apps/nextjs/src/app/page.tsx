import type { Metadata } from "next";
import Link from "next/link";

import {
  collections,
  getCurator,
  getReferencedCreators,
} from "~/lib/mock-data";
import { SiteFooter, SiteNav } from "./_components/site-nav";

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
    <div className="bg-background text-foreground min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 pt-4 pb-12">
        <section className="animate-reveal mt-6 [animation-delay:80ms]">
          <header className="mb-8 flex items-end justify-between">
            <div>
              <div className="text-muted-soft mb-2 text-[11px] tracking-[0.2em] uppercase">
                Recently updated
              </div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Fresh from curators
              </h2>
            </div>
            <Link
              href="/search"
              className="bg-paper border-border hover:border-foreground/40 hidden rounded-full border px-4 py-2 text-sm transition-colors md:inline"
            >
              Browse all →
            </Link>
          </header>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {collections.map((c, idx) => {
              const curator = getCurator(c.curatorUsername);
              return (
                <Link
                  key={c.id}
                  href={`/collection/${c.id}`}
                  className="group bg-paper border-border hover:border-foreground/30 flex flex-col overflow-hidden rounded-2xl border transition-colors"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                    <img
                      src={c.cover}
                      alt={c.name}
                      loading={idx < 3 ? "eager" : "lazy"}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-semibold tracking-tight">{c.name}</h3>
                      <span className="text-muted-soft shrink-0 text-[11px]">
                        {c.items.length} items
                      </span>
                    </div>
                    <div className="text-muted flex items-center gap-2 text-xs">
                      <img
                        src={curator.avatar}
                        alt={curator.displayName}
                        loading="lazy"
                        className="size-5 rounded-full object-cover"
                      />
                      <span>@{curator.username}</span>
                    </div>
                    <div className="text-muted mt-auto flex items-center gap-3 pt-3 text-[11px]">
                      <span>♡ {c.likes}</span>
                      <span>◳ {c.saves}</span>
                      <span className="text-muted-soft ml-auto">
                        {c.category}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="animate-reveal mt-20 [animation-delay:320ms]">
          <header className="mb-6 flex items-end justify-between">
            <div>
              <div className="text-muted-soft mb-2 text-[11px] tracking-[0.2em] uppercase">
                Cited creators
              </div>
              <h2 className="text-3xl font-semibold tracking-tight">
                People worth crediting
              </h2>
            </div>
          </header>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {creators.map((c) => {
              const inCollections = new Set(c.items.map((i) => i.collection.id))
                .size;
              return (
                <Link
                  key={c.slug}
                  href={`/creator/${c.slug}`}
                  className="bg-paper border-border hover:border-foreground/30 group flex flex-col gap-4 rounded-2xl border p-5 transition-colors"
                >
                  <div className="text-muted flex items-center justify-between text-[11px]">
                    <span className="bg-background border-border rounded-full border px-2.5 py-1">
                      {c.items.length} cited
                    </span>
                    <span className="text-muted-soft">
                      {inCollections} collection
                      {inCollections === 1 ? "" : "s"}
                    </span>
                  </div>
                  <h4 className="group-hover:text-primary text-xl font-semibold tracking-tight transition-colors">
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
