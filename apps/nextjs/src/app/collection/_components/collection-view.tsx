"use client";

import Link from "next/link";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { toast } from "@acme/ui/toast";

import { slugify } from "~/lib/utils";
import { useTRPC } from "~/trpc/react";

export function CollectionView({ id }: { id: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: collection } = useSuspenseQuery(
    trpc.collection.byId.queryOptions({ id }),
  );

  const curator = collection.owner;
  const curatorUsername = curator?.username ?? "unknown";
  const curatorName = curator?.displayName ?? curatorUsername;

  const likeMutation = useMutation(
    trpc.social.toggleCollectionLike.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.collection.byId.queryKey({ id }),
        });
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "Sign in to like this collection"
            : err.message,
        );
      },
    }),
  );

  const saveMutation = useMutation(
    trpc.social.toggleSave.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.collection.byId.queryKey({ id }),
        });
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "Sign in to save this collection"
            : err.message,
        );
      },
    }),
  );

  return (
    <>
      <header className="animate-reveal mb-16 max-w-2xl">
        <div className="text-primary mb-4 font-mono text-[10px] tracking-widest uppercase">
          Collection
        </div>
        <h1 className="mb-6 text-5xl font-semibold tracking-tighter text-balance">
          {collection.title}
        </h1>
        {collection.description ? (
          <p className="text-muted text-lg leading-relaxed">
            {collection.description}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {collection.tags.map((tag) => (
            <Link
              key={tag}
              href={"/search?q=" + encodeURIComponent(tag.replace(/^#/, ""))}
              className="bg-paper border-border hover:border-primary hover:text-primary border px-2 py-1 font-mono text-[11px] transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>

        <div className="border-border mt-8 flex items-center gap-3 border-t pt-6">
          {curator?.avatarUrl ? (
            <img
              src={curator.avatarUrl}
              alt={curatorName}
              width={32}
              height={32}
              className="size-8 rounded-full object-cover"
            />
          ) : null}
          <div className="flex-1">
            <Link
              href={"/u/" + curatorUsername}
              className="hover:text-primary text-sm font-medium transition-colors"
            >
              {"Curated by @" + curatorUsername}
            </Link>
            <div className="text-muted font-mono text-[10px] tracking-widest uppercase">
              {String(collection.items.length).padStart(3, "0")} items
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={likeMutation.isPending}
              onClick={() => likeMutation.mutate({ collectionId: id })}
              className="border-border bg-paper hover:border-primary hover:text-primary border px-3 py-2 font-mono text-[10px] tracking-widest uppercase transition-colors disabled:opacity-50"
            >
              {"Like (" + collection.likeCount + ")"}
            </button>
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate({ collectionId: id })}
              className="border-border bg-paper hover:border-primary hover:text-primary border px-3 py-2 font-mono text-[10px] tracking-widest uppercase transition-colors disabled:opacity-50"
            >
              {"Save (" + collection.saveCount + ")"}
            </button>
          </div>
        </div>
      </header>

      <div className="animate-reveal space-y-24 [animation-delay:150ms]">
        {collection.items.map((item, idx) => {
          const reversed = idx % 2 === 1;
          return (
            <article
              key={item.id}
              className="grid items-center gap-12 md:grid-cols-2"
            >
              <div className={reversed ? "md:order-2" : ""}>
                <a
                  href={item.sourceUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="outline-border bg-paper group block aspect-square overflow-hidden outline-1 outline-offset-4"
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      loading="lazy"
                      width={800}
                      height={800}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                  ) : null}
                </a>
              </div>
              <div className={reversed ? "md:order-1" : ""}>
                <div className="bg-paper border-border border p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.02)]">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-lg leading-tight font-semibold">
                        {item.title}
                      </h4>
                      <p className="text-muted mt-1 font-mono text-[10px] tracking-widest uppercase">
                        {item.contentType}
                      </p>
                    </div>
                    <span className="text-primary shrink-0 font-mono text-[10px]">
                      {"#" + String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {item.creatorName ? (
                    <div className="border-border mb-6 flex items-baseline justify-between gap-4 border-b pb-4">
                      <div>
                        <div className="text-muted font-mono text-[10px] tracking-widest uppercase">
                          Attributed to
                        </div>
                        <Link
                          href={"/creator/" + slugify(item.creatorName)}
                          className="hover:text-primary font-medium transition-colors"
                        >
                          {item.creatorName}
                        </Link>
                      </div>
                      <a
                        href={item.sourceUrl ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted hover:text-primary font-mono text-[10px] tracking-widest uppercase"
                      >
                        Source
                      </a>
                    </div>
                  ) : null}

                  {item.description ? (
                    <p className="text-foreground font-serif text-lg leading-relaxed italic">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
