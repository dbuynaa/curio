import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { SiteFooter, SiteNav } from "~/app/_components/site-nav";
import { getQueryClient, trpc } from "~/trpc/server";

interface PageProps {
  params: Promise<{ name: string }>;
}

async function getCreatorOrNull(normalizedName: string) {
  try {
    return await getQueryClient().fetchQuery(
      trpc.user.byNormalizedName.queryOptions({ normalizedName }),
    );
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { name } = await params;
  const result = await getCreatorOrNull(name);
  if (!result) return { title: "Creator — Curio" };

  const { creator } = result;
  return {
    title: `${creator.displayName} — Cited on Curio`,
    description: `Works by ${creator.displayName} cited across Curio collections.`,
    openGraph: {
      title: `${creator.displayName} — Cited on Curio`,
      description: `Works by ${creator.displayName} cited across Curio collections.`,
    },
  };
}

export default async function CreatorPage({ params }: PageProps) {
  const { name } = await params;
  const result = await getCreatorOrNull(name);
  if (!result) notFound();

  const { creator, topWorks } = result;
  const collectionsCited = new Set(
    topWorks.map((item) => item.collection?.id).filter(Boolean),
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-12 border-b border-foreground pb-6 max-w-3xl">
          <div className="font-mono text-[10px] text-primary uppercase tracking-widest mb-3">
            Cited creator
          </div>
          <h1 className="text-5xl font-semibold tracking-tighter mb-4">
            {creator.displayName}
          </h1>
          <div className="flex gap-8 font-mono text-[10px] uppercase tracking-widest text-muted">
            <span>{creator.citationCount} works cited</span>
            <span>
              Across {collectionsCited.size} collection
              {collectionsCited.size === 1 ? "" : "s"}
            </span>
          </div>
        </header>

        <div className="space-y-4">
          {topWorks.map((item, idx) => {
            const collection = item.collection;
            if (!collection) return null;
            return (
              <article
                key={item.id}
                className="bg-paper border border-border p-6 grid md:grid-cols-[160px_1fr] gap-6"
              >
                <a
                  href={item.sourceUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square overflow-hidden bg-stone-100 block"
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </a>
                <div className="flex flex-col">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">{item.title}</h3>
                      <p className="font-mono text-[10px] text-muted mt-1 uppercase tracking-widest">
                        {item.contentType} / {item.frequencyCount} collection
                        {item.frequencyCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-primary shrink-0">
                      #{String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="font-serif italic text-foreground mt-4 leading-relaxed">
                      &ldquo;{item.description}&rdquo;
                    </p>
                  ) : null}
                  <div className="mt-auto pt-4 border-t border-border flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted">
                    <span>Cited in</span>
                    <Link
                      href={`/collection/${collection.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      {collection.title} ↗
                    </Link>
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
