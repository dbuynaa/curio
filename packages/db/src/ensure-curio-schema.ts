import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { sql } from "./client";

const AUTH_TABLES = new Set(["account", "session", "user", "verification"]);

const CURIO_TABLES = [
  "comment_likes",
  "notifications",
  "reports",
  "reposts",
  "comments",
  "item_likes",
  "collection_likes",
  "saves",
  "follows",
  "items",
  "collections",
  "creators",
  "users",
];

function migrationStatements() {
  const migrationPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "../drizzle/0000_sync_curio_schema.sql",
  );
  const raw = readFileSync(migrationPath, "utf8");

  return raw
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .filter((statement) => {
      for (const table of AUTH_TABLES) {
        if (
          statement.includes(`"${table}"`) &&
          (statement.startsWith('CREATE TABLE "') ||
            statement.includes(`REFERENCES "public"."${table}"`))
        ) {
          return false;
        }
      }
      return true;
    });
}

export async function isCurioSchemaCurrent() {
  const result = await sql.sql`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'auth_user_id'
    LIMIT 1
  `;
  return result.rows.length > 0;
}

export async function resetCurioSchema() {
  console.log("Resetting Curio application tables to match current schema…");

  for (const table of CURIO_TABLES) {
    await sql.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
  }

  await sql.query(`DROP TYPE IF EXISTS "content_type" CASCADE`);
  await sql.query(`DROP TYPE IF EXISTS "visibility" CASCADE`);

  for (const statement of migrationStatements()) {
    await sql.query(statement);
  }

  console.log("Curio schema reset complete.");
}

export async function ensureCurioSchema() {
  if (await isCurioSchemaCurrent()) return;
  await resetCurioSchema();
}
