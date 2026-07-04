import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { normalizeCreatorName } from "../lib/creator";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const creatorRouter = createTRPCRouter({
  // FR-8.1 — auto-generated creator page; no account required for the creator.
  // Only shows works from public, published collections.
  byNormalizedName: publicProcedure
    .input(z.object({ normalizedName: z.string() }))
    .query(async ({ ctx, input }) => {
      const creator = await ctx.db.query.creators.findFirst({
        where: {
          normalizedName: input.normalizedName,
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
          collection: { columns: { visibility: true, isPublished: true } },
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
        // where: (c, { ilike }) => ilike(c.normalizedName, `%${normalized}%`),
        where: {
          normalizedName: { like: `%${normalized}%` },
        },
        limit: 5,
      });
    }),
});
