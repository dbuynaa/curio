import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter, SiteNav } from "~/app/_components/site-nav";
import { collections } from "~/lib/mock-data";

export const metadata: Metadata = {
  title: "Saved — Curio",
  description:
    "Items and collections you've bookmarked across Curio. Your private workbench.",
  openGraph: {
    title: "Saved — Curio",
    description:
      "Items and collections you've bookmarked across Curio. Your private workbench.",
  },
};

export default function SavedPage() {
  const savedItems = collections
    .slice(0, 2)
    .flatMap((c) => c.items.slice(0, 2).map((item) => ({ item, collection: c })));
  const savedCollections = collections.slice(1, 3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="max-w-5xl mx-auto px-6 py-12 animate-reveal space-y-20">
        <header className="border-b border-foreground pb-6 flex items-baseline justify-between">
          <div>
            <div className="font-mono text-[10px] text-primary uppercase tracking-widest mb-3">
              Private / Workbench
            </div>
            <h1 className="text-4xl font-semibold tracking-tighter">Saved</h1>
          </div>
          <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
            {savedItems.length + savedCollections.length} bookmarked
          </span>
        </header>

        <section>
          <h2 className="font-mono text-[10px] text-primary uppercase tracking-widest mb-6 border-b border-border pb-3">
            Items ({savedItems.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
            {savedItems.map(({ item, collection }) => (
              <Link
                key={`${collection.id}-${item.id}`}
                href={`/item/${collection.id}/${item.id}`}
                className="bg-paper border border-border hover:border-foreground transition-colors block"
              >
                <div className="aspect-square overflow-hidden bg-stone-100">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    width={500}
                    height={500}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold truncate">{item.title}</h3>
                  <p className="font-mono text-[10px] text-muted uppercase tracking-widest mt-1 truncate">
                    {item.creator ?? item.source}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-mono text-[10px] text-primary uppercase tracking-widest mb-6 border-b border-border pb-3">
            Collections ({savedCollections.length})
          </h2>
          <div className="space-y-1">
            {savedCollections.map((c) => (
              <Link
                key={c.id}
                href={`/collection/${c.id}`}
                className="grid grid-cols-[80px_1fr_auto] gap-5 items-center bg-paper border border-border p-4 hover:border-foreground"
              >
                <img
                  src={c.cover}
                  alt={c.name}
                  width={160}
                  height={160}
                  loading="lazy"
                  className="size-20 object-cover border border-border"
                />
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-xs text-muted line-clamp-1 mt-1">
                    {c.description}
                  </p>
                  <p className="font-mono text-[10px] text-muted uppercase tracking-widest mt-2">
                    @{c.curatorUsername} · {c.items.length} items
                  </p>
                </div>
                <span className="font-mono text-[10px] text-primary uppercase tracking-widest">
                  Saved
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
