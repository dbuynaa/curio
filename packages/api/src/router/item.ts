import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { eq } from "@acme/db";
import { items } from "@acme/db/schema";
import { itemInsertSchema, itemUpdateSchema } from "@acme/validators";

import type { DB } from "../lib/db-types";
import { resolveCreator } from "../lib/creator";
import { fetchOgMetadata } from "../lib/fetch-og-metadata";
import { normalizeSourceUrl } from "../lib/normalize-url";
import { createTRPCRouter, protectedProcedure } from "../trpc";

async function assertCollectionOwnership(
  db: DB,
  collectionId: string,
  userId: string,
) {
  const collection = await db.query.collections.findFirst({
    where: { id: collectionId },
  });
  if (!collection)
    throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
  if (collection.userId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
  return collection;
}

/**
 * FR-4.3 — syntactically valid AND resolves with a 200-range status at
 * submission time. Rejects at submission with a specific error rather than
 * silently saving a broken link.
 */
async function validateSourceUrl(rawUrl: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Source URL is not a valid URL",
    });
  }

  const attempt = async (method: "HEAD" | "GET") => {
    const res = await fetch(parsed.toString(), { method, redirect: "follow" });
    return res.ok;
  };

  // Some hosts reject HEAD (405/501) — fall back to GET before failing.
  const ok =
    (await attempt("HEAD").catch(() => false)) ||
    (await attempt("GET").catch(() => false));
  if (!ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Source URL does not resolve",
    });
  }
  return parsed.toString();
}

export const itemRouter = createTRPCRouter({
  // FR-4.1 — fast-add metadata fetch; failures return null so the client
  // falls back to manual entry rather than blocking the add action.
  fetchMetadata: protectedProcedure
    .input(z.object({ url: z.url().max(2048) }))
    .query(async ({ input }) => fetchOgMetadata(input.url)),

  // FR-4.1 / FR-4.3 / FR-4.4 — items can be saved incomplete as drafts
  // (empty sourceUrl/description); only publish (FR-3.3) enforces completeness.
  create: protectedProcedure
    .input(itemInsertSchema.extend({ collectionId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { collectionId, sourceUrl, creatorName, creatorUrl, ...rest } =
        input;
      await assertCollectionOwnership(ctx.db, collectionId, ctx.user.id);

      let sourceUrlNormalized: string | null = null;
      if (sourceUrl) {
        await validateSourceUrl(sourceUrl);
        sourceUrlNormalized = normalizeSourceUrl(sourceUrl);
      }

      // FR-4.4 — resolves or creates the creators row, sets items.creatorId
      let creatorId: string | null = null;
      if (creatorName) {
        creatorId = (await resolveCreator(ctx.db, { creatorName, creatorUrl }))
          .id;
      }

      const last = await ctx.db.query.items.findFirst({
        where: { collectionId },
        orderBy: { position: "desc" },
        columns: { position: true },
      });

      const [item] = await ctx.db
        .insert(items)
        .values({
          ...rest,
          sourceUrl,
          sourceUrlNormalized,
          creatorName,
          creatorUrl,
          creatorId,
          collectionId,
          position: (last?.position ?? -1) + 1,
        })
        .returning();

      return item;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.uuid() }).merge(itemUpdateSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, sourceUrl, creatorName, creatorUrl, ...patch } = input;

      const item = await ctx.db.query.items.findFirst({ where: { id } });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      await assertCollectionOwnership(ctx.db, item.collectionId, ctx.user.id);

      const updates: Record<string, unknown> = {
        ...patch,
        updatedAt: new Date(),
      };

      if (sourceUrl !== undefined) {
        if (sourceUrl) {
          await validateSourceUrl(sourceUrl);
          updates.sourceUrl = sourceUrl;
          updates.sourceUrlNormalized = normalizeSourceUrl(sourceUrl);
        } else {
          updates.sourceUrl = null;
          updates.sourceUrlNormalized = null;
        }
      }

      if (creatorName !== undefined) {
        updates.creatorName = creatorName;
        updates.creatorUrl = creatorUrl;
        updates.creatorId = creatorName
          ? (await resolveCreator(ctx.db, { creatorName, creatorUrl })).id
          : null;
      }

      const [updated] = await ctx.db
        .update(items)
        .set(updates)
        .where(eq(items.id, id))
        .returning();
      return updated;
    }),

  // FR-3.2 — hard delete, no soft-delete requirement for MVP
  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.query.items.findFirst({
        where: { id: input.id },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      await assertCollectionOwnership(ctx.db, item.collectionId, ctx.user.id);

      await ctx.db.delete(items).where(eq(items.id, input.id));
      return { success: true };
    }),

  // FR-4.6
  setMature: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.query.items.findFirst({
        where: { id: input.id },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      await assertCollectionOwnership(ctx.db, item.collectionId, ctx.user.id);

      const [updated] = await ctx.db
        .update(items)
        .set({ updatedAt: new Date() })
        .where(eq(items.id, input.id))
        .returning();
      return updated;
    }),
});
