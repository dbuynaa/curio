import { count, inArray, like } from "drizzle-orm";



import { db } from "./client";
import { ensureCurioSchema } from "./ensure-curio-schema";
import { collectionLikes, collections, comments, creators, follows, itemLikes, items, users, saves } from "./schema";


const SEED_AUTH_PREFIX = "seed:";

const CREATOR_SUFFIXES = ["_art", "_draws", "_music"];

function normalizeCreatorName(rawName: string): string {
  let name = rawName.trim().toLowerCase();
  for (const suffix of CREATOR_SUFFIXES) {
    if (name.endsWith(suffix) && name.length > suffix.length) {
      name = name.slice(0, -suffix.length);
      break;
    }
  }
  return name;
}

function normalizeSourceUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  const trackingPrefixes = ["utm_", "fbclid", "gclid", "igshid", "si", "ref"];

  for (const key of [...url.searchParams.keys()]) {
    if (trackingPrefixes.some((p) => key.toLowerCase().startsWith(p))) {
      url.searchParams.delete(key);
    }
  }
  url.hash = "";

  const host = url.hostname
    .replace(/^www\./, "")
    .replace(/^m\./, "")
    .toLowerCase();
  const pathname = url.pathname.replace(/\/+$/, "");

  if (host === "youtu.be") {
    return `youtube.com/watch?v=${pathname.slice(1)}`;
  }
  if (host === "youtube.com") {
    const id = url.searchParams.get("v") ?? pathname.split("/shorts/")[1];
    if (id) return `youtube.com/watch?v=${id}`;
  }
  if (host === "open.spotify.com") {
    const cleanPath = pathname.replace(/^\/intl-[a-z]{2}\//, "/");
    return `open.spotify.com${cleanPath}`;
  }
  if (host === "pixiv.net") {
    const match = /\/artworks\/(\d+)/.exec(pathname);
    if (match) return `pixiv.net/artworks/${match[1]}`;
  }

  const query = url.searchParams.toString();
  return `${host}${pathname}${query ? `?${query}` : ""}`.toLowerCase();
}

const seedUserIds = {
  alice: "10000000-0000-4000-8000-000000000001",
  bob: "10000000-0000-4000-8000-000000000002",
  carol: "10000000-0000-4000-8000-000000000003",
  dev: "10000000-0000-4000-8000-000000000004",
} as const;

const seedCreatorIds = {
  loish: "20000000-0000-4000-8000-000000000001",
  kesh: "20000000-0000-4000-8000-000000000002",
  samgill: "20000000-0000-4000-8000-000000000003",
} as const;

const seedCollectionIds = {
  aliceArt: "30000000-0000-4000-8000-000000000001",
  aliceChars: "30000000-0000-4000-8000-000000000002",
  bobPlaylist: "30000000-0000-4000-8000-000000000003",
  carolReading: "30000000-0000-4000-8000-000000000004",
  devMature: "30000000-0000-4000-8000-000000000005",
} as const;

const seedItemIds = {
  loishStudy: "40000000-0000-4000-8000-000000000001",
  pixivRef: "40000000-0000-4000-8000-000000000002",
  loishTutorial: "40000000-0000-4000-8000-000000000003",
  sharedYoutube: "40000000-0000-4000-8000-000000000004",
  keshTrack: "40000000-0000-4000-8000-000000000005",
  samgillEssay: "40000000-0000-4000-8000-000000000006",
  duplicateYoutube: "40000000-0000-4000-8000-000000000007",
  matureItem: "40000000-0000-4000-8000-000000000008",
} as const;


const userProfiles = [
  {
    id: seedUserIds.alice,
    authUserId: `${SEED_AUTH_PREFIX}alice`,
    username: "alice_curates",
    displayName: "Alice Chen",
    bio: "Digital art curator. Collecting color, light, and character design.",
    avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=alice",
    searchIndexable: true,
    followerCount: 1,
    followingCount: 0,
    collectionCount: 2,
  },
  {
    id: seedUserIds.bob,
    authUserId: `${SEED_AUTH_PREFIX}bob`,
    username: "bob_beats",
    displayName: "Bob Rivera",
    bio: "Ambient and focus music for deep work sessions.",
    avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=bob",
    searchIndexable: true,
    followerCount: 1,
    followingCount: 0,
    collectionCount: 1,
  },
  {
    id: seedUserIds.carol,
    authUserId: `${SEED_AUTH_PREFIX}carol`,
    username: "carol_reads",
    displayName: "Carol Nguyen",
    bio: "Essays, long reads, and thoughtful links.",
    avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=carol",
    searchIndexable: true,
    followerCount: 0,
    followingCount: 2,
    collectionCount: 1,
  },
  {
    id: seedUserIds.dev,
    authUserId: `${SEED_AUTH_PREFIX}dev`,
    username: "dev_tester",
    displayName: "Dev Tester",
    bio: "Internal test account for mature content and unlisted collections.",
    avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=dev",
    isAdultConfirmed: true,
    searchIndexable: false,
    followerCount: 0,
    followingCount: 0,
    collectionCount: 1,
  },
];

