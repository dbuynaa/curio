import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import type { db as dbClient } from "@acme/db/client";
import { and, eq, sql } from "@acme/db";
import { collections, creators, items } from "@acme/db/schema";

import {
  normalizeCreatorName,
  normalizeSourceUrl,
} from "../services/normalize";
import { fetchOpenGraphMetadata } from "../services/open-graph";
import { validateResolvableUrl } from "../services/validate-url";
import { createTRPCRouter, protectedProfileProcedure } from "../trpc";

type Database = typeof dbClient;

async function assertOwnsParentCollection(
  db: Database,
  collectionId: string,
  userId: string,
) {
  const collection = await db.query.collections.findFirst({
    where: eq(collections.id, collectionId),
  });
  if (!collection) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
  }
  if (collection.userId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't own this collection",
    });
  }
  return collection;
}

async function resolveCreatorId(
  db: Database,
  creatorName: string | undefined | null,
  creatorUrl: string | undefined | null,
) {
  if (!creatorName) return null;

  const normalizedName = normalizeCreatorName(creatorName);

  const existing = await db.query.creators.findFirst({
    where: eq(creators.normalizedName, normalizedName),
  });
  if (existing) return existing.id;

  const [created] = await db
    .insert(creators)
    .values({
      normalizedName,
      displayName: creatorName.trim(),
      canonicalUrl: creatorUrl ?? undefined,
    })
    .returning({ id: creators.id });

  return created?.id ?? null;
}

async function nextPosition(db: Database, collectionId: string) {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${items.position}), -1)` })
    .from(items)
    .where(eq(items.collectionId, collectionId));
  return (row?.max ?? -1) + 1;
}

async function validateSourceUrlIfPresent(
  sourceUrl: string | null | undefined,
) {
  if (!sourceUrl?.trim()) return;
  const result = await validateResolvableUrl(sourceUrl);
  if (!result.ok) {
    throw new TRPCError({ code: "BAD_REQUEST", message: result.message });
  }
}

export const itemRouter = createTRPCRouter({
  // FR-4.1 — paste URL, get OG metadata for the add form
  fetchMetadata: protectedProfileProcedure
    .input(fastAddUrlSchema)
    .mutation(async ({ input }) => {
      try {
        const og = await fetchOpenGraphMetadata(input.sourceUrl);
        if (!og) {
          return {
            ok: false as const,
            title: null,
            thumbnailUrl: null,
            contentType: "link" as const,
          };
        }
        return {
          ok: true as const,
          title: og.title ?? null,
          thumbnailUrl: og.imageUrl ?? null,
          contentType: og.inferredContentType ?? ("link" as const),
        };
      } catch {
        return {
          ok: false as const,
          title: null,
          thumbnailUrl: null,
          contentType: "link" as const,
        };
      }
    }),

  create: protectedProfileProcedure
    .input(z.object({ collectionId: z.uuid() }).extend(insertItemSchema.shape))
    .mutation(async ({ ctx, input }) => {
      const { collectionId, sourceUrl, creatorName, creatorUrl, ...rest } =
        input;
      await assertOwnsParentCollection(ctx.db, collectionId, ctx.profile.id);

      await validateSourceUrlIfPresent(sourceUrl);

      const creatorId = await resolveCreatorId(ctx.db, creatorName, creatorUrl);
      const position = await nextPosition(ctx.db, collectionId);

      const [item] = await ctx.db
        .insert(items)
        .values({
          ...rest,
          collectionId,
          sourceUrl,
          sourceUrlNormalized: sourceUrl ? normalizeSourceUrl(sourceUrl) : null,
          creatorName,
          creatorUrl,
          creatorId,
          position,
        })
        .returning();

      await ctx.db
        .update(collections)
        .set({ updatedAt: new Date() })
        .where(eq(collections.id, collectionId));

      return item;
    }),

  update: protectedProfileProcedure
    .input(z.object({ id: z.uuid() }).extend(updateItemSchema.shape))
    .mutation(async ({ ctx, input }) => {
      const { id, sourceUrl, creatorName, creatorUrl, ...rest } = input;

      const item = await ctx.db.query.items.findFirst({
        where: eq(items.id, id),
      });
      if (!item)
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      await assertOwnsParentCollection(
        ctx.db,
        item.collectionId,
        ctx.profile.id,
      );

      if (sourceUrl !== undefined) {
        await validateSourceUrlIfPresent(sourceUrl);
      }

      const creatorId =
        creatorName !== undefined
          ? await resolveCreatorId(ctx.db, creatorName, creatorUrl)
          : undefined;

      const [updated] = await ctx.db
        .update(items)
        .set({
          ...rest,
          ...(sourceUrl !== undefined
            ? {
                sourceUrl,
                sourceUrlNormalized: sourceUrl
                  ? normalizeSourceUrl(sourceUrl)
                  : null,
                isLinkBroken: false,
              }
            : {}),
          ...(creatorName !== undefined
            ? { creatorName, creatorUrl, creatorId }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(items.id, id))
        .returning();

      await ctx.db
        .update(collections)
        .set({ updatedAt: new Date() })
        .where(eq(collections.id, item.collectionId));

      return updated;
    }),

  delete: protectedProfileProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.query.items.findFirst({
        where: eq(items.id, input.id),
      });
      if (!item)
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      await assertOwnsParentCollection(
        ctx.db,
        item.collectionId,
        ctx.profile.id,
      );

      await ctx.db.delete(items).where(eq(items.id, input.id));
      await ctx.db
        .update(collections)
        .set({ updatedAt: new Date() })
        .where(eq(collections.id, item.collectionId));

      return { id: input.id };
    }),

  reorder: protectedProfileProcedure
    .input(
      z.object({ collectionId: z.uuid(), orderedItemIds: z.array(z.uuid()) }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnsParentCollection(
        ctx.db,
        input.collectionId,
        ctx.profile.id,
      );

      await ctx.db.transaction(async (tx) => {
        for (const [index, itemId] of input.orderedItemIds.entries()) {
          await tx
            .update(items)
            .set({ position: -(index + 1) })
            .where(
              and(
                eq(items.id, itemId),
                eq(items.collectionId, input.collectionId),
              ),
            );
        }
        for (const [index, itemId] of input.orderedItemIds.entries()) {
          await tx
            .update(items)
            .set({ position: index, updatedAt: new Date() })
            .where(
              and(
                eq(items.id, itemId),
                eq(items.collectionId, input.collectionId),
              ),
            );
        }
      });

      await ctx.db
        .update(collections)
        .set({ updatedAt: new Date() })
        .where(eq(collections.id, input.collectionId));

      return { ok: true };
    }),

  setMature: protectedProfileProcedure
    .input(z.object({ id: z.uuid(), matureContent: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.query.items.findFirst({
        where: eq(items.id, input.id),
      });
      if (!item)
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      await assertOwnsParentCollection(
        ctx.db,
        item.collectionId,
        ctx.profile.id,
      );

      const [updated] = await ctx.db
        .update(items)
        .set({ matureContent: input.matureContent, updatedAt: new Date() })
        .where(eq(items.id, input.id))
        .returning();

      return updated;
    }),
});
