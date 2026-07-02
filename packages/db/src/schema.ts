import { relations } from "drizzle-orm";

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

export * from "./tables";

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  collections: many(collections),
  comments: many(comments),
  collectionLikes: many(collectionLikes),
  itemLikes: many(itemLikes),
  saves: many(saves),
  following: many(follows, { relationName: "follower" }),
  followers: many(follows, { relationName: "following" }),
}));

export const creatorsRelations = relations(creators, ({ many }) => ({
  items: many(items),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  owner: one(users, {
    fields: [collections.userId],
    references: [users.id],
  }),
  items: many(items),
  comments: many(comments),
  likes: many(collectionLikes),
  saves: many(saves),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  collection: one(collections, {
    fields: [items.collectionId],
    references: [collections.id],
  }),
  creator: one(creators, {
    fields: [items.creatorId],
    references: [creators.id],
  }),
  likes: many(itemLikes),
  comments: many(comments),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

export const savesRelations = relations(saves, ({ one }) => ({
  user: one(users, {
    fields: [saves.userId],
    references: [users.id],
  }),
  collection: one(collections, {
    fields: [saves.collectionId],
    references: [collections.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  author: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  collection: one(collections, {
    fields: [comments.collectionId],
    references: [collections.id],
  }),
  item: one(items, {
    fields: [comments.itemId],
    references: [items.id],
  }),
  parentComment: one(comments, {
    fields: [comments.parentCommentId],
    references: [comments.id],
    relationName: "comment_replies",
  }),
  replies: many(comments, { relationName: "comment_replies" }),
}));

export * from "./zod-schema";

export * from "./auth-schema";
