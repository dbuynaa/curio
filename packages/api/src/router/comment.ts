import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq, isNull, sql } from "@acme/db";
import {
  collections,
  comments,
  insertCommentSchema,
  items,
} from "@acme/db/schema";

import { protectedProfileProcedure, publicProcedure } from "../trpc";

export const commentRouter = {
  forCollection: publicProcedure
    .input(z.object({ collectionId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.comments.findMany({
        where: and(
          eq(comments.collectionId, input.collectionId),
          isNull(comments.itemId),
        ),
        with: {
          author: {
            columns: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          replies: {
            with: {
              author: {
                columns: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: (reply, { asc }) => [asc(reply.createdAt)],
          },
        },
        orderBy: (comment, { asc }) => [asc(comment.createdAt)],
      });

      // Top-level only — replies come nested via the relation
      return rows.filter((c) => !c.parentCommentId);
    }),

  forItem: publicProcedure
    .input(z.object({ itemId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.comments.findMany({
        where: eq(comments.itemId, input.itemId),
        with: {
          author: {
            columns: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          replies: {
            with: {
              author: {
                columns: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: (reply, { asc }) => [asc(reply.createdAt)],
          },
        },
        orderBy: (comment, { asc }) => [asc(comment.createdAt)],
      });

      return rows.filter((c) => !c.parentCommentId);
    }),

  create: protectedProfileProcedure
    .input(insertCommentSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.parentCommentId) {
        const parent = await ctx.db.query.comments.findFirst({
          where: eq(comments.id, input.parentCommentId),
          columns: { parentCommentId: true, collectionId: true, itemId: true },
        });
        if (!parent)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent comment not found",
          });
        if (parent.parentCommentId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Replies can only be one level deep",
          });
        }
        input.collectionId = parent.collectionId;
        input.itemId = parent.itemId ?? undefined;
      }

      const [comment] = await ctx.db
        .insert(comments)
        .values({
          userId: ctx.profile.id,
          collectionId: input.collectionId,
          itemId: input.itemId,
          parentCommentId: input.parentCommentId,
          body: input.body,
        })
        .returning();

      if (input.itemId) {
        await ctx.db
          .update(items)
          .set({ commentCount: sql`${items.commentCount} + 1` })
          .where(eq(items.id, input.itemId));
      } else {
        await ctx.db
          .update(collections)
          .set({ commentCount: sql`${collections.commentCount} + 1` })
          .where(eq(collections.id, input.collectionId));
      }

      return comment;
    }),

  delete: protectedProfileProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.query.comments.findFirst({
        where: eq(comments.id, input.id),
        with: { collection: { columns: { userId: true } } },
      });
      if (!comment) throw new TRPCError({ code: "NOT_FOUND" });

      const isAuthor = comment.userId === ctx.profile.id;
      const isCollectionOwner = comment.collection.userId === ctx.profile.id;
      if (!isAuthor && !isCollectionOwner)
        throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.db
        .update(comments)
        .set({ deletedAt: new Date() })
        .where(eq(comments.id, input.id));

      if (comment.itemId) {
        await ctx.db
          .update(items)
          .set({ commentCount: sql`greatest(${items.commentCount} - 1, 0)` })
          .where(eq(items.id, comment.itemId));
      } else {
        await ctx.db
          .update(collections)
          .set({
            commentCount: sql`greatest(${collections.commentCount} - 1, 0)`,
          })
          .where(eq(collections.id, comment.collectionId));
      }

      return { ok: true };
    }),
} satisfies TRPCRouterRecord;
