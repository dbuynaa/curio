import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { eq, sql } from "@acme/db";
import { users } from "@acme/db/schema";
import { userUpdateSchema } from "@acme/db/validators";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  sessionProcedure,
} from "../trpc";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) => ctx.user),

  // FR-2.1 — public profile page; only public + published collections in the grid
  byUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.query.users.findFirst({
        where: { username: input.username },
      });
      if (!profile)
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      // Multiple keys in a RQBv2 `where` object are implicitly AND-ed
      const publicCollections = await ctx.db.query.collections.findMany({
        where: {
          userId: profile.id,
          visibility: "public",
          isPublished: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return { profile, collections: publicCollections };
    }),

  // FR-1.4 — case-insensitive uniqueness check, usable before a profile exists
  checkUsernameAvailable: publicProcedure
    .input(
      z.object({
        username: z
          .string()
          .min(3)
          .max(30)
          .regex(/^[a-zA-Z0-9_-]+$/),
      }),
    )
    .query(async ({ ctx, input }) => {
      // RQBv2 RAW filters take a single-argument callback: (table) => sql`...`
      const existing = await ctx.db.query.users.findFirst({
        where: {
          RAW: (u) => sql`lower(${u.username}) = lower(${input.username})`,
        },
      });
      return { available: !existing };
    }),

  // FR-1.5 — creates the `users` profile row itself. Requires only a
  // better-auth session, not an existing profile (that's what this creates).
  completeOnboarding: sessionProcedure
    .input(
      z.object({
        username: z
          .string()
          .min(3)
          .max(30)
          .regex(
            /^[a-zA-Z0-9_-]+$/,
            "Letters, numbers, hyphens, and underscores only",
          ),
        displayName: z.string().max(60).optional(),
        bio: z.string().max(300).optional(),
        avatarUrl: z.url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingProfile = await ctx.db.query.users.findFirst({
        where: { authUserId: ctx.session.user.id },
      });
      if (existingProfile) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Profile already exists",
        });
      }

      const usernameTaken = await ctx.db.query.users.findFirst({
        where: {
          RAW: (u) => sql`lower(${u.username}) = lower(${input.username})`,
        },
      });
      if (usernameTaken) {
        throw new TRPCError({ code: "CONFLICT", message: "Username is taken" });
      }

      const [profile] = await ctx.db
        .insert(users)
        .values({
          authUserId: ctx.session.user.id,
          username: input.username,
          displayName: input.displayName,
          bio: input.bio,
          avatarUrl: input.avatarUrl,
        })
        .returning();

      return profile;
    }),

  // FR-2.2 — no page reload required; client handles the live char count
  update: protectedProcedure
    .input(userUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set(input)
        .where(eq(users.id, ctx.user.id))
        .returning();
      return updated;
    }),

  // FR-2.3 — takes effect on next render, no redeploy needed since it's just a DB flag
  setSearchIndexable: protectedProcedure
    .input(z.object({ searchIndexable: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({ searchIndexable: input.searchIndexable })
        .where(eq(users.id, ctx.user.id))
        .returning();
      return updated;
    }),
});
