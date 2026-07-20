"use client";

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
import { useTRPC } from "~/trpc/react";

type EditableCollection = RouterOutputs["collection"]["byId"];
type CollectionFormValues = Omit<NewCollectionFormValues, "items"> & {
  items: Array<ItemFormValues & { id?: string }>;
};

function emptyItem(): ItemFormValues {
  return {
    title: "",
    sourceUrl: "",
    creatorName: "",
    description: "",
    thumbnailUrl: "",
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

  const publish = useMutation(
    trpc.collection.publish.mutationOptions({
      onError: (err) => toast.error(err.message),
    }),
  );

  const isSubmitting =
    createCollection.isPending ||
    createItem.isPending ||
    updateCollection.isPending ||
    updateItem.isPending ||
    deleteItem.isPending ||
    publish.isPending;

  const form = useForm({
    defaultValues: {
      title: collection?.title ?? "",
      description: collection?.description ?? "",
      tags: collection?.tags ?? [],
      coverImageUrl: collection?.coverImageUrl ?? "",
      items: collection?.items.map((item) => ({
        id: item.id,
        title: item.title,
        sourceUrl: item.sourceUrl ?? "",
        creatorName: item.creatorName ?? "",
        description: item.description ?? "",
        thumbnailUrl: item.thumbnailUrl ?? "",
      })) ?? [emptyItem()],
    } as CollectionFormValues,

    validators: { onSubmit: publishCollectionFormSchema },

    onSubmit: async ({ value }) => {
      await saveCollection(value as CollectionFormValues, true);
    },
  });

  async function saveCollection(
    value: CollectionFormValues,
    publishNow: boolean,
  ) {
    const savedCollection = collection
      ? await updateCollection.mutateAsync({
          id: collection.id,
          ...toCollectionInsert(value),
        })
      : await createCollection.mutateAsync(toCollectionInsert(value));
    if (!savedCollection) return;

    await Promise.all(
      value.items.map((item) => {
        const itemInput = toItemInsert(item);
        return item.id
          ? updateItem.mutateAsync({ id: item.id, ...itemInput })
          : createItem.mutateAsync({
              collectionId: savedCollection.id,
              ...itemInput,
            });
      }),
    );

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

    if (publishNow) {
      await publish.mutateAsync({
        id: savedCollection.id,
        visibility: "public",
      });
    }

    await queryClient.invalidateQueries(trpc.collection.pathFilter());
    router.push(`/collection/${savedCollection.id}`);
  }

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
            Give your collection a title, a thesis, and clear attribution for
            every item.
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
                      Thesis / description
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
                    <FieldLabel htmlFor={field.name}>Tags</FieldLabel>
                  </FieldContent>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value.join(" ")}
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value
                          .split(/\s+/)
                          .map((t) => t.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="#brutalism #concrete #archive"
                    className="font-mono text-sm"
                  />
                </Field>
              )}
            />

            <form.Field
              name="coverImageUrl"
              children={(field) => (
                <ImageUpload
                  label="Collection cover"
                  value={field.state.value}
                  onChange={field.handleChange}
                  purpose="collection-cover"
                />
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
                      Add as many as you need
                    </span>
                  </div>

                  <div className="space-y-4">
                    {itemsField.state.value.map((_, index) => (
                      <article
                        key={index}
                        className="border-border bg-paper relative space-y-4 border p-5"
                      >
                        <header className="border-border flex items-center justify-between border-b pb-3">
                          <span className="text-muted font-mono text-[10px] tracking-widest uppercase">
                            Item {String(index + 1).padStart(2, "0")}
                          </span>
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

                        <div className="grid gap-4 md:grid-cols-2">
                          <form.Field
                            name={`items[${index}].title`}
                            validators={{
                              onChange: itemFormSchema.shape.title,
                            }}
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
                            name={`items[${index}].creatorName`}
                            children={(field) => (
                              <Field>
                                <FieldContent>
                                  <FieldLabel htmlFor={field.name}>
                                    Attributed to
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
                                  placeholder="Original creator"
                                />
                              </Field>
                            )}
                          />
                        </div>

                        <form.Field
                          name={`items[${index}].description`}
                          children={(field) => {
                            const isInvalid =
                              field.state.meta.isTouched &&
                              !field.state.meta.isValid;
                            return (
                              <Field data-invalid={isInvalid}>
                                <FieldContent>
                                  <FieldLabel htmlFor={field.name}>
                                    Your note (required to publish)
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
                                  placeholder="Why does this belong here?"
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
                          name={`items[${index}].thumbnailUrl`}
                          children={(field) => (
                            <ImageUpload
                              label="Item image"
                              value={field.state.value}
                              onChange={field.handleChange}
                              purpose="item-thumbnail"
                            />
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
          </section>

          <div className="border-foreground flex items-center justify-between border-t pt-8">
            <span className="text-muted font-mono text-[10px] tracking-widest uppercase">
              {collection?.isPublished ? "Published" : "Draft / not yet public"}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() =>
                  saveCollection(
                    form.state.values as CollectionFormValues,
                    false,
                  )
                }
              >
                {collection ? "Save changes" : "Save draft"}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Publishing…"
                  : collection?.isPublished
                    ? "Publish updates"
                    : "Publish collection"}
              </Button>
            </div>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
