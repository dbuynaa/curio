import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, desc, eq, sql } from "@acme/db";
import {
  collectionLikes,
  collections,
  insertCollectionSchema,
  saves,
  updateCollectionSchema,
  users,
} from "@acme/db/schema";

import { optionalCurioUser } from "../lib/profile-user";
import {
  protectedProfileProcedure,
  publicProcedure,
} from "../trpc";

function findIncompleteItems(
  itemRows: {
    id: string;
    title: string;
    sourceUrl: string | null;
    description: string | null;
  }[],
) {
  return itemRows.filter(
    (item) => !item.sourceUrl?.trim() || !item.description?.trim(),
  );
}

function assertEmailVerifiedForPublish(sessionUser: {
  emailVerified?: boolean;
}) {
  if (sessionUser.emailVerified === false) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Verify your email before publishing a collection",
    });
  }
}

export const collectionRouter = {
  byId: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const viewer = await optionalCurioUser(ctx);

      const collection = await ctx.db.query.collections.findFirst({
        where: eq(collections.id, input.id),
        with: {
          owner: {
            columns: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          items: {
            orderBy: (item, { asc }) => [asc(item.position)],
          },
        },
      });

      if (!collection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      if (
        collection.visibility === "private" &&
        collection.userId !== viewer?.id
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      return collection;
    }),

  // Viewer-specific flags for the collection page (liked/saved/owner)
  viewerState: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const viewer = await optionalCurioUser(ctx);
      if (!viewer) {
        return { isOwner: false, liked: false, saved: false };
      }

      const collection = await ctx.db.query.collections.findFirst({
        where: eq(collections.id, input.id),
        columns: { userId: true },
      });
      if (!collection) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [like, save] = await Promise.all([
        ctx.db.query.collectionLikes.findFirst({
          where: and(
            eq(collectionLikes.userId, viewer.id),
            eq(collectionLikes.collectionId, input.id),
          ),
          columns: { userId: true },
        }),
        ctx.db.query.saves.findFirst({
          where: and(
            eq(saves.userId, viewer.id),
            eq(saves.collectionId, input.id),
          ),
          columns: { userId: true },
        }),
      ]);

      return {
        isOwner: collection.userId === viewer.id,
        liked: !!like,
        saved: !!save,
      };
    }),

  byUsername: publicProcedure
    .input(
      z.object({
        username: z.string(),
        cursor: z.uuid().optional(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const owner = await ctx.db.query.users.findFirst({
        where: (u, { eq: eqOp }) =>
          eqOp(u.username, input.username.toLowerCase()),
      });
      if (!owner)
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const viewer = await optionalCurioUser(ctx);
      const isOwnProfile = viewer?.id === owner.id;

      return ctx.db.query.collections.findMany({
        where: and(
          eq(collections.userId, owner.id),
          eq(collections.isPublished, true),
          isOwnProfile ? undefined : eq(collections.visibility, "public"),
        ),
        orderBy: desc(collections.createdAt),
        limit: input.limit,
      });
    }),

  // Owner's full library including drafts — for the editor/dashboard
  mine: protectedProfileProcedure.query(async ({ ctx }) => {
      return ctx.db.query.collections.findMany({
        where: eq(collections.userId, ctx.profile.id),
        orderBy: desc(collections.updatedAt),
        with: {
          items: {
            columns: { id: true },
          },
        },
      });
    }),

  create: protectedProfileProcedure
    .input(insertCollectionSchema)
    .mutation(async ({ ctx, input }) => {
      const [collection] = await ctx.db
        .insert(collections)
        .values({
          userId: ctx.profile.id,
          title: input.title,
          description: input.description,
          coverImageUrl: input.coverImageUrl,
          tags: input.tags ?? [],
          visibility: input.visibility,
          isPublished: false,
        })
        .returning();

      return collection;
    }),

  update: protectedProfileProcedure
    .input(z.object({ id: z.uuid() }).extend(updateCollectionSchema.shape))
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;

      const [updated] = await ctx.db
        .update(collections)
        .set({ ...patch, updatedAt: new Date() })
        .where(
          and(
            eq(collections.id, id),
            eq(collections.userId, ctx.profile.id),
          ),
        )
        .returning();

      if (!updated) throw new TRPCError({ code: "FORBIDDEN" });
      return updated;
    }),

  publish: protectedProfileProcedure
    .input(
      z.object({
        id: z.uuid(),
        visibility: z.enum(["public", "unlisted"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertEmailVerifiedForPublish(ctx.session.user);

      const collection = await ctx.db.query.collections.findFirst({
        where: and(
          eq(collections.id, input.id),
          eq(collections.userId, ctx.profile.id),
        ),
        with: { items: true },
      });
      if (!collection) throw new TRPCError({ code: "FORBIDDEN" });

      const incomplete = findIncompleteItems(collection.items);
      if (incomplete.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Some items are missing a source URL or description before you can publish.",
          cause: {
            incompleteItems: incomplete.map((i) => ({
              id: i.id,
              title: i.title,
            })),
          },
        });
      }

      const wasPublished = collection.isPublished;

      const [updated] = await ctx.db
        .update(collections)
        .set({
          visibility: input.visibility,
          isPublished: true,
          updatedAt: new Date(),
        })
        .where(eq(collections.id, input.id))
        .returning();

      if (!wasPublished) {
        await ctx.db
          .update(users)
          .set({ collectionCount: sql`${users.collectionCount} + 1` })
          .where(eq(users.id, ctx.profile.id));
      }

      return updated;
    }),

  unpublish: protectedProfileProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const collection = await ctx.db.query.collections.findFirst({
        where: and(
          eq(collections.id, input.id),
          eq(collections.userId, ctx.profile.id),
        ),
        columns: { isPublished: true },
      });
      if (!collection) throw new TRPCError({ code: "FORBIDDEN" });

      const [updated] = await ctx.db
        .update(collections)
        .set({
          isPublished: false,
          visibility: "private",
          updatedAt: new Date(),
        })
        .where(eq(collections.id, input.id))
        .returning();

      if (collection.isPublished) {
        await ctx.db
          .update(users)
          .set({
            collectionCount: sql`greatest(${users.collectionCount} - 1, 0)`,
          })
          .where(eq(users.id, ctx.profile.id));
      }

      return updated;
    }),

  setVisibility: protectedProfileProcedure
    .input(
      z.object({
        id: z.uuid(),
        visibility: z.enum(["public", "unlisted", "private"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.visibility !== "private") {
        assertEmailVerifiedForPublish(ctx.session.user);

        const collection = await ctx.db.query.collections.findFirst({
          where: and(
            eq(collections.id, input.id),
            eq(collections.userId, ctx.profile.id),
          ),
          with: { items: true },
        });
        if (!collection) throw new TRPCError({ code: "FORBIDDEN" });

        const incomplete = findIncompleteItems(collection.items);
        if (incomplete.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Some items are missing a source URL or description before you can publish.",
            cause: {
              incompleteItems: incomplete.map((i) => ({
                id: i.id,
                title: i.title,
              })),
            },
          });
        }
      }

      const [updated] = await ctx.db
        .update(collections)
        .set({ visibility: input.visibility, updatedAt: new Date() })
        .where(
          and(
            eq(collections.id, input.id),
            eq(collections.userId, ctx.profile.id),
          ),
        )
        .returning();

      if (!updated) throw new TRPCError({ code: "FORBIDDEN" });
      return updated;
    }),

  setMature: protectedProfileProcedure
    .input(z.object({ id: z.uuid(), matureContent: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(collections)
        .set({ matureContent: input.matureContent, updatedAt: new Date() })
        .where(
          and(
            eq(collections.id, input.id),
            eq(collections.userId, ctx.profile.id),
          ),
        )
        .returning();

      if (!updated) throw new TRPCError({ code: "FORBIDDEN" });
      return updated;
    }),

  delete: protectedProfileProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.collections.findFirst({
        where: and(
          eq(collections.id, input.id),
          eq(collections.userId, ctx.profile.id),
        ),
        columns: { isPublished: true },
      });
      if (!existing) throw new TRPCError({ code: "FORBIDDEN" });

      const [deleted] = await ctx.db
        .delete(collections)
        .where(eq(collections.id, input.id))
        .returning({ id: collections.id });

      if (existing.isPublished) {
        await ctx.db
          .update(users)
          .set({
            collectionCount: sql`greatest(${users.collectionCount} - 1, 0)`,
          })
          .where(eq(users.id, ctx.profile.id));
      }

      return deleted;
    }),

  recordView: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(collections)
        .set({ viewCount: sql`${collections.viewCount} + 1` })
        .where(eq(collections.id, input.id));
      return { ok: true };
    }),
} satisfies TRPCRouterRecord;
