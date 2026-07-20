"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { toast } from "@acme/ui/toast";

import { slugify } from "~/lib/utils";
import { useTRPC } from "~/trpc/react";

function formatCount(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function ShareControls({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link");
    }
  }

  async function share() {
    try {
      await navigator.share({ title, url: window.location.href });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // Closing the native share dialog is not an error the visitor needs to see.
        return;
      }
    }
    await copyLink();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => void share()}
        className="bg-foreground text-background hover:bg-foreground/85 border-foreground border px-4 py-2.5 font-mono text-[10px] uppercase transition-colors"
      >
        Share collection
      </button>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="border-border bg-background hover:border-foreground border px-4 py-2.5 font-mono text-[10px] uppercase transition-colors"
      >
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}

function OwnerControls({ id }: { id: string }) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deleteCollection = useMutation(
    trpc.collection.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.collection.pathFilter());
        toast.success("Collection deleted");
        router.push("/");
        router.refresh();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  function handleDelete() {
    if (!window.confirm("Delete this collection and all of its items?")) return;
    deleteCollection.mutate({ id });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/collection/${id}/edit`}
        className="border-border bg-background hover:border-foreground border px-4 py-2.5 font-mono text-[10px] uppercase transition-colors"
      >
        Edit collection
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleteCollection.isPending}
        className="border-destructive/50 text-destructive hover:border-destructive border px-4 py-2.5 font-mono text-[10px] uppercase transition-colors disabled:opacity-50"
      >
        {deleteCollection.isPending ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}

function ItemLikeButton({
  itemId,
  likeCount,
  collectionId,
}: {
  itemId: string;
  likeCount: number;
  collectionId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const like = useMutation(
    trpc.social.toggleItemLike.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.collection.byId.queryKey({ id: collectionId }),
        });
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "Sign in to like this item"
            : err.message,
        );
      },
    }),
  );

  return (
    <button
      type="button"
      onClick={() => like.mutate({ itemId })}
      disabled={like.isPending}
      className="text-muted hover:text-foreground border-border hover:border-foreground border px-3 py-2 font-mono text-[10px] uppercase transition-colors disabled:opacity-50"
    >
      Like {formatCount(likeCount)}
    </button>
  );
}

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
      <header className="animate-reveal border-foreground grid border-y md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div className="flex min-h-[31rem] flex-col justify-between px-6 py-8 sm:px-10 sm:py-12">
          <div>
            <div className="text-primary mb-6 font-mono text-[10px] uppercase">
              Curated collection /{" "}
              {String(collection.items.length).padStart(2, "0")} picks
            </div>
            <h1 className="max-w-3xl text-4xl leading-[0.98] font-semibold text-balance sm:text-6xl">
              {collection.title}
            </h1>
            {collection.description ? (
              <p className="text-muted mt-7 max-w-2xl text-base leading-relaxed sm:text-lg">
                {collection.description}
              </p>
            ) : null}
          </div>

          <div className="border-border mt-10 flex flex-col gap-6 border-t pt-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              {curator?.avatarUrl ? (
                <img
                  src={curator.avatarUrl}
                  alt={curatorName}
                  width={42}
                  height={42}
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <div className="bg-secondary text-secondary-foreground grid size-10 place-items-center rounded-full text-sm font-semibold">
                  {curatorName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-muted font-mono text-[10px] uppercase">
                  Curated by
                </p>
                <Link
                  href={`/u/${curatorUsername}`}
                  className="hover:text-primary text-sm font-medium transition-colors"
                >
                  {curatorName}{" "}
                  <span className="text-muted">@{curatorUsername}</span>
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <ShareControls title={collection.title} />
              {collection.isOwner ? <OwnerControls id={id} /> : null}
            </div>
          </div>
        </div>

        <div className="border-border relative min-h-72 overflow-hidden border-t md:min-h-full md:border-t-0 md:border-l">
          {collection.coverImageUrl ? (
            <img
              src={collection.coverImageUrl}
              alt={`Cover for ${collection.title}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="bg-secondary text-secondary-foreground absolute inset-0 p-8">
              <div className="border-secondary-foreground/20 flex h-full flex-col justify-between border p-6">
                <span className="font-mono text-[10px] uppercase">Curio</span>
                <span className="max-w-xs text-3xl leading-none font-semibold text-balance">
                  A record of considered taste.
                </span>
              </div>
            </div>
          )}
          <div className="bg-background/90 absolute right-0 bottom-0 left-0 p-5 backdrop-blur-sm">
            <dl className="divide-border grid grid-cols-3 divide-x">
              <div className="pr-3">
                <dt className="text-muted font-mono text-[9px] uppercase">
                  Picks
                </dt>
                <dd className="mt-1 text-xl font-semibold">
                  {formatCount(collection.items.length)}
                </dd>
              </div>
              <div className="px-3">
                <dt className="text-muted font-mono text-[9px] uppercase">
                  Likes
                </dt>
                <dd className="mt-1 text-xl font-semibold">
                  {formatCount(collection.likeCount)}
                </dd>
              </div>
              <div className="pl-3">
                <dt className="text-muted font-mono text-[9px] uppercase">
                  Saves
                </dt>
                <dd className="mt-1 text-xl font-semibold">
                  {formatCount(collection.saveCount)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </header>

      <section className="animate-reveal border-border border-b py-5 [animation-delay:100ms]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {collection.tags.length > 0 ? (
              collection.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/search?q=${encodeURIComponent(tag.replace(/^#/, ""))}`}
                  className="border-border text-muted hover:border-primary hover:text-primary border px-2.5 py-1 font-mono text-[10px] uppercase transition-colors"
                >
                  {tag}
                </Link>
              ))
            ) : (
              <span className="text-muted font-mono text-[10px] uppercase">
                A collection with reasons attached
              </span>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={likeMutation.isPending}
              onClick={() => likeMutation.mutate({ collectionId: id })}
              className="border-border hover:border-foreground border px-3 py-2 font-mono text-[10px] uppercase transition-colors disabled:opacity-50"
            >
              Like {formatCount(collection.likeCount)}
            </button>
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate({ collectionId: id })}
              className="border-border hover:border-foreground border px-3 py-2 font-mono text-[10px] uppercase transition-colors disabled:opacity-50"
            >
              Save {formatCount(collection.saveCount)}
            </button>
          </div>
        </div>
      </section>

      <section className="animate-reveal py-14 [animation-delay:150ms] sm:py-20">
        <div className="border-foreground mb-10 flex items-end justify-between border-b pb-4">
          <div>
            <p className="text-primary font-mono text-[10px] uppercase">
              The selections
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Every pick, and why it belongs.
            </h2>
          </div>
          <span className="text-muted font-mono text-[10px] uppercase">
            {String(collection.items.length).padStart(2, "0")} items
          </span>
        </div>

        <div className="divide-border divide-y">
          {collection.items.map((item, index) => (
            <article
              key={item.id}
              className="grid gap-6 py-10 md:grid-cols-[4.5rem_minmax(0,0.9fr)_minmax(18rem,1.1fr)] md:gap-10"
            >
              <span className="text-primary font-mono text-xs">
                {String(index + 1).padStart(2, "0")}
              </span>

              <a
                href={item.sourceUrl ?? undefined}
                target="_blank"
                rel="noreferrer"
                aria-label={
                  item.sourceUrl
                    ? `Open ${item.title} at its source`
                    : undefined
                }
                className={`border-border group bg-secondary relative block aspect-[4/3] overflow-hidden border ${
                  item.sourceUrl
                    ? "hover:border-foreground"
                    : "pointer-events-none"
                }`}
              >
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="text-secondary-foreground flex h-full flex-col justify-between p-5">
                    <span className="font-mono text-[10px] uppercase">
                      {item.contentType}
                    </span>
                    <span className="max-w-[14ch] text-2xl leading-none font-semibold text-balance">
                      {item.title}
                    </span>
                  </div>
                )}
                {item.sourceUrl ? (
                  <span className="bg-background/90 text-foreground absolute right-3 bottom-3 px-2 py-1 font-mono text-[9px] uppercase">
                    Open source
                  </span>
                ) : null}
              </a>

              <div className="flex flex-col items-start">
                <div className="flex w-full flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-primary font-mono text-[10px] uppercase">
                      {item.contentType}
                    </p>
                    <h3 className="mt-2 text-2xl leading-tight font-semibold text-balance">
                      {item.title}
                    </h3>
                  </div>
                  {item.frequencyCount > 0 ? (
                    <span className="text-muted border-border border px-2 py-1 font-mono text-[9px] uppercase">
                      In {formatCount(item.frequencyCount)} collections
                    </span>
                  ) : null}
                </div>

                {item.creatorName ? (
                  <div className="border-primary mt-5 border-l-2 pl-3">
                    <p className="text-muted font-mono text-[10px] uppercase">
                      Attributed to
                    </p>
                    <Link
                      href={`/creator/${slugify(item.creatorName)}`}
                      className="hover:text-primary mt-1 inline-block font-medium transition-colors"
                    >
                      {item.creatorName}
                    </Link>
                  </div>
                ) : null}

                {item.description ? (
                  <blockquote className="border-foreground mt-7 max-w-xl border-l pl-5 font-serif text-xl leading-relaxed italic">
                    {item.description}
                  </blockquote>
                ) : null}

                <div className="mt-8 flex flex-wrap gap-2">
                  <ItemLikeButton
                    itemId={item.id}
                    likeCount={item.likeCount}
                    collectionId={id}
                  />
                  {item.commentCount > 0 ? (
                    <span className="text-muted border-border border px-3 py-2 font-mono text-[10px] uppercase">
                      {formatCount(item.commentCount)} comments
                    </span>
                  ) : null}
                  {item.sourceUrl ? (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted hover:text-foreground border-border hover:border-foreground border px-3 py-2 font-mono text-[10px] uppercase transition-colors"
                    >
                      View source
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
