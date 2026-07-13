import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { SiteFooter, SiteNav } from "~/app/_components/site-nav";
import { getQueryClient, trpc } from "~/trpc/server";

interface PageProps {
  params: Promise<{ username: string }>;
}

async function getProfileOrNull(username: string) {
  try {
    return await getQueryClient().fetchQuery(
      trpc.user.byUsername.queryOptions({ username }),
    );
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const result = await getProfileOrNull(username);
  if (!result) return { title: "Profile — Curio" };

  const { profile } = result;
  return {
    title: `@${profile.username} — Curio`,
    description: profile.bio ?? undefined,
    openGraph: {
      title: `@${profile.username} — Curio`,
      description: profile.bio ?? undefined,
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  const result = await getProfileOrNull(username);
  if (!result) notFound();

  const { profile, collections } = result;
  const totalItems = collections.reduce((n, c) => n + c.items.length, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        <section className="animate-reveal grid md:grid-cols-[1fr_2fr] gap-12 items-start">
          <div className="space-y-6">
            <div className="relative size-24">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName ?? profile.username}
                  width={96}
                  height={96}
                  className="size-24 object-cover outline-1 outline-offset-4 outline-primary"
                />
              ) : (
                <div className="bg-paper border-border size-24 border outline-1 outline-offset-4 outline-primary" />
              )}
            </div>
            <div>
              <div className="font-mono text-[10px] text-primary uppercase tracking-widest mb-2">
                Curator
              </div>
              <h1 className="text-3xl font-semibold tracking-tighter">
                @{profile.username}
              </h1>
              <p className="text-sm text-muted-soft mt-1">
                {profile.displayName ?? "Curio curator"}
              </p>
              {profile.bio ? (
                <p className="text-muted mt-4 text-balance leading-relaxed">
                  {profile.bio}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className="w-full bg-foreground text-background font-mono text-[11px] uppercase tracking-widest py-3 hover:bg-primary transition-colors"
            >
              + Follow
            </button>

            <dl className="grid grid-cols-4 gap-2 pt-4 border-t border-border">
              <Stat label="Followers" value={profile.followerCount} />
              <Stat label="Following" value={profile.followingCount} />
              <Stat label="Collections" value={collections.length} />
              <Stat label="Items" value={totalItems} />
            </dl>

            <div className="pt-2 space-y-3">
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Recent Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {[...new Set(collections.flatMap((c) => c.tags))]
                  .slice(0, 8)
                  .map((tag) => (
                  <Link
                    key={tag}
                    href={`/search?q=${encodeURIComponent(tag.replace(/^#/, ""))}`}
                    className="px-2 py-1 bg-paper border border-border text-[11px] font-mono hover:border-primary hover:text-primary transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div>
            <header className="flex items-baseline justify-between mb-4">
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Public Collections
              </h2>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {collections.map((c, idx) => (
                <Link
                  key={c.id}
                  href={`/collection/${c.id}`}
                  className="aspect-square bg-paper border border-border p-5 flex flex-col justify-between group hover:border-primary transition-colors relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-[10px] text-muted">
                      {String(idx + 1).padStart(3, "0")} /{" "}
                      {String(c.items.length).padStart(3, "0")} items
                    </span>
                    <span className="font-mono text-[10px] text-primary uppercase tracking-widest">
                      {c.tags[0] ?? "Collection"}
                    </span>
                  </div>
                  <div className="aspect-[16/9] -mx-5 overflow-hidden border-y border-border bg-stone-100">
                    {c.coverImageUrl ? (
                      <img
                        src={c.coverImageUrl}
                        alt={c.title}
                        loading="lazy"
                        width={400}
                        height={225}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    ) : null}
                  </div>
                  <div>
                    <h4 className="font-semibold leading-tight">{c.title}</h4>
                    <div className="flex items-center justify-between mt-2 font-mono text-[10px] text-muted uppercase tracking-widest">
                      <span>♡ {c.likeCount}</span>
                      <span>⌘ {c.saveCount}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </dt>
      <dd className="font-mono text-xl mt-1">{value.toLocaleString()}</dd>
    </div>
  );
}
