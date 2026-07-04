import { creators } from "@acme/db/schema";

import type { DB } from "./db-types";

const KNOWN_SUFFIXES = ["_art", "_draws", "_music"];

// Section 20.4 / FR-4.4 — lowercase, trim, strip common suffixes
export function normalizeCreatorName(raw: string): string {
  let name = raw.trim().toLowerCase();
  for (const suffix of KNOWN_SUFFIXES) {
    if (name.endsWith(suffix) && name.length > suffix.length) {
      name = name.slice(0, -suffix.length);
      break;
    }
  }
  return name.trim();
}

/**
 * FR-4.4 — resolves an existing creator by normalized name, or creates one.
 * Uses onConflictDoNothing + a re-fetch to stay correct under concurrent
 * inserts of the same normalized name (creators.normalizedName is unique).
 *
 * NOTE on drizzle-orm@1.0.0-rc.4 (RQBv2): `db.query.*` filters are plain
 * object filters (`{ normalizedName }`), not the old
 * `(table, operators) => operators.eq(...)` callback style.
 */
export async function resolveCreator(
  db: DB,
  {
    creatorName,
    creatorUrl,
  }: { creatorName: string; creatorUrl?: string | null },
) {
  const normalizedName = normalizeCreatorName(creatorName);

  const existing = await db.query.creators.findFirst({
    where: { normalizedName },
  });
  if (existing) return existing;

  const [created] = await db
    .insert(creators)
    .values({
      normalizedName,
      displayName: creatorName.trim(),
      canonicalUrl: creatorUrl ?? null,
    })
    .onConflictDoNothing({ target: creators.normalizedName })
    .returning();

  if (created) return created;

  // Lost a race to a concurrent insert of the same normalized name.
  const winner = await db.query.creators.findFirst({
    where: { normalizedName },
  });
  if (!winner) throw new Error("Failed to resolve creator after conflict");
  return winner;
}
