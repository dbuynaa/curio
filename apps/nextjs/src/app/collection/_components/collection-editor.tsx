"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "@acme/api";
import type { ItemFormValues, NewCollectionFormValues } from "@acme/validators";
import { Button } from "@acme/ui/button";
import { Field, FieldContent, FieldError, FieldLabel } from "@acme/ui/field";
import { Input } from "@acme/ui/input";
import { Textarea } from "@acme/ui/textarea";
import { toast } from "@acme/ui/toast";
import {
  itemFormSchema,
  newCollectionFormSchema,
  publishCollectionFormSchema,
  toCollectionInsert,
  toItemInsert,
} from "@acme/validators";

import { ImageUpload } from "~/app/_components/image-upload";
import { SiteFooter, SiteNav } from "~/app/_components/site-nav";
import { TagInput } from "~/app/_components/tag-input";
import { useTRPC } from "~/trpc/react";

type EditableCollection = RouterOutputs["collection"]["byId"];
type CollectionFormValues = Omit<NewCollectionFormValues, "items"> & {
  items: (ItemFormValues & { id?: string })[];
  visibility: "public" | "unlisted" | "private";
};

function emptyItem(): ItemFormValues {
  return {
    title: "",
    sourceUrl: "",
    description: "",
    thumbnailUrl: "",
    contentType: "link",
    matureContent: false,
  };
}

