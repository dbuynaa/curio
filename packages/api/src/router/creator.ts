import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { desc, eq, ilike } from "@acme/db";
import { collections, creators, items } from "@acme/db/schema";

import { normalizeCreatorName } from "../services/normalize";
import { protectedProcedure, publicProcedure } from "../trpc";

export const creatorRouter = {
  // FR-8.1 — public creator page at /creator/[normalizedName]
  byNormalizedName: publicProcedure
    .input(z.object({ normalizedName: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const normalizedName = normalizeCreatorName(input.normalizedName);

      const creator = await ctx.db.query.creators.findFirst({
        where: eq(creators.normalizedName, normalizedName),
      });
      if (!creator) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found" });
      }

      const citedItems = await ctx.db.query.items.findMany({
        where: eq(items.creatorId, creator.id),
        orderBy: [desc(items.frequencyCount), desc(items.likeCount)],
        limit: 20,
        with: {
          collection: {
            columns: { id: true, title: true, visibility: true, isPublished: true },
          },
        },
      });

      // Only surface items from public published collections on the creator page
      const works = citedItems.filter(
        (item) =>
          item.collection.isPublished && item.collection.visibility === "public",
      );

      return { ...creator, works };
    }),

  // FR-8.2 — "did you mean @existing_creator?" at add-time
  suggestMatch: protectedProcedure
    .input(z.object({ creatorName: z.string().min(1).max(120) }))
    .query(async ({ ctx, input }) => {
      const normalizedName = normalizeCreatorName(input.creatorName);

      const exact = await ctx.db.query.creators.findFirst({
        where: eq(creators.normalizedName, normalizedName),
      });
      if (exact) {
        return { exactMatch: exact, suggestions: [] };
      }

      // Prefix match on normalized name — lightweight fuzzy suggestion for MVP
      const suggestions = await ctx.db.query.creators.findMany({
        where: ilike(creators.normalizedName, `${normalizedName.slice(0, 4)}%`),
        limit: 5,
      });

      return { exactMatch: null, suggestions };
    }),
} satisfies TRPCRouterRecord;
