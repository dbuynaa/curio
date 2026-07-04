import {
  index,
  pgEnum,
  primaryKey,
  snakeCase,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

const pgTable = snakeCase.table;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const visibilityEnum = pgEnum("visibility", [
  "public",
  "unlisted",
  "private",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "image",
  "video",
  "audio",
  "article",
  "product",
  "profile",
  "link", // generic fallback
]);

// ---------------------------------------------------------------------------
// profile
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    // Links to better-auth `user.id` (text). Set during onboarding — a
    // freshly signed-up auth user has no `profile` row until FR-1.5
    // completes. Real FK (not just a relation) so referential integrity is
    // enforced at the DB layer, not just in application code.
    authUserId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    username: t.varchar({ length: 30 }).notNull(),
    displayName: t.varchar({ length: 60 }),
    bio: t.varchar({ length: 300 }),
    avatarUrl: t.text(),
    // FR-2.3 — profiles are indexable by default; owner can opt out
    searchIndexable: t.boolean().notNull().default(true),

    // Denormalized counters
    followerCount: t.integer().notNull().default(0),
    followingCount: t.integer().notNull().default(0),
    collectionCount: t.integer().notNull().default(0),

    createdAt: t.timestamp({ withTimezone: true }).defaultNow(),
  }),
  (table) => [
    uniqueIndex("users_username_unique").on(table.username),
    uniqueIndex("users_auth_user_id_unique").on(table.authUserId),
  ],
);

// ---------------------------------------------------------------------------
// Creators (auto-generated, account-less pages — PRD section 17)
// ---------------------------------------------------------------------------

export const creators = pgTable(
  "creators",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    // Normalized form of item.creatorName — lowercase, trimmed, common
    // suffixes stripped (_art, _draws, _music) per PRD 20.4
    normalizedName: t.varchar({ length: 120 }).notNull(),
    displayName: t.varchar({ length: 120 }).notNull(),
    canonicalUrl: t.text(),

    citationCount: t.integer().notNull().default(0),
    collectionCount: t.integer().notNull().default(0),

    createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (table) => [
    uniqueIndex("creators_normalized_name_unique").on(table.normalizedName),
  ],
);

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export const collections = pgTable(
  "collections",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    userId: t
      .uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    title: t.varchar({ length: 120 }).notNull(),
    description: t.varchar({ length: 500 }),
    coverImageUrl: t.text(),

    visibility: visibilityEnum().notNull().default("private"),
    isPublished: t.boolean().notNull().default(false),

    // Free-form, X-style tags — no canonical tag table, PRD 9.2 / 15.1
    tags: t.text().array().notNull().default([]),

    matureContent: t.boolean().notNull().default(false),

    // Denormalized counters
    likeCount: t.integer().notNull().default(0),
    saveCount: t.integer().notNull().default(0),
    commentCount: t.integer().notNull().default(0),
    viewCount: t.integer().notNull().default(0),

    createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (table) => [
    index("collections_user_id_idx").on(table.userId),
    index("collections_visibility_idx").on(table.visibility),
  ],
);

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export const items = pgTable(
  "items",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    collectionId: t
      .uuid()
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),

    title: t.varchar({ length: 200 }).notNull(),

    sourceUrl: t.text(),
    sourceUrlNormalized: t.text(),
    isLinkBroken: t.boolean().notNull().default(false),

    description: t.text(),

    contentType: contentTypeEnum().notNull().default("link"),

    creatorName: t.varchar({ length: 120 }),
    creatorUrl: t.text(),
    creatorId: t.uuid().references(() => creators.id, {
      onDelete: "set null",
    }),

    thumbnailUrl: t.text(),

    tags: t.text().array().notNull().default([]),

    matureContent: t.boolean().notNull().default(false),

    position: t.integer().notNull().default(0),

    // Denormalized counters
    likeCount: t.integer().notNull().default(0),
    frequencyCount: t.integer().notNull().default(0),
    commentCount: t.integer().notNull().default(0),

    createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (table) => [
    index("items_collection_id_idx").on(table.collectionId),
    index("items_source_url_normalized_idx").on(table.sourceUrlNormalized),
    index("items_creator_id_idx").on(table.creatorId),
    uniqueIndex("items_collection_position_idx").on(
      table.collectionId,
      table.position,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

export const follows = pgTable(
  "follows",
  (t) => ({
    followerId: t
      .uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: t
      .uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (table) => [
    primaryKey({ columns: [table.followerId, table.followingId] }),
    index("follows_following_id_idx").on(table.followingId),
  ],
);

// ---------------------------------------------------------------------------
// Likes — collection-level and item-level are separate signals (PRD 10)
// ---------------------------------------------------------------------------

export const collectionLikes = pgTable(
  "collection_likes",
  (t) => ({
    userId: t
      .uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    collectionId: t
      .uuid()
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (table) => [primaryKey({ columns: [table.userId, table.collectionId] })],
);

export const itemLikes = pgTable(
  "item_likes",
  (t) => ({
    userId: t
      .uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: t
      .uuid()
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (table) => [primaryKey({ columns: [table.userId, table.itemId] })],
);

// ---------------------------------------------------------------------------
// Saves — private bookmark.
// ---------------------------------------------------------------------------

export const saves = pgTable(
  "saves",
  (t) => ({
    userId: t
      .uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    collectionId: t
      .uuid()
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (table) => [primaryKey({ columns: [table.userId, table.collectionId] })],
);

// ---------------------------------------------------------------------------
// Comments — collection-level and item-anchored, one level deep (PRD 16.5)
// ---------------------------------------------------------------------------

export const comments = pgTable(
  "comments",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    userId: t
      .uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    collectionId: t
      .uuid()
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),

    itemId: t.uuid().references(() => items.id, {
      onDelete: "cascade",
    }),

    parentCommentId: t.uuid(),

    body: t.text().notNull(),

    createdAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
    deletedAt: t.timestamp({ withTimezone: true }),
  }),
  (table) => [
    index("comments_collection_id_idx").on(table.collectionId),
    index("comments_item_id_idx").on(table.itemId),
    index("comments_parent_comment_id_idx").on(table.parentCommentId),
  ],
);

// Note: relations now live in ./relations.ts (RQBv2 / defineRelations),
// not co-located with table definitions. See that file for the full
// relational graph.

export * from "./auth-schema";
