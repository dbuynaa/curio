import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";

import { relations } from "./relations";

export const db = drizzle({
  client: sql,
  relations,
});
