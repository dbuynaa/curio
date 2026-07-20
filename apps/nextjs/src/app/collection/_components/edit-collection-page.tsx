"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";
import { CollectionEditor } from "./collection-editor";

export function EditCollectionPage({ id }: { id: string }) {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: collection } = useSuspenseQuery(
    trpc.collection.byId.queryOptions({ id }),
  );

  useEffect(() => {
    if (!collection.isOwner) router.replace(`/collection/${id}`);
  }, [collection.isOwner, id, router]);

  if (!collection.isOwner) return null;

  return <CollectionEditor collection={collection} />;
}
