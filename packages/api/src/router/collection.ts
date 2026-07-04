import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, eq, sql } from "@acme/db";
import { collections, items } from "@acme/db/schema";
import {
  collectionInsertSchema,
  collectionUpdateSchema,
} from "@acme/db/validators";

import type { DB } from "../lib/db-types";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

async function assertOwnership(db: DB, collectionId: string, userId: string) {
  const collection = await db.query.collections.findFirst({
    where: { id: collectionId },
  });
  if (!collection)
    throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
  if (collection.userId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not own this collection",
    });
  }
  return collection;
}

export const collectionRouter = createTRPCRouter({
  // FR-3.1 — always created unpublished regardless of chosen visibility
  create: protectedProcedure
    .input(collectionInsertSchema)
    .mutation(async ({ ctx, input }) => {
      const [collection] = await ctx.db
        .insert(collections)
        .values({ ...input, userId: ctx.user.id, isPublished: false })
        .returning();
      return collection;
    }),

  // FR-3.5 — editing a published collection is allowed, no unpublish needed;
  // updatedAt bumps, createdAt never changes (handled by the column default)
  update: protectedProcedure
    .input(z.object({ id: z.uuid() }).merge(collectionUpdateSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      await assertOwnership(ctx.db, id, ctx.user.id);

      const [updated] = await ctx.db
        .update(collections)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(collections.id, id))
        .returning();
      return updated;
    }),

  // FR-3.3 — the hard publish gate, enforced server-side regardless of client (FR-11.1)
  publish: protectedProcedure
    .input(
      z.object({ id: z.uuid(), visibility: z.enum(["public", "unlisted"]) }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.db, input.id, ctx.user.id);

      // FR-1.2 — unverified accounts cannot publish
      if (!ctx.session.user.emailVerified) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Verify your email before publishing a collection",
        });
      }

      // RQBv2 object filter: top-level keys AND together; `OR` is an array key.
      // `{ isNull: true }` is the explicit RQBv2 null-check operator.
      const incompleteItems = await ctx.db.query.items.findMany({
        where: {
          collectionId: input.id,
          OR: [
            { sourceUrl: { isNull: true } },
            { sourceUrl: "" },
            { description: { isNull: true } },
            { description: "" },
          ],
        },
        columns: { id: true, title: true },
      });

      if (incompleteItems.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `These items are missing a source URL or description: ${incompleteItems
            .map((i) => i.title)
            .join(", ")}`,
        });
      }

      const [updated] = await ctx.db
        .update(collections)
        .set({
          visibility: input.visibility,
          isPublished: true,
          updatedAt: new Date(),
        })
        .where(eq(collections.id, input.id))
        .returning();
      return updated;
    }),

  unpublish: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.db, input.id, ctx.user.id);
      const [updated] = await ctx.db
        .update(collections)
        .set({
          isPublished: false,
          visibility: "private",
          updatedAt: new Date(),
        })
        .where(eq(collections.id, input.id))
        .returning();
      return updated;
    }),

  // FR-3.6 — cascades to items/comments/likes/saves via the schema's onDelete rules
  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.db, input.id, ctx.user.id);
      await ctx.db.delete(collections).where(eq(collections.id, input.id));
      return { success: true };
    }),

  // FR-3.4 / FR-5.1 — full read access for public/unlisted; private is owner-only.
  // Visibility gating happens here rather than in a route guard, since a
  // logged-out visitor needs full read access to public/unlisted content.
  byId: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const collection = await ctx.db.query.collections.findFirst({
        where: { id: input.id },
        with: {
          owner: true,
          items: { orderBy: { position: "asc" } },
        },
      });
      if (!collection) throw new TRPCError({ code: "NOT_FOUND" });

      if (collection.visibility === "private") {
        const viewerProfile = ctx.session?.user
          ? await ctx.db.query.users.findFirst({
              where: { authUserId: ctx.session.user.id },
            })
          : null;
        if (!viewerProfile || viewerProfile.id !== collection.userId) {
          // Same NOT_FOUND as a missing row — don't leak existence of private collections
          throw new TRPCError({ code: "NOT_FOUND" });
        }
      }

      // FR-9.2 view_count — includes logged-out views
      await ctx.db
        .update(collections)
        .set({ viewCount: sql`${collections.viewCount} + 1` })
        .where(eq(collections.id, input.id));

      return collection;
    }),

  // FR-3.2 — reordering; items_collection_position_idx is a unique index on
  // (collectionId, position), so positions are staged through a temporary
  // negative range inside one transaction to avoid mid-update collisions.
  // (This uses the core query builder's `.update().where()`, which is
  // unaffected by the RQBv2 `db.query.*` filter-syntax change above.)
  reorderItems: protectedProcedure
    .input(
      z.object({
        collectionId: z.uuid(),
        orderedItemIds: z.array(z.uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.db, input.collectionId, ctx.user.id);

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

      return { success: true };
    }),
});
