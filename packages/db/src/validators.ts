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
  contentTypeEnum,
  creators,
  follows,
  itemLikes,
  items,
  saves,
  users,
  visibilityEnum,
} from "./schema";

// ---------------------------------------------------------------------------
// Shared enum schemas (re-exported for use in query params, API DTOs, etc.)
// ---------------------------------------------------------------------------

export const visibilitySchema = z.enum(visibilityEnum.enumValues);
export const contentTypeSchema = z.enum(contentTypeEnum.enumValues);

// A few small helpers reused across tables
const urlOptional = () => z.url().max(2048).optional().nullable();
const tagsArray = () =>
  z.array(z.string().trim().min(1).max(40)).max(30).default([]);

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const userSelectSchema = createSelectSchema(users);

export const userInsertSchema = createInsertSchema(users, {
  username: (schema) =>
    schema
      .min(3, "Username must be at least 3 characters")
      .max(30)
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username may only contain letters, numbers, and underscores",
      ),
  displayName: (schema) => schema.max(60).optional().nullable(),
  bio: (schema) => schema.max(300).optional().nullable(),
  avatarUrl: () => urlOptional(),
}).omit({
  id: true,
  followerCount: true,
  followingCount: true,
  collectionCount: true,
  createdAt: true,
});

export const userUpdateSchema = createUpdateSchema(users, {
  username: (schema) =>
    schema
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/)
      .optional(),
  displayName: (schema) => schema.max(60).optional().nullable(),
  bio: (schema) => schema.max(300).optional().nullable(),
  avatarUrl: () => urlOptional(),
}).omit({
  id: true,
  authUserId: true,
  followerCount: true,
  followingCount: true,
  collectionCount: true,
  createdAt: true,
});

// ---------------------------------------------------------------------------
// creators
// ---------------------------------------------------------------------------

export const creatorSelectSchema = createSelectSchema(creators);

export const creatorInsertSchema = createInsertSchema(creators, {
  normalizedName: (schema) => schema.min(1).max(120),
  displayName: (schema) => schema.min(1).max(120),
  canonicalUrl: () => urlOptional(),
}).omit({
  id: true,
  citationCount: true,
  collectionCount: true,
  createdAt: true,
});

export const creatorUpdateSchema = createUpdateSchema(creators, {
  displayName: (schema) => schema.min(1).max(120).optional(),
  canonicalUrl: () => urlOptional(),
}).omit({
  id: true,
  normalizedName: true,
  citationCount: true,
  collectionCount: true,
  createdAt: true,
});

// ---------------------------------------------------------------------------
// collections
// ---------------------------------------------------------------------------

export const collectionSelectSchema = createSelectSchema(collections, {
  tags: () => tagsArray(),
});

export const collectionInsertSchema = createInsertSchema(collections, {
  title: (schema) => schema.min(1, "Title is required").max(120),
  description: (schema) => schema.max(500).optional().nullable(),
  coverImageUrl: () => urlOptional(),
  visibility: () => visibilitySchema.default("private"),
  tags: () => tagsArray(),
}).omit({
  id: true,
  userId: true,
  likeCount: true,
  saveCount: true,
  commentCount: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

export const collectionUpdateSchema = createUpdateSchema(collections, {
  title: (schema) => schema.min(1).max(120).optional(),
  description: (schema) => schema.max(500).optional().nullable(),
  coverImageUrl: () => urlOptional(),
  visibility: () => visibilitySchema.optional(),
  tags: () => tagsArray().optional(),
}).omit({
  id: true,
  userId: true,
  likeCount: true,
  saveCount: true,
  commentCount: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

// ---------------------------------------------------------------------------
// items
// ---------------------------------------------------------------------------

export const itemSelectSchema = createSelectSchema(items, {
  tags: () => tagsArray(),
});

export const itemInsertSchema = createInsertSchema(items, {
  title: (schema) => schema.min(1, "Title is required").max(200),
  sourceUrl: () => urlOptional(),
  sourceUrlNormalized: () => z.string().max(2048).optional().nullable(),
  description: (schema) => schema.optional().nullable(),
  contentType: () => contentTypeSchema.default("link"),
  creatorName: (schema) => schema.max(120).optional().nullable(),
  creatorUrl: () => urlOptional(),
  thumbnailUrl: () => urlOptional(),
  tags: () => tagsArray(),
  position: (schema) => schema.int().nonnegative().default(0),
}).omit({
  id: true,
  collectionId: true,
  isLinkBroken: true,
  creatorId: true,
  likeCount: true,
  frequencyCount: true,
  commentCount: true,
  createdAt: true,
  updatedAt: true,
});

export const itemUpdateSchema = createUpdateSchema(items, {
  title: (schema) => schema.min(1).max(200).optional(),
  sourceUrl: () => urlOptional(),
  description: (schema) => schema.optional().nullable(),
  contentType: () => contentTypeSchema.optional(),
  creatorName: (schema) => schema.max(120).optional().nullable(),
  creatorUrl: () => urlOptional(),
  thumbnailUrl: () => urlOptional(),
  tags: () => tagsArray().optional(),
  position: (schema) => schema.int().nonnegative().optional(),
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

// ---------------------------------------------------------------------------
// follows
// ---------------------------------------------------------------------------

export const followSelectSchema = createSelectSchema(follows);

export const followInsertSchema = createInsertSchema(follows)
  .omit({ createdAt: true })
  .refine((data) => data.followerId !== data.followingId, {
    message: "A user cannot follow themselves",
    path: ["followingId"],
  });

// ---------------------------------------------------------------------------
// collection likes
// ---------------------------------------------------------------------------

export const collectionLikeSelectSchema = createSelectSchema(collectionLikes);

export const collectionLikeInsertSchema = createInsertSchema(
  collectionLikes,
).omit({ createdAt: true });

// ---------------------------------------------------------------------------
// item likes
// ---------------------------------------------------------------------------

export const itemLikeSelectSchema = createSelectSchema(itemLikes);

export const itemLikeInsertSchema = createInsertSchema(itemLikes).omit({
  createdAt: true,
});

// ---------------------------------------------------------------------------
// saves
// ---------------------------------------------------------------------------

export const saveSelectSchema = createSelectSchema(saves);

export const saveInsertSchema = createInsertSchema(saves).omit({
  createdAt: true,
});

// ---------------------------------------------------------------------------
// comments
// ---------------------------------------------------------------------------

export const commentSelectSchema = createSelectSchema(comments);

export const commentInsertSchema = createInsertSchema(comments, {
  body: (schema) => schema.trim().min(1, "Comment cannot be empty").max(2000),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
  deletedAt: true,
});

export const commentUpdateSchema = createUpdateSchema(comments, {
  body: (schema) => schema.trim().min(1).max(2000).optional(),
}).pick({
  body: true,
});

// ---------------------------------------------------------------------------
// Inferred types (optional convenience exports)
// ---------------------------------------------------------------------------

export type UserInsert = z.infer<typeof userInsertSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type CreatorInsert = z.infer<typeof creatorInsertSchema>;
export type CollectionInsert = z.infer<typeof collectionInsertSchema>;
export type CollectionUpdate = z.infer<typeof collectionUpdateSchema>;
export type ItemInsert = z.infer<typeof itemInsertSchema>;
export type ItemUpdate = z.infer<typeof itemUpdateSchema>;
export type FollowInsert = z.infer<typeof followInsertSchema>;
export type CommentInsert = z.infer<typeof commentInsertSchema>;
export type CommentUpdate = z.infer<typeof commentUpdateSchema>;
