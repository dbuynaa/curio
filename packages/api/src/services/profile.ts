import { db } from "@acme/db/client";
import type { users } from "@acme/db/schema";

type Profile = typeof users.$inferSelect;

export async function getProfileByAuthUserId(
  authUserId: string,
): Promise<Profile | undefined> {
  return db.query.users.findFirst({
    where: { authUserId },
  });
}
