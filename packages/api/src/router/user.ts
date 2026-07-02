import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { eq } from "@acme/db";
import {
  onboardingSchema,
  updateUserSchema,
  users,
  usernameSchema,
} from "@acme/db/schema";

import { optionalCurioUser } from "../lib/profile-user";
import {
  protectedProcedure,
  protectedProfileProcedure,
  publicProcedure,
} from "../trpc";

export const userRouter = {
  // FR-2.1 — public profile at /[username], no auth required
  byUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.query.users.findFirst({
        where: eq(users.username, input.username.toLowerCase()),
      });
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const viewer = await optionalCurioUser(ctx);
      const isOwnProfile = viewer?.id === profile.id;

      const publicCollections = await ctx.db.query.collections.findMany({
        where: (c, { and, eq: eqOp }) =>
          and(
            eqOp(c.userId, profile.id),
            eqOp(c.isPublished, true),
            isOwnProfile ? undefined : eqOp(c.visibility, "public"),
          ),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
        limit: 50,
      });

      return {
        ...profile,
        collections: publicCollections,
        isOwnProfile,
      };
    }),

  // Current auth session + linked Curio profile (if onboarded)
  me: protectedProcedure.query(async ({ ctx }) => {
    const profile = await optionalCurioUser(ctx);
    return {
      authUser: ctx.session.user,
      profile,
      needsOnboarding: !profile,
    };
  }),

  // FR-1.4 — case-insensitive uniqueness check before confirming username
  checkUsername: publicProcedure
    .input(z.object({ username: usernameSchema }))
    .query(async ({ ctx, input }) => {
      const normalized = input.username.toLowerCase();
      const existing = await ctx.db.query.users.findFirst({
        where: eq(users.username, normalized),
        columns: { id: true },
      });
      return { available: !existing };
    }),

  // FR-1.5 — onboarding: username required, avatar/bio optional
  completeOnboarding: protectedProcedure
    .input(onboardingSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.users.findFirst({
        where: eq(users.authUserId, ctx.session.user.id),
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Onboarding already completed",
        });
      }

      const username = input.username.toLowerCase();
      const taken = await ctx.db.query.users.findFirst({
        where: eq(users.username, username),
        columns: { id: true },
      });
      if (taken) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username is already taken",
        });
      }

      const [profile] = await ctx.db
        .insert(users)
        .values({
          authUserId: ctx.session.user.id,
          username,
          displayName: input.displayName ?? ctx.session.user.name,
          bio: input.bio,
          avatarUrl: input.avatarUrl ?? ctx.session.user.image,
        })
        .returning();

      return profile;
    }),

  // FR-2.2 — edit display name, bio, avatar
  update: protectedProfileProcedure
    .input(updateUserSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.username) {
        const username = input.username.toLowerCase();
        const taken = await ctx.db.query.users.findFirst({
          where: eq(users.username, username),
          columns: { id: true },
        });
        if (taken && taken.id !== ctx.profile.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username is already taken",
          });
        }
        input.username = username;
      }

      const [updated] = await ctx.db
        .update(users)
        .set(input)
        .where(eq(users.id, ctx.profile.id))
        .returning();

      return updated;
    }),

  // FR-2.3 — opt out of search-engine indexing
  setSearchIndexable: protectedProfileProcedure
    .input(z.object({ searchIndexable: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({ searchIndexable: input.searchIndexable })
        .where(eq(users.id, ctx.profile.id))
        .returning({ searchIndexable: users.searchIndexable });

      return updated;
    }),

  // FR-10.1 — one-time age confirmation for mature content
  confirmAdult: protectedProfileProcedure.mutation(async ({ ctx }) => {
    const [updated] = await ctx.db
      .update(users)
      .set({ isAdultConfirmed: true })
      .where(eq(users.id, ctx.profile.id))
      .returning({ isAdultConfirmed: users.isAdultConfirmed });

    return updated;
  }),
} satisfies TRPCRouterRecord;
