/**
 * FR-4.3 — sourceUrlNormalized: strip tracking params and canonicalize a
 * handful of known platforms (YouTube, Spotify, Pixiv) so that two curators
 * pasting differently-decorated links to the same resource produce the same
 * normalized string. This is what FR-7.3's "In N collections" frequency
 * count matches against.
 *
 * This is intentionally simple (string rules, not a URL-canonicalization
 * library) — good enough for the MVP's three called-out platforms per the
 * PRD. Extend the platform map as new sources come up.
 */
const TRACKING_PARAM_PREFIXES = ["utm_", "fbclid", "gclid", "igshid", "si", "ref"];

export function normalizeSourceUrl(rawUrl: string): string {
  const url = new URL(rawUrl);

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM_PREFIXES.some((p) => key.toLowerCase().startsWith(p))) {
      url.searchParams.delete(key);
    }
  }
  url.hash = "";

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "").toLowerCase();
  const pathname = url.pathname.replace(/\/+$/, "");

  // YouTube — youtu.be/<id>, /watch?v=<id>, and /shorts/<id> all collapse
  // to the same canonical form.
  if (host === "youtu.be") {
    return `youtube.com/watch?v=${pathname.slice(1)}`;
  }
  if (host === "youtube.com") {
    const id = url.searchParams.get("v") ?? pathname.split("/shorts/")[1];
    if (id) return `youtube.com/watch?v=${id}`;
  }

  // Spotify — strip the /intl-xx/ locale prefix and query string.
  if (host === "open.spotify.com") {
    const cleanPath = pathname.replace(/^\/intl-[a-z]{2}\//, "/");
    return `open.spotify.com${cleanPath}`;
  }

  // Pixiv — collapse to /artworks/<id>, dropping any trailing segments.
  if (host === "pixiv.net") {
    const match = /\/artworks\/(\d+)/.exec(pathname);
    if (match) return `pixiv.net/artworks/${match[1]}`;
  }

  const query = url.searchParams.toString();
  return `${host}${pathname}${query ? `?${query}` : ""}`.toLowerCase();
}

/**
 * FR-4.4 / FR-8.2 — creator name normalization: lowercase, trim, strip a
 * common handle suffix. Used both to resolve/create the `creators` row on
 * item save, and to power the "did you mean @existing_creator?" suggestion.
 *
 * Note: this is exact-match-after-normalization, not fuzzy matching. FR-8.2
 * only requires the fuzzy *suggestion* to surface — if you want real
 * fuzzy matching (trigram/levenshtein), do it at the query layer with
 * pg_trgm rather than in application code.
 */
const CREATOR_SUFFIXES = ["_art", "_draws", "_music"];

export function normalizeCreatorName(rawName: string): string {
  let name = rawName.trim().toLowerCase();
  for (const suffix of CREATOR_SUFFIXES) {
    if (name.endsWith(suffix) && name.length > suffix.length) {
      name = name.slice(0, -suffix.length);
      break;
    }
  }
  return name;
}
