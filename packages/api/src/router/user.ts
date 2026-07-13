import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { eq, sql } from "@acme/db";
import { users } from "@acme/db/schema";
import { userUpdateSchema } from "@acme/db/validators";

import { normalizeCreatorName } from "../lib/creator";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  sessionProcedure,
} from "../trpc";

export const userRouter = createTRPCRouter({
  me: sessionProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.users.findFirst({
      where: { authUserId: ctx.session.user.id },
    });

    return profile ?? null;
  }),

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
        with: {
          items: { columns: { id: true } },
        },
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

  // FR-8.1 — auto-generated creator page; no account required for the creator.
  // Only shows works from public, published collections.
  byNormalizedName: publicProcedure
    .input(z.object({ normalizedName: z.string() }))
    .query(async ({ ctx, input }) => {
      const normalizedName = normalizeCreatorName(
        input.normalizedName.replace(/-/g, " "),
      );
      const creator = await ctx.db.query.creators.findFirst({
        where: {
          normalizedName,
        },
      });
      if (!creator) throw new TRPCError({ code: "NOT_FOUND" });

      const candidateWorks = await ctx.db.query.items.findMany({
        where: {
          creatorId: creator.id,
        },
        orderBy: {
          frequencyCount: "desc",
        },
        limit: 20,
        with: {
          collection: {
            columns: {
              id: true,
              title: true,
              visibility: true,
              isPublished: true,
            },
          },
        },
      });

      return {
        creator,
        topWorks: candidateWorks.filter(
          (i) =>
            i.collection?.visibility === "public" && i.collection.isPublished,
        ),
      };
    }),

  // FR-8.2 — lightweight "did you mean" suggestion at add-time; never blocks
  // creation of a distinct entry if the curator declines the match.
  // MVP-level substring match; swap for pg_trgm similarity() once the
  // creators table is large enough for relevance to matter.
  suggestMatch: publicProcedure
    .input(z.object({ creatorName: z.string().min(1) }))
    .query(({ ctx, input }) => {
      const normalized = normalizeCreatorName(input.creatorName);
      return ctx.db.query.creators.findMany({
        where: {
          normalizedName: { like: `%${normalized}%` },
        },
        limit: 5,
      });
    }),
});
