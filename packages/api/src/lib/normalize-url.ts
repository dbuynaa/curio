const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "igshid",
  "si",
  "ref",
];

/**
 * FR-4.3 / Section 20.2 — canonicalizes known platforms and strips tracking
 * params so items pointing at "the same thing" produce the same
 * sourceUrlNormalized value for frequency-count matching.
 */
export function normalizeSourceUrl(rawUrl: string): string {
  const url = new URL(rawUrl);

  if (/(^|\.)youtube\.com$/.test(url.hostname) && url.pathname === "/watch") {
    const videoId = url.searchParams.get("v");
    if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
  }
  if (url.hostname === "youtu.be") {
    const videoId = url.pathname.slice(1);
    if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
  }
  if (/(^|\.)open\.spotify\.com$/.test(url.hostname)) {
    // Spotify URIs carry a locale segment sometimes (/intl-fr/track/...) —
    // collapse to the last two path segments (type/id).
    const parts = url.pathname.split("/").filter(Boolean);
    const tail = parts.slice(-2).join("/");
    return `https://open.spotify.com/${tail}`;
  }
  if (/(^|\.)pixiv\.net$/.test(url.hostname)) {
    const match = /\/artworks\/(\d+)/.exec(url.pathname);
    if (match) return `https://www.pixiv.net/artworks/${match[1]}`;
  }

  for (const param of TRACKING_PARAMS) url.searchParams.delete(param);
  url.hash = "";
  const path = url.pathname.replace(/\/$/, "") || "/";
  const query = url.searchParams.toString();
  return `${url.protocol}//${url.hostname}${path}${query ? `?${query}` : ""}`;
}
