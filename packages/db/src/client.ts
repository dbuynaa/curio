import {
  createClient,
  createPool,
  type VercelClient,
  type VercelPool,
} from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";

import * as schema from "./schema";

type PostgresClient = VercelPool | VercelClient;

function isPooledConnectionString(connectionString: string) {
  return connectionString.includes("-pooler.");
}

function isLocalhostConnectionString(connectionString: string) {
  try {
    const withHttpsProtocol = connectionString.replace(
      /^postgresql:\/\//,
      "https://",
    );
    return new URL(withHttpsProtocol).hostname === "localhost";
  } catch {
    return false;
  }
}

function withDirectClientConnect(client: VercelClient) {
  const connectPromise = client.connect();
  const originalQuery = client.query.bind(client);
  const originalSql = client.sql.bind(client);

  client.query = async (...args) => {
    await connectPromise;
    return originalQuery(...args);
  };
  client.sql = async (...args) => {
    await connectPromise;
    return originalSql(...args);
  };

  return client;
}

function createPostgresClient(): PostgresClient {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("Missing POSTGRES_URL");
  }

  if (
    isLocalhostConnectionString(connectionString) ||
    isPooledConnectionString(connectionString)
  ) {
    return createPool({ connectionString });
  }

  const directConnectionString =
    process.env.POSTGRES_URL_NON_POOLING ?? connectionString;
  return withDirectClientConnect(
    createClient({ connectionString: directConnectionString }),
  );
}

export const sql = createPostgresClient();

export const db = drizzle({
  client: sql,
  schema,
  casing: "snake_case",
});