const sharedYoutubeUrl =
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=seed";
const sharedYoutubeNormalized = normalizeSourceUrl(sharedYoutubeUrl);

const seedCreatorNormalizedNames = [
  normalizeCreatorName("Loish"),
  normalizeCreatorName("KESH"),
  normalizeCreatorName("samgill"),
];

async function isSeeded() {
  const [row] = await db
    .select({ total: count() })
    .from(users)
    .where(like(users.authUserId, `${SEED_AUTH_PREFIX}%`));
  return (row?.total ?? 0) > 0;
}

async function clearSeedData() {
  await db.delete(users).where(like(users.authUserId, `${SEED_AUTH_PREFIX}%`));
  await db
    .delete(creators)
    .where(inArray(creators.normalizedName, seedCreatorNormalizedNames));
}

async function countRows() {
  const [userCount] = await db.select({ total: count() }).from(users);
  const [creatorCount] = await db.select({ total: count() }).from(creators);
  const [collectionCount] = await db
    .select({ total: count() })
    .from(collections);
  const [itemCount] = await db.select({ total: count() }).from(items);
  const [followCount] = await db.select({ total: count() }).from(follows);
  const [collectionLikeCount] = await db
    .select({ total: count() })
    .from(collectionLikes);
  const [itemLikeCount] = await db.select({ total: count() }).from(itemLikes);
  const [saveCount] = await db.select({ total: count() }).from(saves);
  const [commentCount] = await db.select({ total: count() }).from(comments);

  return {
    users: userCount?.total ?? 0,
    creators: creatorCount?.total ?? 0,
    collections: collectionCount?.total ?? 0,
    items: itemCount?.total ?? 0,
    follows: followCount?.total ?? 0,
    collectionLikes: collectionLikeCount?.total ?? 0,
    itemLikes: itemLikeCount?.total ?? 0,
    saves: saveCount?.total ?? 0,
    comments: commentCount?.total ?? 0,
  };
}

