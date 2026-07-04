import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter, SiteNav } from "~/app/_components/site-nav";
import {
  collections,
  getCollection,
  getCurator,
  slugify,
} from "~/lib/mock-data";

interface PageProps {
  params: Promise<{ collectionId: string; itemId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { collectionId, itemId } = await params;
  const collection = getCollection(collectionId);
  const item = collection?.items.find((i) => i.id === itemId);
  if (!item) return { title: "Item — Curio" };

  return {
    title: `${item.title} — Curio`,
    description: item.note,
    openGraph: {
      title: `${item.title} — Curio`,
      description: item.note,
      images: [item.thumbnail],
    },
  };
}

export default async function ItemPage({ params }: PageProps) {
  const { collectionId, itemId } = await params;
  const collection = getCollection(collectionId);
  if (!collection) notFound();

  const item = collection.items.find((i) => i.id === itemId);
  if (!item) notFound();

  const curator = getCurator(collection.curatorUsername);

  const alsoIn = item.creator
    ? collections
        .filter((c) => c.id !== collection.id)
        .filter((c) => c.items.some((i) => i.creator === item.creator))
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="max-w-6xl mx-auto px-6 py-12 animate-reveal">
        <div className="font-mono text-[10px] text-muted uppercase tracking-widest mb-6 flex gap-2">
          <Link
            href={`/collection/${collection.id}`}
            className="hover:text-primary"
          >
            ← {collection.name}
          </Link>
        </div>

        <div className="grid md:grid-cols-[1.2fr_1fr] gap-12">
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="block aspect-square outline-1 outline-offset-4 outline-border bg-paper overflow-hidden group"
          >
            <img
              src={item.thumbnail}
              alt={item.title}
              width={1000}
              height={1000}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
          </a>

          <div className="flex flex-col">
            <div className="font-mono text-[10px] text-primary uppercase tracking-widest mb-3">
              Item / {item.type}
            </div>
            <h1 className="text-4xl font-semibold tracking-tighter mb-4 text-balance">
              {item.title}
            </h1>

            {item.creator && (
              <div className="border-t border-border pt-4 mb-6">
                <div className="font-mono text-[10px] text-muted uppercase tracking-widest">
                  Attributed to
                </div>
                <Link
                  href={`/creator/${slugify(item.creator)}`}
                  className="text-xl font-semibold hover:text-primary transition-colors"
                >
                  {item.creator}
                </Link>
              </div>
            )}

            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] text-primary uppercase tracking-widest mb-8 hover:underline"
            >
              View source on {item.source} ↗
            </a>

            <div className="bg-paper border border-border p-6 mb-8">
              <div className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">
                Curator&apos;s note
              </div>
              <p className="font-serif italic text-xl leading-relaxed">
                &ldquo;{item.note}&rdquo;
              </p>
              <div className="mt-5 pt-4 border-t border-border flex items-center gap-3">
                <img
                  src={curator.avatar}
                  alt={curator.displayName}
                  className="size-7 rounded-full object-cover"
                />
                <Link
                  href={`/u/${curator.username}`}
                  className="text-sm font-medium hover:text-primary"
                >
                  @{curator.username}
                </Link>
              </div>
            </div>

            <div className="flex gap-2 mt-auto">
              <button
                type="button"
                className="px-4 py-3 border border-border bg-paper hover:border-primary hover:text-primary font-mono text-[10px] uppercase tracking-widest"
              >
                ♡ Like
              </button>
              <button
                type="button"
                className="px-4 py-3 border border-border bg-paper hover:border-primary hover:text-primary font-mono text-[10px] uppercase tracking-widest"
              >
                ⌘ Save to collection
              </button>
              <button
                type="button"
                className="px-4 py-3 border border-border bg-paper hover:border-primary hover:text-primary font-mono text-[10px] uppercase tracking-widest"
              >
                ↗ Repost
              </button>
            </div>
          </div>
        </div>

        {alsoIn.length > 0 && (
          <section className="mt-24 border-t border-foreground pt-10">
            <h2 className="font-mono text-[10px] text-primary uppercase tracking-widest mb-6">
              Also cited in
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
              {alsoIn.map((c) => (
                <Link
                  key={c.id}
                  href={`/collection/${c.id}`}
                  className="bg-paper border border-border p-5 hover:border-primary transition-colors"
                >
                  <div className="font-mono text-[10px] text-muted uppercase tracking-widest">
                    {c.category}
                  </div>
                  <h3 className="font-semibold mt-2">{c.name}</h3>
                  <p className="text-xs text-muted mt-2">
                    by @{c.curatorUsername}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
