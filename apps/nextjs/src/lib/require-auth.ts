import "server-only";

import { redirect } from "next/navigation";

import { db } from "@acme/db/client";

import { getSession } from "~/auth/server";

function loginUrl(callbackUrl: string) {
  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

function onboardingUrl(callbackUrl: string) {
  return `/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

export async function requireSession(callbackUrl = "/") {
  const session = await getSession();
  if (!session?.user) {
    redirect(loginUrl(callbackUrl));
  }
  return session;
}

export async function requireProfile(callbackUrl = "/") {
  const session = await requireSession(callbackUrl);
  const profile = await db.query.users.findFirst({
    where: { authUserId: session.user.id },
  });
  if (!profile) {
    redirect(onboardingUrl(callbackUrl));
  }
  return { session, profile };
}

export async function getOptionalProfile() {
  const session = await getSession();
  if (!session?.user) {
    return { session: null, profile: null };
  }

  const profile = await db.query.users.findFirst({
    where: { authUserId: session.user.id },
  });

  return { session, profile: profile ?? null };
}
