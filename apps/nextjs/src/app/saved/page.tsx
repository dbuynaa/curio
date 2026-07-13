import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter, SiteNav } from "~/app/_components/site-nav";
import { requireProfile } from "~/lib/require-auth";
import { getQueryClient, trpc } from "~/trpc/server";

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

export default async function SavedPage() {
  await requireProfile("/saved");

  const savedCollections = await getQueryClient().fetchQuery(
    trpc.social.mySaves.queryOptions(),
  );
  const savedCollectionRows = savedCollections.flatMap((save) =>
    save.collection ? [save.collection] : [],
  );

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
            {savedCollectionRows.length} bookmarked
          </span>
        </header>

        <section>
          <h2 className="font-mono text-[10px] text-primary uppercase tracking-widest mb-6 border-b border-border pb-3">
            Collections ({savedCollectionRows.length})
          </h2>
          <div className="space-y-1">
            {savedCollectionRows.map((collection) => (
              <Link
                key={collection.id}
                href={`/collection/${collection.id}`}
                className="grid grid-cols-[80px_1fr_auto] gap-5 items-center bg-paper border border-border p-4 hover:border-foreground"
              >
                <div className="size-20 overflow-hidden border border-border bg-stone-100">
                  {collection.coverImageUrl ? (
                    <img
                      src={collection.coverImageUrl}
                      alt={collection.title}
                      width={160}
                      height={160}
                      loading="lazy"
                      className="size-20 object-cover"
                    />
                  ) : null}
                </div>
                <div>
                  <h3 className="font-semibold">{collection.title}</h3>
                  <p className="text-xs text-muted line-clamp-1 mt-1">
                    {collection.description}
                  </p>
                  <p className="font-mono text-[10px] text-muted uppercase tracking-widest mt-2">
                    @{collection.owner?.username ?? "curator"} ·{" "}
                    {collection.items.length} items
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
