import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SiteFooter, SiteNav } from "~/app/_components/site-nav";
import { getOptionalProfile } from "~/lib/require-auth";

import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = {
  title: "Sign in — Curio",
  description: "Sign in to Curio to create collections and follow curators.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/";
  const { session, profile } = await getOptionalProfile();

  if (session?.user && profile) {
    redirect(callbackUrl);
  }

  if (session?.user && !profile) {
    redirect(
      `/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteNav />
      <main className="animate-reveal mx-auto max-w-3xl px-6 py-20">
        <LoginForm callbackUrl={callbackUrl} />
      </main>
      <SiteFooter />
    </div>
  );
}
