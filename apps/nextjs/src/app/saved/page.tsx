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
    <main className="animate-reveal mx-auto max-w-5xl space-y-20 px-6 py-12">
      <header className="border-foreground flex items-baseline justify-between border-b pb-6">
        <div>
          <div className="text-primary mb-3 font-mono text-[10px] tracking-widest uppercase">
            Private / Workbench
          </div>
          <h1 className="text-4xl font-semibold tracking-tighter">Saved</h1>
        </div>
        <span className="text-muted font-mono text-[10px] tracking-widest uppercase">
          {savedCollectionRows.length} bookmarked
        </span>
      </header>

      <section>
        <h2 className="text-primary border-border mb-6 border-b pb-3 font-mono text-[10px] tracking-widest uppercase">
          Collections ({savedCollectionRows.length})
        </h2>
        <div className="space-y-1">
          {savedCollectionRows.map((collection) => (
            <Link
              key={collection.id}
              href={`/collection/${collection.id}`}
              className="bg-paper border-border hover:border-foreground grid grid-cols-[80px_1fr_auto] items-center gap-5 border p-4"
            >
              <div className="bg-secondary border-border size-20 overflow-hidden border">
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
                <p className="text-muted mt-1 line-clamp-1 text-xs">
                  {collection.description}
                </p>
                <p className="text-muted mt-2 font-mono text-[10px] tracking-widest uppercase">
                  @{collection.owner?.username ?? "curator"} ·{" "}
                  {collection.items.length} items
                </p>
              </div>
              <span className="text-primary font-mono text-[10px] tracking-widest uppercase">
                Saved
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
