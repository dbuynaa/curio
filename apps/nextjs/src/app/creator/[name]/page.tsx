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
    <div className="bg-background text-foreground min-h-screen">
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header className="border-foreground mb-12 max-w-3xl border-b pb-6">
          <div className="text-primary mb-3 font-mono text-[10px] tracking-widest uppercase">
            Cited creator
          </div>
          <h1 className="mb-4 text-5xl font-semibold tracking-tighter">
            {creator.displayName}
          </h1>
          <div className="text-muted flex gap-8 font-mono text-[10px] tracking-widest uppercase">
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
                className="bg-paper border-border grid gap-6 border p-6 md:grid-cols-[160px_1fr]"
              >
                <a
                  href={item.sourceUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-secondary block aspect-square overflow-hidden"
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </a>
                <div className="flex flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">{item.title}</h3>
                      <p className="text-muted mt-1 font-mono text-[10px] tracking-widest uppercase">
                        {item.contentType} / {item.frequencyCount} collection
                        {item.frequencyCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="text-primary shrink-0 font-mono text-[10px]">
                      #{String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="text-foreground mt-4 font-serif leading-relaxed italic">
                      &ldquo;{item.description}&rdquo;
                    </p>
                  ) : null}
                  <div className="border-border text-muted mt-auto flex items-center justify-between border-t pt-4 font-mono text-[10px] tracking-widest uppercase">
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
    </div>
  );
}
