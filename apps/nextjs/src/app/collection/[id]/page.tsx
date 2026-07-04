import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter, SiteNav } from "~/app/_components/site-nav";
import {
  getCollection,
  getCurator,
  slugify
  
} from "~/lib/mock-data";
import type {Item} from "~/lib/mock-data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const collection = getCollection(id);
  if (!collection) return { title: "Collection — Curio" };

  return {
    title: `${collection.name} — Curio`,
    description: collection.description,
    openGraph: {
      title: `${collection.name} — Curio`,
      description: collection.description,
      images: [collection.cover],
    },
  };
}

export default async function CollectionPage({ params }: PageProps) {
  const { id } = await params;
  const collection = getCollection(id);
  if (!collection) notFound();

  const curator = getCurator(collection.curatorUsername);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-16 max-w-2xl animate-reveal">
          <div className="font-mono text-[10px] text-primary uppercase tracking-widest mb-4">
            Collection // {collection.category}
          </div>
          <h1 className="text-5xl font-semibold tracking-tighter mb-6 text-balance">
            {collection.name}
          </h1>
          <p className="text-muted leading-relaxed text-lg">
            {collection.description}
          </p>

          <div className="flex flex-wrap gap-2 mt-6">
            {collection.tags.map((tag: string) => (
              <Link
                key={tag}
                href={`/search?q=${encodeURIComponent(tag.replace(/^#/, ""))}`}
                className="px-2 py-1 bg-paper border border-border text-[11px] font-mono hover:border-primary hover:text-primary transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-3 pt-6 border-t border-border">
            <img
              src={curator.avatar}
              alt={curator.displayName}
              width={32}
              height={32}
              className="size-8 rounded-full object-cover"
            />
            <div className="flex-1">
              <Link
                href={`/u/${curator.username}`}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Curated by @{curator.username}
              </Link>
              <div className="font-mono text-[10px] text-muted uppercase tracking-widest">
                {String(collection.items.length).padStart(3, "0")} items /{" "}
                {curator.location}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-2 border border-border bg-paper hover:border-primary hover:text-primary transition-colors font-mono text-[10px] uppercase tracking-widest"
              >
                ♡ {collection.likes}
              </button>
              <button
                type="button"
                className="px-3 py-2 border border-border bg-paper hover:border-primary hover:text-primary transition-colors font-mono text-[10px] uppercase tracking-widest"
              >
                ⌘ Save · {collection.saves}
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-24 animate-reveal [animation-delay:150ms]">
          {collection.items.map((item: Item, idx: number) => {
            const reversed = idx % 2 === 1;
            return (
              <article
                key={item.id}
                className="grid md:grid-cols-2 gap-12 items-center"
              >
                <div className={reversed ? "md:order-2" : ""}>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-square outline-1 outline-offset-4 outline-border overflow-hidden bg-paper group"
                  >
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      loading="lazy"
                      width={800}
                      height={800}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                  </a>
                </div>
                <div className={reversed ? "md:order-1" : ""}>
                  <div className="bg-paper border border-border p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.02)]">
                    <div className="flex justify-between items-start mb-4 gap-4">
                      <div>
                        <h4 className="font-semibold text-lg leading-tight">
                          {item.title}
                        </h4>
                        <p className="font-mono text-[10px] text-muted mt-1 uppercase tracking-widest">
                          {item.type} / {item.source}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] text-primary shrink-0">
                        #{String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>

                    {item.creator && (
                      <div className="mb-6 pb-4 border-b border-border flex items-baseline justify-between gap-4">
                        <div>
                          <div className="font-mono text-[10px] text-muted uppercase tracking-widest">
                            Attributed to
                          </div>
                          <Link
                            href={`/creator/${slugify(item.creator)}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {item.creator}
                          </Link>
                        </div>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10px] text-muted hover:text-primary uppercase tracking-widest"
                        >
                          Source ↗
                        </a>
                      </div>
                    )}

                    <p className="font-serif text-lg italic leading-relaxed text-foreground">
                      &ldquo;{item.note}&rdquo;
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
