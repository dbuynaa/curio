import { z } from "zod";

export const visibilitySchema = z.enum(["public", "unlisted", "private"]);
export const contentTypeSchema = z.enum([
  "image",
  "video",
  "audio",
  "article",
  "product",
  "profile",
  "link",
]);

const urlOptional = () => z.url().max(2048).optional().nullable();
const tagsArray = () =>
  z.array(z.string().trim().min(1).max(40)).max(30).default([]);
const formTagsArray = () => z.array(z.string().trim().min(1).max(40)).max(30);

export const userInsertSchema = z.object({
  authUserId: z.string().min(1),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username may only contain letters, numbers, and underscores",
    ),
  displayName: z.string().max(60).optional().nullable(),
  bio: z.string().max(300).optional().nullable(),
  avatarUrl: urlOptional(),
  searchIndexable: z.boolean().optional(),
});

export const userUpdateSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  displayName: z.string().max(60).optional().nullable(),
  bio: z.string().max(300).optional().nullable(),
  avatarUrl: urlOptional(),
  searchIndexable: z.boolean().optional(),
});

export const creatorInsertSchema = z.object({
  normalizedName: z.string().min(1).max(120),
  displayName: z.string().min(1).max(120),
  canonicalUrl: urlOptional(),
});

export const creatorUpdateSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  canonicalUrl: urlOptional(),
});

export const collectionInsertSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().max(500).optional().nullable(),
  coverImageUrl: urlOptional(),
  visibility: visibilitySchema.default("private"),
  tags: tagsArray(),
  matureContent: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

export const collectionUpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  coverImageUrl: urlOptional(),
  visibility: visibilitySchema.optional(),
  tags: tagsArray().optional(),
  matureContent: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

export const itemInsertSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  sourceUrl: urlOptional(),
  description: z.string().optional().nullable(),
  contentType: contentTypeSchema.default("link"),
  creatorName: z.string().max(120).optional().nullable(),
  creatorUrl: urlOptional(),
  thumbnailUrl: urlOptional(),
  tags: tagsArray(),
  matureContent: z.boolean().optional(),
  position: z.number().int().nonnegative().default(0),
});

export const itemUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  sourceUrl: urlOptional(),
  description: z.string().optional().nullable(),
  contentType: contentTypeSchema.optional(),
  creatorName: z.string().max(120).optional().nullable(),
  creatorUrl: urlOptional(),
  thumbnailUrl: urlOptional(),
  tags: tagsArray().optional(),
  matureContent: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
});

export const followInsertSchema = z
  .object({
    followerId: z.uuid(),
    followingId: z.uuid(),
  })
  .refine((data) => data.followerId !== data.followingId, {
    message: "A user cannot follow themselves",
    path: ["followingId"],
  });

export const collectionLikeInsertSchema = z.object({
  userId: z.uuid(),
  collectionId: z.uuid(),
});

export const itemLikeInsertSchema = z.object({
  userId: z.uuid(),
  itemId: z.uuid(),
});

export const saveInsertSchema = z.object({
  userId: z.uuid(),
  collectionId: z.uuid(),
});

export const commentInsertSchema = z.object({
  collectionId: z.uuid(),
  itemId: z.uuid().optional().nullable(),
  parentCommentId: z.uuid().optional().nullable(),
  body: z.string().trim().min(1, "Comment cannot be empty").max(2000),
});

export const commentUpdateSchema = z.object({
  body: z.string().trim().min(1).max(2000).optional(),
});

export const itemFormSchema = z.object({
  title: itemInsertSchema.shape.title,
  sourceUrl: z
    .string()
    .max(2048)
    .refine((v) => v === "" || z.url().safeParse(v).success, {
      message: "Must be a valid URL",
    }),
  creatorName: z.string().max(120),
  description: z.string(),
  thumbnailUrl: z.string().url().max(2048).or(z.literal("")),
});

const collectionFormSchema = z.object({
  title: collectionInsertSchema.shape.title,
  description: z.string().max(500),
  tags: formTagsArray(),
  coverImageUrl: z.string().url().max(2048).or(z.literal("")),
});

export const newCollectionFormSchema = collectionFormSchema.extend({
  items: z.array(itemFormSchema).min(1, "Add at least one item"),
});

const publishItemFormSchema = itemFormSchema.extend({
  sourceUrl: z
    .string()
    .min(1, "Source URL is required to publish")
    .refine((v) => z.url().safeParse(v).success, {
      message: "Must be a valid URL",
    }),
  description: z.string().min(1, "A note is required to publish"),
});

export const publishCollectionFormSchema = collectionFormSchema.extend({
  items: z.array(publishItemFormSchema).min(1, "Add at least one item"),
});

export type UserInsert = z.infer<typeof userInsertSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type CreatorInsert = z.infer<typeof creatorInsertSchema>;
export type CreatorUpdate = z.infer<typeof creatorUpdateSchema>;
export type CollectionInsert = z.infer<typeof collectionInsertSchema>;
export type CollectionUpdate = z.infer<typeof collectionUpdateSchema>;
export type ItemInsert = z.infer<typeof itemInsertSchema>;
export type ItemUpdate = z.infer<typeof itemUpdateSchema>;
export type FollowInsert = z.infer<typeof followInsertSchema>;
export type CommentInsert = z.infer<typeof commentInsertSchema>;
export type CommentUpdate = z.infer<typeof commentUpdateSchema>;
export type ItemFormValues = z.infer<typeof itemFormSchema>;
export type NewCollectionFormValues = z.infer<typeof newCollectionFormSchema>;

export function toCollectionInsert(v: {
  title: string;
  description: string;
  tags: string[];
  coverImageUrl: string;
}) {
  return {
    title: v.title,
    description: v.description || undefined,
    tags: v.tags,
    coverImageUrl: v.coverImageUrl || undefined,
  };
}

export function toItemInsert(v: ItemFormValues) {
  return {
    title: v.title,
    sourceUrl: v.sourceUrl || undefined,
    creatorName: v.creatorName || undefined,
    description: v.description || undefined,
    thumbnailUrl: v.thumbnailUrl || undefined,
  };
}
