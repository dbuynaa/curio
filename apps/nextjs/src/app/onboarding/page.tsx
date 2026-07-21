import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SiteFooter, SiteNav } from "~/app/_components/site-nav";
import { getOptionalProfile } from "~/lib/require-auth";
import { OnboardingForm } from "./_components/onboarding-form";

export const metadata: Metadata = {
  title: "Finish setup — Curio",
  description: "Choose a username and complete your Curio profile.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/";
  const { session, profile } = await getOptionalProfile();

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/onboarding")}`);
  }

  if (profile) {
    redirect(callbackUrl);
  }

  return (
    <main className="animate-reveal mx-auto max-w-3xl px-6 py-20">
      <header className="border-foreground mb-10 border-b pb-6">
        <div className="text-primary mb-3 font-mono text-[10px] tracking-widest uppercase">
          Profile / Onboarding
        </div>
        <h1 className="text-4xl font-semibold tracking-tighter">
          Claim your handle
        </h1>
        <p className="text-muted mt-3 text-sm">
          One last step before you can create collections and appear on Curio.
        </p>
      </header>
      <OnboardingForm callbackUrl={callbackUrl} />
    </main>
  );
}
