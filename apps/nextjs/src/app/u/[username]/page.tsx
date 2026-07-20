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
    <div className="bg-background text-foreground min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl space-y-16 px-6 py-12">
        <section className="animate-reveal grid items-start gap-12 md:grid-cols-[1fr_2fr]">
          <div className="space-y-6">
            <div className="relative size-24">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName ?? profile.username}
                  width={96}
                  height={96}
                  className="outline-primary size-24 object-cover outline-1 outline-offset-4"
                />
              ) : (
                <div className="bg-paper border-border outline-primary size-24 border outline-1 outline-offset-4" />
              )}
            </div>
            <div>
              <div className="text-primary mb-2 font-mono text-[10px] tracking-widest uppercase">
                Curator
              </div>
              <h1 className="text-3xl font-semibold tracking-tighter">
                @{profile.username}
              </h1>
              <p className="text-muted-soft mt-1 text-sm">
                {profile.displayName ?? "Curio curator"}
              </p>
              {profile.bio ? (
                <p className="text-muted mt-4 leading-relaxed text-balance">
                  {profile.bio}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className="bg-foreground text-background hover:bg-primary w-full py-3 font-mono text-[11px] tracking-widest uppercase transition-colors"
            >
              + Follow
            </button>

            <dl className="border-border grid grid-cols-4 gap-2 border-t pt-4">
              <Stat label="Followers" value={profile.followerCount} />
              <Stat label="Following" value={profile.followingCount} />
              <Stat label="Collections" value={collections.length} />
              <Stat label="Items" value={totalItems} />
            </dl>

            <div className="space-y-3 pt-2">
              <h4 className="text-muted font-mono text-[10px] tracking-widest uppercase">
                Recent Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {[...new Set(collections.flatMap((c) => c.tags))]
                  .slice(0, 8)
                  .map((tag) => (
                    <Link
                      key={tag}
                      href={`/search?q=${encodeURIComponent(tag.replace(/^#/, ""))}`}
                      className="bg-paper border-border hover:border-primary hover:text-primary border px-2 py-1 font-mono text-[11px] transition-colors"
                    >
                      {tag}
                    </Link>
                  ))}
              </div>
            </div>
          </div>

          <div>
            <header className="mb-4 flex items-baseline justify-between">
              <h2 className="text-muted font-mono text-[10px] tracking-widest uppercase">
                Public Collections
              </h2>
            </header>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {collections.map((c, idx) => (
                <Link
                  key={c.id}
                  href={`/collection/${c.id}`}
                  className="bg-paper border-border group hover:border-primary relative flex aspect-square flex-col justify-between overflow-hidden border p-5 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-muted font-mono text-[10px]">
                      {String(idx + 1).padStart(3, "0")} /{" "}
                      {String(c.items.length).padStart(3, "0")} items
                    </span>
                    <span className="text-primary font-mono text-[10px] tracking-widest uppercase">
                      {c.tags[0] ?? "Collection"}
                    </span>
                  </div>
                  <div className="bg-secondary border-border -mx-5 aspect-[16/9] overflow-hidden border-y">
                    {c.coverImageUrl ? (
                      <img
                        src={c.coverImageUrl}
                        alt={c.title}
                        loading="lazy"
                        width={400}
                        height={225}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    ) : null}
                  </div>
                  <div>
                    <h4 className="leading-tight font-semibold">{c.title}</h4>
                    <div className="text-muted mt-2 flex items-center justify-between font-mono text-[10px] tracking-widest uppercase">
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
      <dt className="text-muted font-mono text-[10px] tracking-widest uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-xl">{value.toLocaleString()}</dd>
    </div>
  );
}
