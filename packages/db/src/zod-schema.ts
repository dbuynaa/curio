import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";

import {
  collectionLikes,
  collections,
  comments,
  creators,
  follows,
  itemLikes,
  items,
  saves,
  users,
} from "./tables";

// ---------------------------------------------------------------------------
// Users — FR-1.4 (username format), FR-2.2 (bio length already enforced by
// the column's varchar(300), refined here to also trim and reject blank-only)
// ---------------------------------------------------------------------------

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, hyphens, and underscores",
  );

export const insertUserSchema = createInsertSchema(users, {
  username: () => usernameSchema,
  displayName: (schema) => schema.trim().max(60).optional(),
  bio: (schema) => schema.trim().max(300).optional(),
  avatarUrl: (schema) => schema.url("Avatar must be a valid URL").optional(),
}).omit({
  id: true,
  authUserId: true,
  isAdultConfirmed: true,
  followerCount: true,
  followingCount: true,
  collectionCount: true,
  createdAt: true,
});

export const updateUserSchema = createUpdateSchema(users, {
  username: () => usernameSchema.optional(),
  displayName: (schema) => schema.trim().max(60).optional(),
  bio: (schema) => schema.trim().max(300).optional(),
  avatarUrl: (schema) => schema.url("Avatar must be a valid URL").optional(),
  searchIndexable: (schema) => schema.optional(),
}).omit({
  id: true,
  authUserId: true,
  followerCount: true,
  followingCount: true,
  collectionCount: true,
  createdAt: true,
});

export const selectUserSchema = createSelectSchema(users);

// FR-1.1 — signup payload is narrower than the full insert (no display name
// / bio / avatar at this step, per the short onboarding flow in FR-1.5)
export const signupSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// FR-1.5 — onboarding step 1: username only is required
export const onboardingSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(300).optional(),
  avatarUrl: z.url().optional(),
});

// ---------------------------------------------------------------------------
// Creators — system-managed (auto-created from item.creatorName, FR-8.1),
// so only a select schema is exposed; no public insert/update endpoint.
// ---------------------------------------------------------------------------

export const selectCreatorSchema = createSelectSchema(creators);

// ---------------------------------------------------------------------------
// Collections — FR-3.1 (create), FR-3.3 (publish gate, composed separately
// below since it depends on the item set, not just the collection row)
// ---------------------------------------------------------------------------

