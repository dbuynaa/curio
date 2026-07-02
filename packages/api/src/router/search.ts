import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq, ilike, or, sql } from "@acme/db";
import { collections, creators, items, users } from "@acme/db/schema";

import { publicProcedure } from "../trpc";

export const searchRouter = {
  // FR-9.1 — literal text search, no fuzzy matching. Only public published
  // collections (and their items) appear in results.
  query: publicProcedure
    .input(
      z.object({
        q: z.string().trim().min(1).max(200),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const pattern = `%${input.q}%`;

      const [matchedCollections, matchedItems, matchedUsers, matchedCreators] =
        await Promise.all([
          ctx.db.query.collections.findMany({
            where: and(
              eq(collections.visibility, "public"),
              eq(collections.isPublished, true),
              or(
                ilike(collections.title, pattern),
                ilike(collections.description, pattern),
                sql`${collections.tags}::text ilike ${pattern}`,
              ),
            ),
            limit: input.limit,
            with: {
              owner: {
                columns: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          }),

          ctx.db
            .select({
              item: items,
              collectionTitle: collections.title,
              ownerUsername: users.username,
            })
            .from(items)
            .innerJoin(collections, eq(items.collectionId, collections.id))
            .innerJoin(users, eq(collections.userId, users.id))
            .where(
              and(
                eq(collections.visibility, "public"),
                eq(collections.isPublished, true),
                or(
                  ilike(items.title, pattern),
                  ilike(items.description, pattern),
                  ilike(items.creatorName, pattern),
                  sql`${items.tags}::text ilike ${pattern}`,
                ),
              ),
            )
            .limit(input.limit),

          ctx.db.query.users.findMany({
            where: and(
              eq(users.searchIndexable, true),
              or(
                ilike(users.username, pattern),
                ilike(users.displayName, pattern),
                ilike(users.bio, pattern),
              ),
            ),
            limit: input.limit,
            columns: {
              id: true,
              username: true,
              displayName: true,
              bio: true,
              avatarUrl: true,
              followerCount: true,
              collectionCount: true,
            },
          }),

          ctx.db.query.creators.findMany({
            where: or(
              ilike(creators.displayName, pattern),
              ilike(creators.normalizedName, pattern),
            ),
            limit: input.limit,
          }),
        ]);

      return {
        collections: matchedCollections,
        items: matchedItems,
        users: matchedUsers,
        creators: matchedCreators,
      };
    }),
} satisfies TRPCRouterRecord;
