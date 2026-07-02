export interface OpenGraphMetadata {
  title?: string;
  imageUrl?: string;
  inferredContentType?: "image" | "video" | "audio" | "article" | "product" | "profile" | "link";
}

// FR-4.1 — fetches Open Graph metadata for a pasted source URL and infers
// a broad content type. Callers (see router/item.ts `fastAdd`) already
// handle failures by falling back to manual entry, so this can throw
// freely on network errors, non-200 responses, or missing tags.
//
// This is a minimal placeholder — swap in real oEmbed handling for
// YouTube/Spotify/Bandcamp/Vimeo/TikTok per PRD 20.3 before shipping.
export async function fetchOpenGraphMetadata(url: string): Promise<OpenGraphMetadata | null> {
  const response = await fetch(url, {
    headers: { "User-Agent": "CurioBot/1.0 (+https://curio.app/bot)" },
  });

  if (!response.ok) return null;

  const html = await response.text();

  const title =
    matchMetaContent(html, "og:title") ?? matchMetaContent(html, "twitter:title") ?? undefined;
  const imageUrl =
    matchMetaContent(html, "og:image") ?? matchMetaContent(html, "twitter:image") ?? undefined;
  const ogType = matchMetaContent(html, "og:type");

  return {
    title,
    imageUrl,
    inferredContentType: inferContentType(url, ogType),
  };
}

function matchMetaContent(html: string, property: string): string | undefined {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  return pattern.exec(html)?.[1];
}

function inferContentType(
  url: string,
  ogType: string | undefined,
): OpenGraphMetadata["inferredContentType"] {
  const hostname = new URL(url).hostname;

  if (/youtube\.com|youtu\.be|vimeo\.com|tiktok\.com/.test(hostname)) return "video";
  if (/spotify\.com|bandcamp\.com|soundcloud\.com/.test(hostname)) return "audio";
  if (/pixiv\.net|deviantart\.com|artstation\.com/.test(hostname)) return "image";

  if (ogType === "video") return "video";
  if (ogType === "music" || ogType === "song") return "audio";
  if (ogType === "article") return "article";
  if (ogType === "product") return "product";
  if (ogType === "profile") return "profile";

  return "link";
}
