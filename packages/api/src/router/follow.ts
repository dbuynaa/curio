import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, eq, sql } from "@acme/db";
import { follows, users } from "@acme/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const followRouter = createTRPCRouter({
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
});
