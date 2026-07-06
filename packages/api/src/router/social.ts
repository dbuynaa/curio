import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, eq, sql } from "@acme/db";
import {
  collectionLikes,
  collections,
  follows,
  itemLikes,
  items,
  saves,
  users,
} from "@acme/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const socialRouter = createTRPCRouter({
  // FR-6.1 — idempotent; following an already-followed user is a no-op, not an error
  follow: protectedProcedure
    .input(z.object({ userId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A user cannot follow themselves",
        });
      }

      await ctx.db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(follows)
          .values({ followerId: ctx.user.id, followingId: input.userId })
          .onConflictDoNothing()
          .returning();

        if (inserted) {
          await tx
            .update(users)
            .set({ followingCount: sql`${users.followingCount} + 1` })
            .where(eq(users.id, ctx.user.id));
          await tx
            .update(users)
            .set({ followerCount: sql`${users.followerCount} + 1` })
            .where(eq(users.id, input.userId));
        }
      });

      return { success: true };
    }),

  // FR-6.1 — instant, no confirmation step
  unfollow: protectedProcedure
    .input(z.object({ userId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const deleted = await tx
          .delete(follows)
          .where(
            and(
              eq(follows.followerId, ctx.user.id),
              eq(follows.followingId, input.userId),
            ),
          )
          .returning();

        if (deleted.length > 0) {
          await tx
            .update(users)
            .set({
              followingCount: sql`greatest(${users.followingCount} - 1, 0)`,
            })
            .where(eq(users.id, ctx.user.id));
          await tx
            .update(users)
            .set({
              followerCount: sql`greatest(${users.followerCount} - 1, 0)`,
            })
            .where(eq(users.id, input.userId));
        }
      });

      return { success: true };
    }),

  // RQBv2: multiple keys in the `where` object are implicitly AND-ed
  isFollowing: protectedProcedure
    .input(z.object({ userId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const existing = await ctx.db.query.follows.findFirst({
        where: { followerId: ctx.user.id, followingId: input.userId },
      });
      return { isFollowing: !!existing };
    }),

  // FR-6.2 — toggle; the composite PK on collectionLikes prevents duplicate rows
  toggleCollectionLike: protectedProcedure
    .input(z.object({ collectionId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const deleted = await tx
          .delete(collectionLikes)
          .where(
            and(
              eq(collectionLikes.userId, ctx.user.id),
              eq(collectionLikes.collectionId, input.collectionId),
            ),
          )
          .returning();

        if (deleted.length > 0) {
          await tx
            .update(collections)
            .set({ likeCount: sql`greatest(${collections.likeCount} - 1, 0)` })
            .where(eq(collections.id, input.collectionId));
          return { liked: false };
        }

        await tx
          .insert(collectionLikes)
          .values({ userId: ctx.user.id, collectionId: input.collectionId });
        await tx
          .update(collections)
          .set({ likeCount: sql`${collections.likeCount} + 1` })
          .where(eq(collections.id, input.collectionId));
        return { liked: true };
      });
    }),

  // FR-6.3 — independent of collection likes
  toggleItemLike: protectedProcedure
    .input(z.object({ itemId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const deleted = await tx
          .delete(itemLikes)
          .where(
            and(
              eq(itemLikes.userId, ctx.user.id),
              eq(itemLikes.itemId, input.itemId),
            ),
          )
          .returning();

        if (deleted.length > 0) {
          await tx
            .update(items)
            .set({ likeCount: sql`greatest(${items.likeCount} - 1, 0)` })
            .where(eq(items.id, input.itemId));
          return { liked: false };
        }

        await tx
          .insert(itemLikes)
          .values({ userId: ctx.user.id, itemId: input.itemId });
        await tx
          .update(items)
          .set({ likeCount: sql`${items.likeCount} + 1` })
          .where(eq(items.id, input.itemId));
        return { liked: true };
      });
    }),

  // FR-6.4 — private; who saved is never exposed anywhere in responses
  toggleSave: protectedProcedure
    .input(z.object({ collectionId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const deleted = await tx
          .delete(saves)
          .where(
            and(
              eq(saves.userId, ctx.user.id),
              eq(saves.collectionId, input.collectionId),
            ),
          )
          .returning();

        if (deleted.length > 0) {
          await tx
            .update(collections)
            .set({ saveCount: sql`greatest(${collections.saveCount} - 1, 0)` })
            .where(eq(collections.id, input.collectionId));
          return { saved: false };
        }

        await tx
          .insert(saves)
          .values({ userId: ctx.user.id, collectionId: input.collectionId });
        await tx
          .update(collections)
          .set({ saveCount: sql`${collections.saveCount} + 1` })
          .where(eq(collections.id, input.collectionId));
        return { saved: true };
      });
    }),

  // Personal library — only the saver can ever see this list (FR-6.4)
  mySaves: protectedProcedure.query(({ ctx }) =>
    ctx.db.query.saves.findMany({
      where: { userId: ctx.user.id },
      with: { collection: { with: { owner: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ),
});
