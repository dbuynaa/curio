import type { z } from "zod";

import type { contentTypeSchema } from "@acme/validators";

type ContentType = z.infer<typeof contentTypeSchema>;

export interface OgMetadata {
  title: string;
  thumbnailUrl: string | null;
  contentType: ContentType;
}

function metaContent(html: string, property: string) {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function inferContentType(url: URL, ogType: string | null): ContentType {
  const host = url.hostname.replace(/^www\./, "");

  if (/(^|\.)youtube\.com$|^youtu\.be$|^vimeo\.com$|^tiktok\.com$/.test(host)) {
    return "video";
  }
  if (/(^|\.)open\.spotify\.com$|^soundcloud\.com$/.test(host)) {
    return "audio";
  }
  if (/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(url.pathname)) {
    return "image";
  }
  if (/(^|\.)twitter\.com$|(^|\.)x\.com$|(^|\.)instagram\.com$/.test(host)) {
    return "profile";
  }
  if (/(^|\.)amazon\.|(^|\.)shopify\.com$|(^|\.)etsy\.com$/.test(host)) {
    return "product";
  }

  const normalized = ogType?.toLowerCase() ?? "";
  if (normalized.includes("video")) return "video";
  if (normalized.includes("music") || normalized.includes("audio")) {
    return "audio";
  }
  if (normalized.includes("article")) return "article";
  if (normalized.includes("product")) return "product";
  if (normalized.includes("profile")) return "profile";
  if (normalized.includes("image")) return "image";

  return "link";
}

/**
 * FR-4.1 — fetches Open Graph metadata for the fast-add flow. Returns null on
 * any fetch/parse failure so the client can fall back to manual entry.
 */
export async function fetchOgMetadata(rawUrl: string): Promise<OgMetadata | null> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "CurioBot/1.0 (+https://curio.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();
    const ogTitle =
      metaContent(html, "og:title") ??
      metaContent(html, "twitter:title") ??
      /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]?.trim() ??
      parsed.hostname;

    const ogImage =
      metaContent(html, "og:image") ?? metaContent(html, "twitter:image");
    const ogType = metaContent(html, "og:type");

    return {
      title: ogTitle.slice(0, 200),
      thumbnailUrl: ogImage,
      contentType: inferContentType(parsed, ogType),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
