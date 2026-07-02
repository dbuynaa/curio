import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

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
// Users
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Links to better-auth `user.id` (text). Set during onboarding.
    authUserId: text("auth_user_id").notNull(),
    username: varchar("username", { length: 30 }).notNull(),
    displayName: varchar("display_name", { length: 60 }),
    bio: varchar("bio", { length: 300 }),
    avatarUrl: text("avatar_url"),

    // Age-gate confirmation for viewing unblurred mature content — PRD 18.5
    isAdultConfirmed: boolean("is_adult_confirmed").notNull().default(false),

    // FR-2.3 — profiles are indexable by default; owner can opt out
    searchIndexable: boolean("search_indexable").notNull().default(true),

    // Denormalized counters
    followerCount: integer("follower_count").notNull().default(0),
    followingCount: integer("following_count").notNull().default(0),
    collectionCount: integer("collection_count").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    usernameUnique: uniqueIndex("users_username_unique").on(table.username),
    authUserIdUnique: uniqueIndex("users_auth_user_id_unique").on(
      table.authUserId,
    ),
  }),
);

// ---------------------------------------------------------------------------
// Creators (auto-generated, account-less pages — PRD section 17)
// ---------------------------------------------------------------------------

export const creators = pgTable(
  "creators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Normalized form of item.creatorName — lowercase, trimmed, common
    // suffixes stripped (_art, _draws, _music) per PRD 20.4
    normalizedName: varchar("normalized_name", { length: 120 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    canonicalUrl: text("canonical_url"),

    citationCount: integer("citation_count").notNull().default(0),
    collectionCount: integer("collection_count").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    normalizedNameUnique: uniqueIndex("creators_normalized_name_unique").on(
      table.normalizedName,
    ),
  }),
);

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    title: varchar("title", { length: 120 }).notNull(),
    description: varchar("description", { length: 500 }),
    coverImageUrl: text("cover_image_url"),

    visibility: visibilityEnum("visibility").notNull().default("private"),
    isPublished: boolean("is_published").notNull().default(false),

    // Free-form, X-style tags — no canonical tag table, PRD 9.2 / 15.1
    tags: text("tags").array().notNull().default([]),

    matureContent: boolean("mature_content").notNull().default(false),

    // Denormalized counters
    likeCount: integer("like_count").notNull().default(0),
    saveCount: integer("save_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("collections_user_id_idx").on(table.userId),
    visibilityIdx: index("collections_visibility_idx").on(table.visibility),
  }),
);

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),

    title: varchar("title", { length: 200 }).notNull(),

    // Nullable at the DB layer to allow draft items mid-edit. Hard rule
    // (PRD 14.1) — no source, no description, no publish — is enforced
    // in the API layer at publish time, not as a DB constraint.
    sourceUrl: text("source_url"),
    sourceUrlNormalized: text("source_url_normalized"), // for frequency_count matching
    isLinkBroken: boolean("is_link_broken").notNull().default(false),

    description: text("description"),

    contentType: contentTypeEnum("content_type").notNull().default("link"),

    creatorName: varchar("creator_name", { length: 120 }),
    creatorUrl: text("creator_url"),
    creatorId: uuid("creator_id").references(() => creators.id, {
      onDelete: "set null",
    }),

    thumbnailUrl: text("thumbnail_url"),

    tags: text("tags").array().notNull().default([]),

    matureContent: boolean("mature_content").notNull().default(false),

    position: integer("position").notNull().default(0),

    // Denormalized counters
    likeCount: integer("like_count").notNull().default(0),
    frequencyCount: integer("frequency_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    collectionIdIdx: index("items_collection_id_idx").on(table.collectionId),
    sourceUrlNormalizedIdx: index("items_source_url_normalized_idx").on(
      table.sourceUrlNormalized,
    ),
    creatorIdIdx: index("items_creator_id_idx").on(table.creatorId),
    collectionPositionIdx: uniqueIndex("items_collection_position_idx").on(
      table.collectionId,
      table.position,
    ),
  }),
);

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.followerId, table.followingId] }),
    followingIdIdx: index("follows_following_id_idx").on(table.followingId),
  }),
);

// ---------------------------------------------------------------------------
// Likes — collection-level and item-level are separate signals (PRD 10)
// ---------------------------------------------------------------------------

export const collectionLikes = pgTable(
  "collection_likes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.collectionId] }),
  }),
);

export const itemLikes = pgTable(
  "item_likes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.itemId] }),
  }),
);

// ---------------------------------------------------------------------------
// Saves — private bookmark. A user can save any collection to come back
// to later. Always private; not shown to anyone else, no attribution
// display to manage, no public-facing logic.
// ---------------------------------------------------------------------------

export const saves = pgTable(
  "saves",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.collectionId] }),
  }),
);

// ---------------------------------------------------------------------------
// Comments — collection-level and item-anchored, one level deep (PRD 16.5)
// ---------------------------------------------------------------------------

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),

    // Null = collection-level comment. Set = item-anchored comment.
    itemId: uuid("item_id").references(() => items.id, {
      onDelete: "cascade",
    }),

    // One-level-deep threading: a reply points to a top-level comment.
    parentCommentId: uuid("parent_comment_id"),

    body: text("body").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // soft delete
  },
  (table) => ({
    collectionIdIdx: index("comments_collection_id_idx").on(table.collectionId),
    itemIdIdx: index("comments_item_id_idx").on(table.itemId),
    parentCommentIdIdx: index("comments_parent_comment_id_idx").on(
      table.parentCommentId,
    ),
  }),
);