async function seed() {
  await ensureCurioSchema();

  if (await isSeeded()) {
    console.log("SEED_FORCE=1 — clearing existing seed data…");
    await clearSeedData();
  }

  await db.transaction(async (tx) => {
    await tx.insert(users).values(userProfiles);

    await tx.insert(creators).values([
      {
        id: seedCreatorIds.loish,
        normalizedName: normalizeCreatorName("Loish"),
        displayName: "Loish",
        canonicalUrl: "https://www.loish.net/",
        citationCount: 3,
        collectionCount: 2,
      },
      {
        id: seedCreatorIds.kesh,
        normalizedName: normalizeCreatorName("KESH"),
        displayName: "KESH",
        canonicalUrl: "https://open.spotify.com/artist/4tZwfgr0cOlYZ07XCafojM",
        citationCount: 1,
        collectionCount: 1,
      },
      {
        id: seedCreatorIds.samgill,
        normalizedName: normalizeCreatorName("samgill"),
        displayName: "samgill",
        canonicalUrl: "https://samgill.work/",
        citationCount: 1,
        collectionCount: 1,
      },
    ]);

    await tx.insert(collections).values([
      {
        id: seedCollectionIds.aliceArt,
        userId: seedUserIds.alice,
        title: "Inspiring Digital Art",
        description:
          "A rolling board of painters and illustrators whose work I revisit often.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800",
        visibility: "public",
        isPublished: true,
        tags: ["art", "digital", "inspiration"],
        matureContent: false,
        likeCount: 2,
        saveCount: 1,
        commentCount: 2,
        viewCount: 128,
      },
      {
        id: seedCollectionIds.aliceChars,
        userId: seedUserIds.alice,
        title: "Character Design References",
        description:
          "Poses, silhouettes, and anatomy notes for personal projects.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1513364777864-2117a6783145?w=800",
        visibility: "public",
        isPublished: true,
        tags: ["character-design", "references"],
        matureContent: false,
        likeCount: 1,
        saveCount: 0,
        commentCount: 0,
        viewCount: 54,
      },
      {
        id: seedCollectionIds.bobPlaylist,
        userId: seedUserIds.bob,
        title: "Focus Work Playlist",
        description: "Instrumental tracks that stay out of the way.",
        coverImageUrl:
          "https://images.unsplash.com/photo-1511379938542-c1f69419868d?w=800",
        visibility: "public",
        isPublished: true,
        tags: ["music", "focus", "ambient"],
        matureContent: false,
        likeCount: 1,
        saveCount: 1,
        commentCount: 1,
        viewCount: 89,
      },
      {
        id: seedCollectionIds.carolReading,
        userId: seedUserIds.carol,
        title: "Reading List (Draft)",
        description: "Private working list — not ready to publish yet.",
        visibility: "private",
        isPublished: false,
        tags: ["reading", "essays"],
        matureContent: false,
        likeCount: 0,
        saveCount: 0,
        commentCount: 0,
        viewCount: 3,
      },
      {
        id: seedCollectionIds.devMature,
        userId: seedUserIds.dev,
        title: "Mature Content Sandbox",
        description: "Unlisted collection for age-gate and blur testing.",
        visibility: "unlisted",
        isPublished: true,
        tags: ["testing"],
        matureContent: true,
        likeCount: 0,
        saveCount: 0,
        commentCount: 0,
        viewCount: 7,
      },
    ]);

    await tx.insert(items).values([
      {
        id: seedItemIds.loishStudy,
        collectionId: seedCollectionIds.aliceArt,
        title: "Loish — Color and Light Study",
        sourceUrl: "https://www.loish.net/",
        sourceUrlNormalized: normalizeSourceUrl("https://www.loish.net/"),
        description:
          "Portfolio landing page with recent personal work and commission info.",
        contentType: "profile",
        creatorName: "Loish",
        creatorUrl: "https://www.loish.net/",
        creatorId: seedCreatorIds.loish,
        thumbnailUrl:
          "https://images.unsplash.com/photo-1513364777864-2117a6783145?w=400",
        tags: ["portfolio", "color"],
        position: 0,
        likeCount: 2,
        frequencyCount: 1,
        commentCount: 1,
      },
      {
        id: seedItemIds.pixivRef,
        collectionId: seedCollectionIds.aliceArt,
        title: "Pixiv Artwork Reference",
        sourceUrl: "https://www.pixiv.net/en/artworks/12345678",
        sourceUrlNormalized: normalizeSourceUrl(
          "https://www.pixiv.net/en/artworks/12345678",
        ),
        description:
          "Atmospheric environment piece with strong value grouping.",
        contentType: "image",
        creatorName: "loish_art",
        creatorUrl: "https://www.pixiv.net/users/loish",
        creatorId: seedCreatorIds.loish,
        thumbnailUrl:
          "https://images.unsplash.com/photo-1579783902614-a3fb3927b81a?w=400",
        tags: ["environment", "pixiv"],
        position: 1,
        likeCount: 1,
        frequencyCount: 1,
        commentCount: 0,
      },
      {
        id: seedItemIds.loishTutorial,
        collectionId: seedCollectionIds.aliceChars,
        title: "Character Silhouette Tips",
        sourceUrl: "https://www.loish.net/blog",
        sourceUrlNormalized: normalizeSourceUrl("https://www.loish.net/blog"),
        description: "Short notes on readable silhouettes and shape language.",
        contentType: "article",
        creatorName: "Loish",
        creatorUrl: "https://www.loish.net/",
        creatorId: seedCreatorIds.loish,
        tags: ["tutorial", "silhouette"],
        position: 0,
        likeCount: 0,
        frequencyCount: 1,
        commentCount: 0,
      },
      {
        id: seedItemIds.sharedYoutube,
        collectionId: seedCollectionIds.aliceArt,
        title: "Shared YouTube Reference",
        sourceUrl: sharedYoutubeUrl,
        sourceUrlNormalized: sharedYoutubeNormalized,
        description:
          "A widely-linked video used to exercise frequency_count matching.",
        contentType: "video",
        tags: ["video", "shared"],
        position: 2,
        likeCount: 1,
        frequencyCount: 2,
        commentCount: 1,
      },
      {
        id: seedItemIds.keshTrack,
        collectionId: seedCollectionIds.bobPlaylist,
        title: "KESH — liminal",
        sourceUrl:
          "https://open.spotify.com/intl-en/track/4cOdK2wGLETKBW3PvgPWqT",
        sourceUrlNormalized: normalizeSourceUrl(
          "https://open.spotify.com/intl-en/track/4cOdK2wGLETKBW3PvgPWqT",
        ),
        description: "Soft electronic track for late-night focus blocks.",
        contentType: "audio",
        creatorName: "KESH",
        creatorUrl: "https://open.spotify.com/artist/4tZwfgr0cOlYZ07XCafojM",
        creatorId: seedCreatorIds.kesh,
        thumbnailUrl:
          "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400",
        tags: ["electronic", "spotify"],
        position: 0,
        likeCount: 1,
        frequencyCount: 1,
        commentCount: 0,
      },
      {
        id: seedItemIds.samgillEssay,
        collectionId: seedCollectionIds.carolReading,
        title: "On Slow Internet",
        sourceUrl: "https://samgill.work/writing/slow-internet",
        sourceUrlNormalized: normalizeSourceUrl(
          "https://samgill.work/writing/slow-internet",
        ),
        description: "Essay on attention, latency, and reading on the web.",
        contentType: "article",
        creatorName: "samgill",
        creatorUrl: "https://samgill.work/",
        creatorId: seedCreatorIds.samgill,
        tags: ["essay", "internet"],
        position: 0,
        likeCount: 0,
        frequencyCount: 1,
        commentCount: 0,
      },
      {
        id: seedItemIds.duplicateYoutube,
        collectionId: seedCollectionIds.bobPlaylist,
        title: "Same Video, Different Collection",
        sourceUrl: "https://youtu.be/dQw4w9WgXcQ?si=seed",
        sourceUrlNormalized: sharedYoutubeNormalized,
        description:
          "Duplicate normalized URL — should share frequency_count with alice's item.",
        contentType: "video",
        tags: ["video", "duplicate"],
        position: 1,
        likeCount: 0,
        frequencyCount: 2,
        commentCount: 0,
      },
      {
        id: seedItemIds.matureItem,
        collectionId: seedCollectionIds.devMature,
        title: "Age-Gated Test Item",
        sourceUrl: "https://example.com/mature-content-test",
        sourceUrlNormalized: normalizeSourceUrl(
          "https://example.com/mature-content-test",
        ),
        description: "Placeholder link for mature-content UI testing.",
        contentType: "link",
        matureContent: true,
        tags: ["testing", "mature"],
        position: 0,
        likeCount: 0,
        frequencyCount: 1,
        commentCount: 0,
      },
    ]);

    await tx.insert(follows).values([
      {
        followerId: seedUserIds.carol,
        followingId: seedUserIds.alice,
      },
      {
        followerId: seedUserIds.carol,
        followingId: seedUserIds.bob,
      },
    ]);

    await tx.insert(collectionLikes).values([
      {
        userId: seedUserIds.carol,
        collectionId: seedCollectionIds.aliceArt,
      },
      {
        userId: seedUserIds.bob,
        collectionId: seedCollectionIds.aliceArt,
      },
      {
        userId: seedUserIds.alice,
        collectionId: seedCollectionIds.aliceChars,
      },
    ]);

    await tx.insert(itemLikes).values([
      {
        userId: seedUserIds.carol,
        itemId: seedItemIds.loishStudy,
      },
      {
        userId: seedUserIds.bob,
        itemId: seedItemIds.loishStudy,
      },
      {
        userId: seedUserIds.alice,
        itemId: seedItemIds.pixivRef,
      },
      {
        userId: seedUserIds.carol,
        itemId: seedItemIds.sharedYoutube,
      },
      {
        userId: seedUserIds.alice,
        itemId: seedItemIds.keshTrack,
      },
    ]);

    await tx.insert(saves).values([
      {
        userId: seedUserIds.carol,
        collectionId: seedCollectionIds.aliceArt,
      },
      {
        userId: seedUserIds.carol,
        collectionId: seedCollectionIds.bobPlaylist,
      },
    ]);

    const [collectionComment] = await tx
      .insert(comments)
      .values({
        userId: seedUserIds.carol,
        collectionId: seedCollectionIds.aliceArt,
        body: "Love this board — especially the Loish picks.",
      })
      .returning({ id: comments.id });

    await tx.insert(comments).values([
      {
        userId: seedUserIds.alice,
        collectionId: seedCollectionIds.aliceArt,
        parentCommentId: collectionComment?.id,
        body: "Thanks! I update it whenever I find a new color study.",
      },
      {
        userId: seedUserIds.bob,
        collectionId: seedCollectionIds.bobPlaylist,
        body: "Great mix for coding sessions.",
      },
      {
        userId: seedUserIds.carol,
        collectionId: seedCollectionIds.aliceArt,
        itemId: seedItemIds.sharedYoutube,
        body: "Curious how many other collections link this video.",
      },
    ]);
  });

  const rows = await countRows();
  console.log("Seed complete.");
  console.log("Row counts:", rows);
  console.log("\nSample accounts (auth_user_id for dev):");
  console.log(`  alice_curates  → ${SEED_AUTH_PREFIX}alice`);
  console.log(`  bob_beats      → ${SEED_AUTH_PREFIX}bob`);
  console.log(`  carol_reads    → ${SEED_AUTH_PREFIX}carol`);
  console.log(`  dev_tester     → ${SEED_AUTH_PREFIX}dev`);
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
