import "server-only";

import { redirect } from "next/navigation";

import { getProfileByAuthUserId } from "@acme/api";

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
  const profile = await getProfileByAuthUserId(session.user.id);
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

  const profile = await getProfileByAuthUserId(session.user.id);

  return { session, profile: profile ?? null };
}
