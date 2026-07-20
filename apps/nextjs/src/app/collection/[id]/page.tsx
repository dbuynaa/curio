import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { SiteFooter, SiteNav } from "~/app/_components/site-nav";
import { getQueryClient, HydrateClient, prefetch, trpc } from "~/trpc/server";
import { CollectionView } from "../_components/collection-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getCollectionOrNull(id: string) {
  try {
    // fetchQuery uses the same request-scoped queryClient/cache as
    // prefetch() below, so this doesn't trigger a second DB round-trip
    // (or a second viewCount increment) for the same request.
    return await getQueryClient().fetchQuery(
      trpc.collection.byId.queryOptions({ id }),
    );
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const collection = await getCollectionOrNull(id);
  if (!collection) return { title: "Collection — Curio" };

  return {
    title: `${collection.title} — Curio`,
    description: collection.description ?? undefined,
    openGraph: {
      title: `${collection.title} — Curio`,
      description: collection.description ?? undefined,
      images: collection.coverImageUrl ? [collection.coverImageUrl] : [],
    },
  };
}

export default async function CollectionPage({ params }: PageProps) {
  const { id } = await params;
  const collection = await getCollectionOrNull(id);
  if (!collection) notFound();

  // Schedules the query into the same request cache generateMetadata
  // already populated — cheap, no extra fetch — and hydrates it into
  // the client tree below so useSuspenseQuery doesn't refetch on mount.
  prefetch(trpc.collection.byId.queryOptions({ id }));

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-8 sm:py-12">
        <HydrateClient>
          <CollectionView id={id} />
        </HydrateClient>
      </main>
      <SiteFooter />
    </div>
  );
}
