import { defineRelations } from "drizzle-orm";

import * as schema from "./schema";

// ---------------------------------------------------------------------------
// RQBv2 relations — replaces the per-table `relations()` calls that used to
// live in schema.ts. Everything is declared in one place; `r` gives full
// autocomplete over every table + column in `schema`.
//
// Self-joins (follows: user -> user, comments: parent -> replies) need an
// `alias` on BOTH sides of the pair so Drizzle can tell the two relations
// between the same two tables apart — this replaces v1's `relationName`.
// ---------------------------------------------------------------------------

export const relations = defineRelations(schema, (r) => ({
  users: {
    user: r.one.user({
      from: r.users.authUserId,
      to: r.user.id,
    }),
    collections: r.many.collections(),
    comments: r.many.comments(),
    collectionLikes: r.many.collectionLikes(),
    itemLikes: r.many.itemLikes(),
    saves: r.many.saves(),
    // users this user follows
    following: r.many.follows({
      from: r.users.id,
      to: r.follows.followerId,
      alias: "follower",
    }),
    // users following this user
    followers: r.many.follows({
      from: r.users.id,
      to: r.follows.followingId,
      alias: "following",
    }),
  },

  creators: {
    items: r.many.items(),
  },

  collections: {
    owner: r.one.users({
      from: r.collections.userId,
      to: r.users.id,
    }),
    items: r.many.items(),
    comments: r.many.comments(),
    likes: r.many.collectionLikes(),
    saves: r.many.saves(),
  },

  items: {
    collection: r.one.collections({
      from: r.items.collectionId,
      to: r.collections.id,
    }),
    creator: r.one.creators({
      from: r.items.creatorId,
      to: r.creators.id,
    }),
    likes: r.many.itemLikes(),
    comments: r.many.comments(),
  },

  follows: {
    follower: r.one.users({
      from: r.follows.followerId,
      to: r.users.id,
      alias: "follower",
    }),
    following: r.one.users({
      from: r.follows.followingId,
      to: r.users.id,
      alias: "following",
    }),
  },

  collectionLikes: {
    user: r.one.users({
      from: r.collectionLikes.userId,
      to: r.users.id,
    }),
    collection: r.one.collections({
      from: r.collectionLikes.collectionId,
      to: r.collections.id,
    }),
  },

  itemLikes: {
    user: r.one.users({
      from: r.itemLikes.userId,
      to: r.users.id,
    }),
    item: r.one.items({
      from: r.itemLikes.itemId,
      to: r.items.id,
    }),
  },

  saves: {
    user: r.one.users({
      from: r.saves.userId,
      to: r.users.id,
    }),
    collection: r.one.collections({
      from: r.saves.collectionId,
      to: r.collections.id,
    }),
  },

  comments: {
    author: r.one.users({
      from: r.comments.userId,
      to: r.users.id,
    }),
    collection: r.one.collections({
      from: r.comments.collectionId,
      to: r.collections.id,
    }),
    item: r.one.items({
      from: r.comments.itemId,
      to: r.items.id,
    }),
    parentComment: r.one.comments({
      from: r.comments.parentCommentId,
      to: r.comments.id,
      alias: "comment_replies",
    }),
    replies: r.many.comments({
      from: r.comments.id,
      to: r.comments.parentCommentId,
      alias: "comment_replies",
    }),
  },
}));
