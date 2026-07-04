import type { db } from "@acme/db/client";

/**
 * The real drizzle db instance type (with RQBv2 relations attached).
 * Import this instead of hand-rolling `{ query: { ... } }` object types in
 * helper function signatures — those loose structural types are what was
 * causing TS to fall back to an `error`/`any` type and trip
 * `@typescript-eslint/no-unsafe-*` everywhere a query result touched them.
 */
export type DB = typeof db;

/** The `tx` param type inside `db.transaction(async (tx) => { ... })`. */
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
