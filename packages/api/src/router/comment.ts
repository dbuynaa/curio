import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { eq, sql } from "@acme/db";
import { collections, comments, items } from "@acme/db/schema";
import { commentInsertSchema } from "@acme/db/validators";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const commentRouter = createTRPCRouter({
  // FR-6.5 / FR-6.6 — one level of nesting only, for both collection- and
  // item-anchored threads
  create: protectedProcedure
    .input(commentInsertSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.parentCommentId) {
        const parent = await ctx.db.query.comments.findFirst({
          where: { id: input.parentCommentId },
        });
        if (!parent)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent comment not found",
          });
        if (parent.parentCommentId) {
          // FR-6.5 — a reply to a reply is rejected at the API layer, not flattened
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Replies can only be one level deep",
          });
        }
      }

      return ctx.db.transaction(async (tx) => {
        const [comment] = await tx
          .insert(comments)
          .values({ ...input, userId: ctx.user.id })
          .returning();

        // FR-6.6 — item-anchored comments bump items.commentCount only;
        // collection-level commentCount is unaffected
        if (input.itemId) {
          await tx
            .update(items)
            .set({ commentCount: sql`${items.commentCount} + 1` })
            .where(eq(items.id, input.itemId));
        } else {
          await tx
            .update(collections)
            .set({ commentCount: sql`${collections.commentCount} + 1` })
            .where(eq(collections.id, input.collectionId));
        }

        return comment;
      });
    }),

  // FR-6.7 — soft delete; row retained so existing replies stay visible,
  // with the parent rendered client-side as "[deleted]"
  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.query.comments.findFirst({
        where: { id: input.id },
      });
      if (!comment || comment.deletedAt)
        throw new TRPCError({ code: "NOT_FOUND" });

      const collection = await ctx.db.query.collections.findFirst({
        where: { id: comment.collectionId },
      });

      // FR-6.7 — the comment author OR the collection owner can delete
      if (
        comment.userId !== ctx.user.id &&
        collection?.userId !== ctx.user.id
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(comments)
          .set({ deletedAt: new Date() })
          .where(eq(comments.id, input.id));

        if (comment.itemId) {
          await tx
            .update(items)
            .set({ commentCount: sql`greatest(${items.commentCount} - 1, 0)` })
            .where(eq(items.id, comment.itemId));
        } else {
          await tx
            .update(collections)
            .set({
              commentCount: sql`greatest(${collections.commentCount} - 1, 0)`,
            })
            .where(eq(collections.id, comment.collectionId));
        }
      });

      return { success: true };
    }),

  // FR-6.5 — top-level collection comments with their one level of replies.
  // RQBv2: `{ isNull: true }` is the explicit null-check filter operator.
  listForCollection: publicProcedure
    .input(z.object({ collectionId: z.uuid() }))
    .query(({ ctx, input }) =>
      ctx.db.query.comments.findMany({
        where: {
          collectionId: input.collectionId,
          itemId: { isNull: true },
          parentCommentId: { isNull: true },
        },
        with: { author: true, replies: { with: { author: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ),

  // FR-6.6 — item-anchored thread; client handles collapsed-by-default rendering
  listForItem: publicProcedure
    .input(z.object({ itemId: z.uuid() }))
    .query(({ ctx, input }) =>
      ctx.db.query.comments.findMany({
        where: {
          itemId: input.itemId,
          parentCommentId: { isNull: true },
        },
        with: { author: true, replies: { with: { author: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ),
});
