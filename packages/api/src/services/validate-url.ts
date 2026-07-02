/**
 * FR-4.3 — verify a source URL resolves with a 2xx/3xx response at save time.
 * Uses HEAD first, falls back to GET when servers reject HEAD.
 */
export async function validateResolvableUrl(
  rawUrl: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const headers = {
    "User-Agent": "CurioBot/1.0 (+https://curio.app/bot)",
  };

  try {
    const head = await fetch(rawUrl, {
      method: "HEAD",
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (head.ok || (head.status >= 300 && head.status < 400)) {
      return { ok: true };
    }

    const get = await fetch(rawUrl, {
      method: "GET",
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (get.ok || (get.status >= 300 && get.status < 400)) {
      return { ok: true };
    }

    return {
      ok: false,
      message: `URL returned HTTP ${get.status}; enter a link that resolves successfully`,
    };
  } catch {
    return {
      ok: false,
      message: "URL could not be reached; check the link and try again",
    };
  }
}
