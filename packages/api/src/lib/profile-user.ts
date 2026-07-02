import { TRPCError } from "@trpc/server";

import { eq } from "@acme/db";
import { users } from "@acme/db/schema";

import type { createTRPCContext } from "../trpc";

type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

export async function getCurioUserByAuthId(
  ctx: TRPCContext,
  authUserId: string,
) {
  return ctx.db.query.users.findFirst({
    where: eq(users.authUserId, authUserId),
  });
}

export async function requireCurioUser(
  ctx: TRPCContext & {
    session: { user: { id: string; emailVerified?: boolean } };
  },
) {
  const profile = await getCurioUserByAuthId(ctx, ctx.session.user.id);
  if (!profile) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Complete onboarding to continue",
    });
  }
  return profile;
}

export async function optionalCurioUser(ctx: TRPCContext) {
  if (!ctx.session?.user) return null;
  return getCurioUserByAuthId(ctx, ctx.session.user.id);
}
