export interface Item {
  id: string;
  title: string;
  thumbnail: string;
  sourceUrl: string;
  type: string;
  source: string;
  creator?: string;
  note: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  category: string;
  cover: string;
  curatorUsername: string;
  tags: string[];
  items: Item[];
  likes: number;
  saves: number;
  updatedAt: string;
}

export interface Curator {
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  location: string;
  followers: number;
  following: number;
  taste: string[];
}

export interface ReferencedCreator {
  slug: string;
  name: string;
  items: { item: Item; collection: Collection }[];
}

export const curators: Record<string, Curator> = {
  julian_s: {
    username: "julian_s",
    displayName: "Julian Stern",
    avatar: "https://i.pravatar.cc/150?u=julian_s",
    bio: "Architectural historian. Collecting brutalist facades, concrete poetry, and the occasional jazz record.",
    location: "Berlin",
    followers: 2840,
    following: 312,
    taste: ["#brutalism", "#concrete", "#jazz", "#typography"],
  },
  mira_k: {
    username: "mira_k",
    displayName: "Mira Kowalski",
    avatar: "https://i.pravatar.cc/150?u=mira_k",
    bio: "Film programmer and essayist. Slow cinema, ambient soundtracks, and essays on attention.",
    location: "Warsaw",
    followers: 1920,
    following: 189,
    taste: ["#cinema", "#ambient", "#essays", "#photography"],
  },
  tom_h: {
    username: "tom_h",
    displayName: "Tom Huang",
    avatar: "https://i.pravatar.cc/150?u=tom_h",
    bio: "Product designer collecting objects that teach you how to look.",
    location: "San Francisco",
    followers: 4100,
    following: 445,
    taste: ["#design", "#dieter-rams", "#ceramics", "#tools"],
  },
};

const item = (
  id: string,
  title: string,
  creator: string,
  type: string,
  source: string,
  note: string,
  seed: number,
): Item => ({
  id,
  title,
  creator,
  type,
  source,
  note,
  thumbnail: `https://picsum.photos/seed/${seed}/800/800`,
  sourceUrl: `https://example.com/${id}`,
});

