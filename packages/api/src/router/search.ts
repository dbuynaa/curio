import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const searchRouter = createTRPCRouter({
  // FR-9.1 — literal text match only, no fuzzy matching or ranking algorithm
  // beyond exact-vs-partial. Only public + published content is returned.
  all: publicProcedure
    .input(z.object({ query: z.string().min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      const q = `%${input.query}%`;

      const [collectionResults, itemResults, userResults, creatorResults] =
        await Promise.all([
          ctx.db.query.collections.findMany({
            where: {
              visibility: "public",
              isPublished: true,
              OR: [
                { title: { like: q } },
                { description: { like: q } },
                { tags: { like: q } },
              ],
            },
            with: { owner: true },
            limit: 25,
          }),
          ctx.db.query.items.findMany({
            where: {
              OR: [
                { title: { like: q } },
                { description: { like: q } },
                { creatorName: { like: q } },
                { tags: { like: q } },
              ],
            },
            with: {
              collection: { columns: { visibility: true, isPublished: true } },
            },
            limit: 25,
          }),
          // FR-2.3 — search-indexable opt-out is honored here too
          ctx.db.query.users.findMany({
            where: {
              searchIndexable: true,
              OR: [
                { username: { like: q } },
                { displayName: { like: q } },
                { bio: { like: q } },
              ],
            },
            limit: 25,
          }),
          ctx.db.query.creators.findMany({
            where: {
              OR: [{ displayName: { like: q } }],
            },
            limit: 25,
          }),
        ]);

      return {
        collections: collectionResults,
        items: itemResults.filter(
          (i) =>
            i.collection?.visibility === "public" && i.collection.isPublished,
        ),
        users: userResults,
        creators: creatorResults,
      };
    }),
});