export function CollectionEditor({
  collection,
}: {
  collection?: EditableCollection;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [fastAddUrl, setFastAddUrl] = useState("");
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  const createCollection = useMutation(
    trpc.collection.create.mutationOptions({
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in to create a collection"
            : "Failed to create the collection",
        );
      },
    }),
  );

  const createItem = useMutation(
    trpc.item.create.mutationOptions({
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateCollection = useMutation(
    trpc.collection.update.mutationOptions({
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateItem = useMutation(
    trpc.item.update.mutationOptions({
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteItem = useMutation(
    trpc.item.delete.mutationOptions({
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteCollection = useMutation(
    trpc.collection.delete.mutationOptions({
      onError: (err) => toast.error(err.message),
    }),
  );

  const reorderItems = useMutation(
    trpc.collection.reorderItems.mutationOptions({
      onError: (err) => toast.error(err.message),
    }),
  );

  const publish = useMutation(
    trpc.collection.publish.mutationOptions({
      onError: (err) => toast.error(err.message),
    }),
  );

  const unpublish = useMutation(
    trpc.collection.unpublish.mutationOptions({
      onError: (err) => toast.error(err.message),
    }),
  );

  const isSubmitting =
    createCollection.isPending ||
    createItem.isPending ||
    updateCollection.isPending ||
    updateItem.isPending ||
    deleteItem.isPending ||
    deleteCollection.isPending ||
    reorderItems.isPending ||
    publish.isPending ||
    unpublish.isPending;

  const form = useForm({
    defaultValues: {
      title: collection?.title ?? "",
      description: collection?.description ?? "",
      tags: collection?.tags ?? [],
      coverImageUrl: collection?.coverImageUrl ?? "",
      matureContent: collection?.matureContent ?? false,
      visibility: collection?.isPublished ? collection.visibility : "private",
      items: collection?.items.map((item) => ({
        id: item.id,
        title: item.title,
        sourceUrl: item.sourceUrl ?? "",
        description: item.description ?? "",
        thumbnailUrl: item.thumbnailUrl ?? "",
        contentType: item.contentType,
        matureContent: item.matureContent,
      })) ?? [emptyItem()],
    } as CollectionFormValues,

    validators: { onSubmit: publishCollectionFormSchema },

    onSubmit: async ({ value }) => {
      await saveCollection(value, true);
    },
  });

  async function saveCollection(
    value: CollectionFormValues,
    publishNow: boolean,
  ) {
    if (publishNow && value.visibility === "private") {
      toast.error("Choose Public or Unlisted before publishing");
      return;
    }

    const draftValidation = newCollectionFormSchema.safeParse(value);
    if (!draftValidation.success) {
      toast.error(draftValidation.error.issues[0]?.message ?? "Invalid form");
      return;
    }

    const savedCollection = collection
      ? await updateCollection.mutateAsync({
          id: collection.id,
          ...toCollectionInsert(value),
        })
      : await createCollection.mutateAsync(toCollectionInsert(value));
    if (!savedCollection) return;

    const savedItemIds: string[] = [];
    for (const item of value.items) {
      const itemInput = toItemInsert(item);
      const saved = item.id
        ? await updateItem.mutateAsync({ id: item.id, ...itemInput })
        : await createItem.mutateAsync({
            collectionId: savedCollection.id,
            ...itemInput,
          });
      if (saved) savedItemIds.push(saved.id);
    }

    if (collection) {
      const retainedItemIds = new Set(
        value.items.flatMap((item) => (item.id ? [item.id] : [])),
      );
      await Promise.all(
        collection.items
          .filter((item) => !retainedItemIds.has(item.id))
          .map((item) => deleteItem.mutateAsync({ id: item.id })),
      );
    }

    if (savedItemIds.length > 0) {
      await reorderItems.mutateAsync({
        collectionId: savedCollection.id,
        orderedItemIds: savedItemIds,
      });
    }

    if (publishNow) {
      const publishVisibility =
        value.visibility === "private" ? "public" : value.visibility;
      await publish.mutateAsync({
        id: savedCollection.id,
        visibility: publishVisibility,
      });
    }

    await queryClient.invalidateQueries(trpc.collection.pathFilter());
    router.push(`/collection/${savedCollection.id}`);
  }

  async function handleFastAdd(rawUrl: string) {
    const url = rawUrl.trim();
    if (!url) return;

    setIsFetchingMetadata(true);
    try {
      const metadata = await queryClient.fetchQuery(
        trpc.item.fetchMetadata.queryOptions({ url }),
      );

      const nextItem: ItemFormValues = {
        sourceUrl: url,
        title: metadata?.title ?? url,
        description: "",
        thumbnailUrl: metadata?.thumbnailUrl ?? "",
        contentType: metadata?.contentType ?? "link",
        matureContent: false,
      };

      form.setFieldValue("items", (items) => [...items, nextItem]);
      setFastAddUrl("");
    } catch {
      form.setFieldValue("items", (items) => [
        ...items,
        { ...emptyItem(), sourceUrl: url, title: url },
      ]);
      setFastAddUrl("");
    } finally {
      setIsFetchingMetadata(false);
    }
  }

  function handleDeleteCollection() {
    if (!collection) return;
    if (!window.confirm("Delete this collection and all of its items?")) return;
    deleteCollection.mutate(
      { id: collection.id },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries(trpc.collection.pathFilter());
          router.push("/");
        },
      },
    );
  }

  function handleUnpublish() {
    if (!collection) return;
    unpublish.mutate(
      { id: collection.id },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries(trpc.collection.pathFilter());
          toast.success("Collection unpublished");
          router.refresh();
        },
      },
    );
  }

  const hasItemMatureWithoutCollection = form.state.values.items.some(
    (item) => item.matureContent,
  );

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteNav />
      <main className="animate-reveal mx-auto max-w-3xl px-6 py-12">
        <header className="border-foreground mb-10 border-b pb-6">
          <div className="text-primary mb-3 font-mono text-[10px] tracking-widest uppercase">
            Composer / {collection ? "Edit" : "Draft"}
          </div>
          <h1 className="text-4xl font-semibold tracking-tighter">
            {collection ? "Edit collection" : "Begin a collection"}
          </h1>
          <p className="text-muted mt-3 text-sm">
            Give your collection a title and thesis, then add links with a
            source URL for each pick.
          </p>
        </header>

        <form
          className="space-y-12"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <section className="space-y-4">
            <span className="text-primary font-mono text-[10px] tracking-widest uppercase">
              01 / Identity
            </span>

            <form.Field
              name="title"
              validators={{ onChange: newCollectionFormSchema.shape.title }}
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldContent>
                      <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                    </FieldContent>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="e.g. Late-night Brutalist Reading"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            <form.Field
              name="description"
              children={(field) => (
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor={field.name}>
                      Thesis / description (optional)
                    </FieldLabel>
                  </FieldContent>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    rows={3}
                    placeholder="What is this collection arguing for?"
                  />
                </Field>
              )}
            />

            <form.Field
              name="tags"
              children={(field) => (
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor={field.name}>
                      Tags (optional)
                    </FieldLabel>
                  </FieldContent>
                  <TagInput
                    id={field.name}
                    tags={field.state.value}
                    onChange={field.handleChange}
                    placeholder="#brutalism, #concrete, #archive"
                  />
                </Field>
              )}
            />

            <form.Field
              name="coverImageUrl"
              children={(field) => (
                <ImageUpload
                  label="Collection cover (optional)"
                  value={field.state.value}
                  onChange={field.handleChange}
                  purpose="collection-cover"
                />
              )}
            />

            <form.Field
              name="visibility"
              children={(field) => (
                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor={field.name}>
                      Visibility when published
                    </FieldLabel>
                  </FieldContent>
                  <select
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) =>
                      field.handleChange(
                        event.target
                          .value as CollectionFormValues["visibility"],
                      )
                    }
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
                  >
                    <option value="private">Private (draft)</option>
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                  </select>
                </Field>
              )}
            />

            <form.Field
              name="matureContent"
              children={(field) => (
                <Field>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.checked)
                      }
                      className="accent-foreground size-4"
                    />
                    <span className="text-sm">
                      Flag collection as mature content
                    </span>
                  </label>
                </Field>
              )}
            />
          </section>

          <section className="border-border space-y-6 border-t pt-10">
            <form.Field name="items" mode="array">
              {(itemsField) => (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-primary font-mono text-[10px] tracking-widest uppercase">
                      02 / Items ({itemsField.state.value.length})
                    </span>
                    <span className="text-muted font-mono text-[10px] tracking-widest uppercase">
                      Drag to reorder
                    </span>
                  </div>

                  <Field>
                    <FieldContent>
                      <FieldLabel htmlFor="fast-add-url">
                        Paste a URL to add an item
                      </FieldLabel>
                    </FieldContent>
                    <Input
                      id="fast-add-url"
                      value={fastAddUrl}
                      onChange={(event) => setFastAddUrl(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleFastAdd(fastAddUrl);
                        }
                      }}
                      onPaste={(event) => {
                        const pasted = event.clipboardData.getData("text");
                        if (pasted.startsWith("http")) {
                          event.preventDefault();
                          void handleFastAdd(pasted);
                        }
                      }}
                      placeholder="https://"
                      className="font-mono text-sm"
                      disabled={isFetchingMetadata}
                    />
                    {isFetchingMetadata ? (
                      <p className="text-muted mt-1 font-mono text-[10px] uppercase">
                        Fetching metadata...
                      </p>
                    ) : null}
                  </Field>

                  <div className="space-y-4">
                    {itemsField.state.value.map((_, index) => (
                      <article
                        key={index}
                        draggable
                        onDragStart={() => setDragIndex(index)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (dragIndex === null || dragIndex === index) return;
                          itemsField.moveValue(dragIndex, index);
                          setDragIndex(null);
                        }}
                        onDragEnd={() => setDragIndex(null)}
                        className={`border-border bg-paper relative space-y-4 border p-5 transition-opacity ${
                          dragIndex === index ? "opacity-50" : ""
                        }`}
                      >
                        <header className="border-border flex items-center justify-between border-b pb-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              className="text-muted hover:text-foreground cursor-grab font-mono text-[10px] tracking-widest uppercase active:cursor-grabbing"
                              aria-label={`Drag item ${index + 1} to reorder`}
                            >
                              ↕ Drag
                            </button>
                            <span className="text-muted font-mono text-[10px] tracking-widest uppercase">
                              Item {String(index + 1).padStart(2, "0")}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => itemsField.removeValue(index)}
                            disabled={itemsField.state.value.length === 1}
                            className="text-muted hover:text-primary font-mono text-[10px] tracking-widest uppercase disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={`Remove item ${index + 1}`}
                          >
                            × Remove
                          </button>
                        </header>

                        <form.Field
                          name={`items[${index}].sourceUrl`}
                          validators={{
                            onChange: itemFormSchema.shape.sourceUrl,
                          }}
                          children={(field) => {
                            const isInvalid =
                              field.state.meta.isTouched &&
                              !field.state.meta.isValid;
                            return (
                              <Field data-invalid={isInvalid}>
                                <FieldContent>
                                  <FieldLabel htmlFor={field.name}>
                                    Source URL (required to publish)
                                  </FieldLabel>
                                </FieldContent>
                                <Input
                                  id={field.name}
                                  name={field.name}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value)
                                  }
                                  placeholder="https://"
                                  className="font-mono text-sm"
                                  aria-invalid={isInvalid}
                                />
                                {isInvalid && (
                                  <FieldError
                                    errors={field.state.meta.errors}
                                  />
                                )}
                              </Field>
                            );
                          }}
                        />

                        <form.Field
                          name={`items[${index}].title`}
                          validators={{ onChange: itemFormSchema.shape.title }}
                          children={(field) => {
                            const isInvalid =
                              field.state.meta.isTouched &&
                              !field.state.meta.isValid;
                            return (
                              <Field data-invalid={isInvalid}>
                                <FieldContent>
                                  <FieldLabel htmlFor={field.name}>
                                    Title
                                  </FieldLabel>
                                </FieldContent>
                                <Input
                                  id={field.name}
                                  name={field.name}
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value)
                                  }
                                  aria-invalid={isInvalid}
                                />
                                {isInvalid && (
                                  <FieldError
                                    errors={field.state.meta.errors}
                                  />
                                )}
                              </Field>
                            );
                          }}
                        />

                        <form.Field
                          name={`items[${index}].description`}
                          children={(field) => (
                            <Field>
                              <FieldContent>
                                <FieldLabel htmlFor={field.name}>
                                  Why did you pick this?
                                </FieldLabel>
                              </FieldContent>
                              <Textarea
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                rows={3}
                                placeholder="Why does this belong here? (optional)"
                              />
                            </Field>
                          )}
                        />

                        <form.Field
                          name={`items[${index}].thumbnailUrl`}
                          children={(field) => (
                            <ImageUpload
                              label="Item image (optional)"
                              value={field.state.value}
                              onChange={field.handleChange}
                              purpose="item-thumbnail"
                            />
                          )}
                        />

                        <form.Field
                          name={`items[${index}].matureContent`}
                          children={(field) => (
                            <Field>
                              <label className="flex cursor-pointer items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={field.state.value}
                                  onChange={(event) =>
                                    field.handleChange(event.target.checked)
                                  }
                                  className="accent-foreground size-4"
                                />
                                <span className="text-sm">
                                  Flag as mature content
                                </span>
                              </label>
                            </Field>
                          )}
                        />
                      </article>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => itemsField.pushValue(emptyItem())}
                    className="border-border hover:border-foreground hover:text-foreground text-muted flex w-full items-center justify-center gap-2 border border-dashed bg-transparent py-4 font-mono text-[10px] tracking-widest uppercase transition-colors"
                  >
                    + Add another item
                  </button>
                </>
              )}
            </form.Field>

            {hasItemMatureWithoutCollection &&
            !form.state.values.matureContent ? (
              <p className="text-muted border-border border-l-2 pl-3 text-sm">
                One or more items are flagged as mature. Consider flagging the
                collection too so viewers know what to expect.
              </p>
            ) : null}
          </section>

          <div className="border-foreground flex flex-wrap items-center justify-between gap-4 border-t pt-8">
            <div className="flex flex-col gap-2">
              <span className="text-muted font-mono text-[10px] tracking-widest uppercase">
                {collection?.isPublished ? "Published" : "Draft / private"}
              </span>
              {collection ? (
                <button
                  type="button"
                  onClick={handleDeleteCollection}
                  disabled={isSubmitting}
                  className="text-destructive text-left font-mono text-[10px] tracking-widest uppercase hover:underline disabled:opacity-50"
                >
                  Delete collection
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {collection?.isPublished ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={handleUnpublish}
                >
                  Unpublish
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => saveCollection(form.state.values, false)}
              >
                {collection ? "Save changes" : "Save draft"}
              </Button>
              {!collection?.isPublished ? (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Publishing..." : "Publish collection"}
                </Button>
              ) : null}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
