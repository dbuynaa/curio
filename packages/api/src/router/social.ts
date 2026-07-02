import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

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

import { optionalCurioUser } from "../lib/profile-user";
import { protectedProfileProcedure, publicProcedure } from "../trpc";

export const socialRouter = {
  follow: protectedProfileProcedure
    .input(z.object({ userId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.profile.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't follow yourself",
        });
      }

      await ctx.db.transaction(async (tx) => {
        const inserted = await tx
          .insert(follows)
          .values({
            followerId: ctx.profile.id,
            followingId: input.userId,
          })
          .onConflictDoNothing()
          .returning({ followerId: follows.followerId });

        if (inserted.length > 0) {
          await tx
            .update(users)
            .set({ followingCount: sql`${users.followingCount} + 1` })
            .where(eq(users.id, ctx.profile.id));
          await tx
            .update(users)
            .set({ followerCount: sql`${users.followerCount} + 1` })
            .where(eq(users.id, input.userId));
        }
      });

      return { following: true };
    }),

  unfollow: protectedProfileProcedure
    .input(z.object({ userId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const deleted = await tx
          .delete(follows)
          .where(
            and(
              eq(follows.followerId, ctx.profile.id),
              eq(follows.followingId, input.userId),
            ),
          )
          .returning({ followerId: follows.followerId });

        if (deleted.length > 0) {
          await tx
            .update(users)
            .set({
              followingCount: sql`greatest(${users.followingCount} - 1, 0)`,
            })
            .where(eq(users.id, ctx.profile.id));
          await tx
            .update(users)
            .set({
              followerCount: sql`greatest(${users.followerCount} - 1, 0)`,
            })
            .where(eq(users.id, input.userId));
        }
      });

      return { following: false };
    }),

  isFollowing: publicProcedure
    .input(z.object({ userId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const viewer = await optionalCurioUser(ctx);
      if (!viewer) return { following: false };

      const row = await ctx.db.query.follows.findFirst({
        where: and(
          eq(follows.followerId, viewer.id),
          eq(follows.followingId, input.userId),
        ),
        columns: { followerId: true },
      });

      return { following: !!row };
    }),

  toggleCollectionLike: protectedProfileProcedure
    .input(z.object({ collectionId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.collectionLikes.findFirst({
        where: and(
          eq(collectionLikes.userId, ctx.profile.id),
          eq(collectionLikes.collectionId, input.collectionId),
        ),
      });

      if (existing) {
        await ctx.db.transaction(async (tx) => {
          await tx
            .delete(collectionLikes)
            .where(
              and(
                eq(collectionLikes.userId, ctx.profile.id),
                eq(collectionLikes.collectionId, input.collectionId),
              ),
            );
          await tx
            .update(collections)
            .set({
              likeCount: sql`greatest(${collections.likeCount} - 1, 0)`,
            })
            .where(eq(collections.id, input.collectionId));
        });
        return { liked: false };
      }

      await ctx.db.transaction(async (tx) => {
        await tx.insert(collectionLikes).values({
          userId: ctx.profile.id,
          collectionId: input.collectionId,
        });
        await tx
          .update(collections)
          .set({ likeCount: sql`${collections.likeCount} + 1` })
          .where(eq(collections.id, input.collectionId));
      });
      return { liked: true };
    }),

  toggleItemLike: protectedProfileProcedure
    .input(z.object({ itemId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.itemLikes.findFirst({
        where: and(
          eq(itemLikes.userId, ctx.profile.id),
          eq(itemLikes.itemId, input.itemId),
        ),
      });

      if (existing) {
        await ctx.db.transaction(async (tx) => {
          await tx
            .delete(itemLikes)
            .where(
              and(
                eq(itemLikes.userId, ctx.profile.id),
                eq(itemLikes.itemId, input.itemId),
              ),
            );
          await tx
            .update(items)
            .set({ likeCount: sql`greatest(${items.likeCount} - 1, 0)` })
            .where(eq(items.id, input.itemId));
        });
        return { liked: false };
      }

      await ctx.db.transaction(async (tx) => {
        await tx.insert(itemLikes).values({
          userId: ctx.profile.id,
          itemId: input.itemId,
        });
        await tx
          .update(items)
          .set({ likeCount: sql`${items.likeCount} + 1` })
          .where(eq(items.id, input.itemId));
      });
      return { liked: true };
    }),

  toggleSave: protectedProfileProcedure
    .input(z.object({ collectionId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.saves.findFirst({
        where: and(
          eq(saves.userId, ctx.profile.id),
          eq(saves.collectionId, input.collectionId),
        ),
      });

      if (existing) {
        await ctx.db.transaction(async (tx) => {
          await tx
            .delete(saves)
            .where(
              and(
                eq(saves.userId, ctx.profile.id),
                eq(saves.collectionId, input.collectionId),
              ),
            );
          await tx
            .update(collections)
            .set({ saveCount: sql`greatest(${collections.saveCount} - 1, 0)` })
            .where(eq(collections.id, input.collectionId));
        });
        return { saved: false };
      }

      await ctx.db.transaction(async (tx) => {
        await tx.insert(saves).values({
          userId: ctx.profile.id,
          collectionId: input.collectionId,
        });
        await tx
          .update(collections)
          .set({ saveCount: sql`${collections.saveCount} + 1` })
          .where(eq(collections.id, input.collectionId));
      });
      return { saved: true };
    }),

  mySaves: protectedProfileProcedure.query(async ({ ctx }) => {
    return ctx.db.query.saves.findMany({
      where: eq(saves.userId, ctx.profile.id),
      with: { collection: true },
      orderBy: (save, { desc }) => [desc(save.createdAt)],
    });
  }),
} satisfies TRPCRouterRecord;
