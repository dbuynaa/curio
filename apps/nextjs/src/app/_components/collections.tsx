"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@acme/api";

import { useTRPC } from "~/trpc/react";

export function CollectionsSection() {
  const trpc = useTRPC();
  const { data: collections } = useSuspenseQuery(
    trpc.collection.recent.queryOptions(),
  );

  if (collections.length === 0) {
    return (
      <div className="border-border bg-paper text-muted flex flex-col items-center justify-center gap-2 rounded-2xl border p-6">
        <p className="text-center text-sm">No collections found.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {collections.map((c, idx) => (
        <CollectionCard key={c.id} collection={c} idx={idx} />
      ))}
    </div>
  );
}

function CollectionCard({
  collection: c,
  idx,
}: {
  collection: RouterOutputs["collection"]["recent"][number];
  idx: number;
}) {
  return (
    <Link
      href={`/collection/${c.id}`}
      className="group bg-paper border-border hover:border-foreground/30 flex flex-col overflow-hidden rounded-2xl border transition-colors"
    >
      <div className="aspect-[4/3] overflow-hidden bg-stone-100">
        {c.coverImageUrl && (
          <img
            src={c.coverImageUrl}
            alt={c.title}
            loading={idx < 3 ? "eager" : "lazy"}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold tracking-tight">{c.title}</h3>
          <span className="text-muted-soft shrink-0 text-[11px]">
            {c.itemCount} items
          </span>
        </div>
        <div className="text-muted flex items-center gap-2 text-xs">
          {c.owner?.avatarUrl && (
            <img
              src={c.owner.avatarUrl}
              alt={c.owner.displayName ?? c.owner.username}
              loading="lazy"
              className="size-5 rounded-full object-cover"
            />
          )}
          <span>@{c.owner?.username}</span>
        </div>
        <div className="text-muted mt-auto flex items-center gap-3 pt-3 text-[11px]">
          <span>♡ {c.likeCount}</span>
          <span>◳ {c.saveCount}</span>
          {c.tags[0] && (
            <span className="text-muted-soft ml-auto">{c.tags[0]}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function CollectionCardSkeleton() {
  return (
    <div className="bg-paper border-border flex animate-pulse flex-col overflow-hidden rounded-2xl border">
      <div className="aspect-[4/3] bg-stone-100" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="h-4 w-1/2 rounded-full bg-stone-200" />
        <div className="h-3 w-1/3 rounded-full bg-stone-200" />
        <div className="mt-auto flex items-center gap-3 pt-3">
          <div className="h-3 w-1/4 rounded-full bg-stone-200" />
          <div className="h-3 w-1/4 rounded-full bg-stone-200" />
          <div className="ml-auto h-3 w-1/4 rounded-full bg-stone-200" />
        </div>
      </div>
    </div>
  );
}