export const collections: Collection[] = [
  {
    id: "brutalist-reading",
    name: "Late-night Brutalist Reading",
    description:
      "A shelf of concrete, shadow, and the kind of architecture that refuses to be polite.",
    category: "Architecture",
    cover: "https://picsum.photos/seed/brutalist/1200/900",
    curatorUsername: "julian_s",
    tags: ["#brutalism", "#concrete", "#archive"],
    likes: 428,
    saves: 156,
    updatedAt: "2026-03-01",
    items: [
      item(
        "b1",
        "Unité d'Habitation, Marseille",
        "Le Corbusier",
        "Image",
        "MoMA",
        "The balcony rhythm reads like a musical score cast in reinforced concrete.",
        101,
      ),
      item(
        "b2",
        "Trellick Tower at dusk",
        "Ernő Goldfinger",
        "Image",
        "RIBA",
        "Brutalism as urban theatre — the silhouette against a violet sky.",
        102,
      ),
      item(
        "b3",
        "Concrete Poetry Anthology",
        "Various",
        "Article",
        "Archive.org",
        "Words arranged as objects. Typography that behaves like architecture.",
        103,
      ),
    ],
  },
  {
    id: "dieter-rams-shelf",
    name: "Ten Principles, One Shelf",
    description:
      "Objects that obey Dieter Rams' commandments — and a few that argue back.",
    category: "Design",
    cover: "https://picsum.photos/seed/rams/1200/900",
    curatorUsername: "tom_h",
    tags: ["#dieter-rams", "#product", "#minimal"],
    likes: 892,
    saves: 341,
    updatedAt: "2026-02-28",
    items: [
      item(
        "d1",
        "Braun SK 4 Phonograph",
        "Dieter Rams",
        "Product",
        "V&A",
        "The 'Snow White's Coffin' — transparent lid as honest design.",
        201,
      ),
      item(
        "d2",
        "606 Universal Shelving",
        "Dieter Rams",
        "Product",
        "Vitsœ",
        "A system, not a product. Good design is as little design as possible.",
        202,
      ),
      item(
        "d3",
        "Less but Better",
        "Dieter Rams",
        "Article",
        "Gestalten",
        "The essay that became a design philosophy for a generation.",
        203,
      ),
    ],
  },
  {
    id: "slow-cinema-nights",
    name: "Slow Cinema Nights",
    description:
      "Films that ask you to sit still. Long takes, ambient sound, and the courage of patience.",
    category: "Film",
    cover: "https://picsum.photos/seed/cinema/1200/900",
    curatorUsername: "mira_k",
    tags: ["#cinema", "#slow-film", "#ambient"],
    likes: 567,
    saves: 203,
    updatedAt: "2026-02-25",
    items: [
      item(
        "c1",
        "Stalker (1979)",
        "Andrei Tarkovsky",
        "Video",
        "Criterion",
        "The Zone as metaphor for faith, desire, and the impossibility of arrival.",
        301,
      ),
      item(
        "c2",
        "In the Mood for Love",
        "Wong Kar-wai",
        "Video",
        "MUBI",
        "Restraint as the highest form of romance. Every frame a still life.",
        302,
      ),
      item(
        "c3",
        "Giovanni Pierluigi da Palestrina — Missa Papae Marcelli",
        "Palestrina",
        "Audio",
        "Spotify",
        "Polyphony that moves like light through stained glass.",
        303,
      ),
    ],
  },
  {
    id: "jazz-after-midnight",
    name: "Jazz After Midnight",
    description:
      "Blue notes, vinyl crackle, and the albums that sound best when the city goes quiet.",
    category: "Music",
    cover: "https://picsum.photos/seed/jazz/1200/900",
    curatorUsername: "julian_s",
    tags: ["#jazz", "#vinyl", "#night"],
    likes: 334,
    saves: 128,
    updatedAt: "2026-02-20",
    items: [
      item(
        "j1",
        "Kind of Blue",
        "Miles Davis",
        "Audio",
        "Blue Note",
        "Modal jazz as invitation — space for every listener to find their own line.",
        401,
      ),
      item(
        "j2",
        "A Love Supreme",
        "John Coltrane",
        "Audio",
        "Impulse!",
        "Spiritual urgency encoded in four movements and one tenor saxophone.",
        402,
      ),
    ],
  },
];

export function getCurator(username: string): Curator {
  const curator = curators[username];
  if (!curator) throw new Error(`Curator not found: ${username}`);
  return curator;
}

export function getCollection(id: string): Collection | undefined {
  return collections.find((c) => c.id === id);
}

export function getCollectionsByCurator(username: string): Collection[] {
  return collections.filter((c) => c.curatorUsername === username);
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getReferencedCreators(): ReferencedCreator[] {
  const byCreator = new Map<string, ReferencedCreator>();

  for (const collection of collections) {
    for (const item of collection.items) {
      if (!item.creator) continue;
      const slug = slugify(item.creator);
      const existing = byCreator.get(slug) ?? {
        slug,
        name: item.creator,
        items: [],
      };
      existing.items.push({ item, collection });
      byCreator.set(slug, existing);
    }
  }

  return [...byCreator.values()].sort((a, b) => b.items.length - a.items.length);
}

export function getCreatorBySlug(slug: string): ReferencedCreator | undefined {
  return getReferencedCreators().find((c) => c.slug === slug);
}

export function searchAll(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { collections: [], curators: [], creators: [] };
  }

  const matchedCollections = collections.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q)),
  );

  const matchedCurators = Object.values(curators).filter(
    (c) =>
      c.username.toLowerCase().includes(q) ||
      c.displayName.toLowerCase().includes(q) ||
      c.bio.toLowerCase().includes(q) ||
      c.taste.some((t) => t.toLowerCase().includes(q)),
  );

  const matchedCreators = getReferencedCreators().filter(
    (c) =>
      c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
  );

  return {
    collections: matchedCollections,
    curators: matchedCurators,
    creators: matchedCreators,
  };
}

export { slugify };
