"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@acme/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@acme/ui/dropdown-menu";

import { authClient } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

export function AuthNav() {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: session, isPending } = authClient.useSession();

  const profile = useQuery({
    ...trpc.user.me.queryOptions(),
    enabled: !!session?.user,
    retry: false,
  });

  const needsOnboarding =
    !!session?.user && profile.isSuccess && profile.data === null;

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  if (isPending) {
    return (
      <span
        aria-hidden
        className="bg-muted inline-block h-9 w-20 animate-pulse rounded-full"
      />
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="text-muted hover:text-foreground rounded-full px-4 py-2 text-[13px] font-medium transition-colors"
      >
        Sign in
      </Link>
    );
  }

  if (needsOnboarding) {
    return (
      <Link
        href="/onboarding"
        className="bg-foreground text-background hover:bg-foreground/85 rounded-full px-4 py-2 text-[13px] font-medium transition-colors"
      >
        Finish setup
      </Link>
    );
  }

  if (profile.isPending) {
    return (
      <span
        aria-hidden
        className="bg-muted inline-block h-9 w-24 animate-pulse rounded-full"
      />
    );
  }

  if (!profile.data) {
    return (
      <Link
        href="/onboarding"
        className="bg-foreground text-background hover:bg-foreground/85 rounded-full px-4 py-2 text-[13px] font-medium transition-colors"
      >
        Finish setup
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="text-muted hover:text-foreground hidden rounded-full px-4 py-2 text-[13px] font-medium sm:inline-flex"
        >
          @{profile.data.username}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/u/${profile.data.username}`}>View profile</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => void handleSignOut()}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
