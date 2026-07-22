import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import {
  CollectionCardSkeleton,
  CollectionsSection,
} from "./_components/collections";
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
  prefetch(trpc.collection.recent.queryOptions());

  return (
    <HydrateClient>
      <div className="bg-background text-foreground min-h-screen">
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
            </header>
            <Suspense
              fallback={
                <div className="flex w-full flex-col gap-4">
                  <CollectionCardSkeleton />
                  <CollectionCardSkeleton />
                  <CollectionCardSkeleton />
                </div>
              }
            >
              <CollectionsSection />
            </Suspense>
          </section>

          {/* <section className="animate-reveal mt-20 [animation-delay:320ms]">
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
        </section> */}
        </main>
      </div>
    </HydrateClient>
  );
}
