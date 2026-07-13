"use client";

import { useState } from "react";

import { Button } from "@acme/ui/button";

import { authClient } from "~/auth/client";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [pending, setPending] = useState(false);

  async function handleGoogleSignIn() {
    setPending(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: callbackUrl,
    });
  }

  return (
    <div className="mx-auto max-w-md space-y-8">
      <header className="border-foreground border-b pb-6">
        <div className="text-primary mb-3 font-mono text-[10px] tracking-widest uppercase">
          Access / Sign in
        </div>
        <h1 className="text-4xl font-semibold tracking-tighter">
          Welcome back
        </h1>
        <p className="text-muted mt-3 text-sm">
          Sign in to create collections, follow curators, and save items to your
          workbench.
        </p>
      </header>

      <Button
        type="button"
        className="w-full rounded-full"
        disabled={pending}
        onClick={() => void handleGoogleSignIn()}
      >
        {pending ? "Redirecting…" : "Continue with Google"}
      </Button>
    </div>
  );
}