export const insertCollectionSchema = createInsertSchema(collections, {
  title: (schema) => schema.trim().min(1, "Title is required").max(120),
  description: (schema) => schema.trim().max(500).optional(),
  coverImageUrl: (schema) =>
    schema.url("Cover image must be a valid URL").optional(),
  tags: (schema) => schema.max(25, "Up to 25 tags per collection").optional(),
}).omit({
  id: true,
  userId: true, // set from the authenticated session, never from the client
  isPublished: true, // toggled through the dedicated publish action, FR-3.3
  likeCount: true,
  saveCount: true,
  commentCount: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCollectionSchema = createUpdateSchema(collections, {
  title: (schema) => schema.trim().min(1).max(120).optional(),
  description: (schema) => schema.trim().max(500).optional(),
  coverImageUrl: (schema) => schema.url().optional(),
  tags: (schema) => schema.max(25).optional(),
}).omit({
  id: true,
  userId: true,
  isPublished: true,
  likeCount: true,
  saveCount: true,
  commentCount: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

export const selectCollectionSchema = createSelectSchema(collections);

// ---------------------------------------------------------------------------
// Items — FR-4.1 to FR-4.6
// ---------------------------------------------------------------------------

export const insertItemSchema = createInsertSchema(items, {
  title: (schema) => schema.trim().min(1, "Title is required").max(200),
  // Nullable at the DB layer (draft items mid-edit, see schema comment),
  // but when present it must actually be a valid URL — FR-4.3
  sourceUrl: (schema) => schema.url("Enter a valid URL").optional(),
  description: (schema) => schema.trim().max(5000).optional(),
  creatorName: (schema) => schema.trim().max(120).optional(),
  creatorUrl: (schema) => schema.url("Creator URL must be valid").optional(),
  thumbnailUrl: (schema) => schema.url().optional(),
  tags: (schema) => schema.max(25, "Up to 25 tags per item").optional(),
}).omit({
  id: true,
  collectionId: true, // set from the route param, never from the body
  sourceUrlNormalized: true, // computed server-side, FR-4.3
  isLinkBroken: true, // set by the link-validation job, not the client
  creatorId: true, // resolved server-side via creator normalization, FR-4.4
  likeCount: true,
  frequencyCount: true,
  commentCount: true,
  createdAt: true,
  updatedAt: true,
});

export const updateItemSchema = createUpdateSchema(items, {
  title: (schema) => schema.trim().min(1).max(200).optional(),
  sourceUrl: (schema) => schema.url("Enter a valid URL").optional(),
  description: (schema) => schema.trim().max(5000).optional(),
  creatorName: (schema) => schema.trim().max(120).optional(),
  creatorUrl: (schema) => schema.url().optional(),
  thumbnailUrl: (schema) => schema.url().optional(),
  tags: (schema) => schema.max(25).optional(),
}).omit({
  id: true,
  collectionId: true,
  sourceUrlNormalized: true,
  isLinkBroken: true,
  creatorId: true,
  likeCount: true,
  frequencyCount: true,
  commentCount: true,
  createdAt: true,
  updatedAt: true,
});

export const selectItemSchema = createSelectSchema(items);

// FR-4.1 — Fast Add Flow's first step: just a URL, before any metadata
// has been fetched or the description has been written
export const fastAddUrlSchema = z.object({
  sourceUrl: z.url("Enter a valid URL"),
});

// FR-3.3 / FR-4.2 / FR-4.3 — the publish-gate hard rule. Run this against
// every item belonging to a collection before allowing
// visibility to move to 'public' or 'unlisted'. Deliberately a separate
// schema from insertItemSchema/updateItemSchema, since drafts (private,
// mid-edit) are allowed to violate it — only publish-time enforcement does.
export const publishableItemSchema = z.object({
  sourceUrl: z.url("Every item needs a valid source URL before publishing"),
  description: z
    .string()
    .trim()
    .min(1, "Every item needs a description explaining why you picked it"),
});

export function validateCollectionPublishable(
  itemsInCollection: { sourceUrl: string | null; description: string | null }[],
) {
  const incomplete = itemsInCollection
    .map((item, index) => ({
      index,
      result: publishableItemSchema.safeParse(item),
    }))
    .filter((entry) => !entry.result.success);

  return {
    canPublish: incomplete.length === 0,
    incompleteItemIndexes: incomplete.map((entry) => entry.index),
  };
}

// ---------------------------------------------------------------------------
// Follows — FR-6.1
// ---------------------------------------------------------------------------

export const insertFollowSchema = createInsertSchema(follows).omit({
  followerId: true, // from session
  createdAt: true,
});

export const selectFollowSchema = createSelectSchema(follows);

// ---------------------------------------------------------------------------
// Likes — FR-6.2, FR-6.3
// ---------------------------------------------------------------------------

export const insertCollectionLikeSchema = createInsertSchema(
  collectionLikes,
).omit({
  userId: true,
  createdAt: true,
});

export const insertItemLikeSchema = createInsertSchema(itemLikes).omit({
  userId: true,
  createdAt: true,
});

// ---------------------------------------------------------------------------
// Saves — FR-6.4 (private bookmark, no attribution fields to validate)
// ---------------------------------------------------------------------------

export const insertSaveSchema = createInsertSchema(saves).omit({
  userId: true,
  createdAt: true,
});

export const selectSaveSchema = createSelectSchema(saves);

// ---------------------------------------------------------------------------
// Comments — FR-6.5, FR-6.6, FR-6.7
// ---------------------------------------------------------------------------

export const insertCommentSchema = createInsertSchema(comments, {
  body: (schema) =>
    schema
      .trim()
      .min(1, "Comment can't be empty")
      .max(2000, "Comment is too long"),
}).omit({
  id: true,
  userId: true, // from session
  commentCount: true as never, // not a real column, guards against accidental misuse
  createdAt: true,
  deletedAt: true,
});

export const selectCommentSchema = createSelectSchema(comments);

// FR-6.6 — narrower payload for an item-anchored reply, where itemId is
// required (collection-level comments leave it undefined)
export const itemCommentSchema = insertCommentSchema.extend({
  itemId: z.uuid(),
});

// FR-6.5 — a reply must target an existing top-level comment; the API layer
// is still responsible for rejecting reply-to-reply (one level deep only)
export const replyCommentSchema = insertCommentSchema.extend({
  parentCommentId: z.uuid(),
});

// ---------------------------------------------------------------------------
// Inferred types — for use across API handlers and the editor UI
// ---------------------------------------------------------------------------

export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = z.infer<typeof selectUserSchema>;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type UpdateCollection = z.infer<typeof updateCollectionSchema>;
export type SelectCollection = z.infer<typeof selectCollectionSchema>;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type UpdateItem = z.infer<typeof updateItemSchema>;
export type SelectItem = z.infer<typeof selectItemSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type SelectComment = z.infer<typeof selectCommentSchema>;
