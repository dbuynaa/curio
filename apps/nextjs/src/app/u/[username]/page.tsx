import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter, SiteNav } from "~/app/_components/site-nav";
import {
  curators,
  getCollectionsByCurator,
  getCurator,
  type Collection,
} from "~/lib/mock-data";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  if (!(username in curators)) return { title: "Profile — Curio" };

  const curator = getCurator(username);
  return {
    title: `@${curator.username} — Curio`,
    description: curator.bio,
    openGraph: {
      title: `@${curator.username} — Curio`,
      description: curator.bio,
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  if (!(username in curators)) notFound();

  const curator = getCurator(username);
  const collections = getCollectionsByCurator(username);
  const totalItems = collections.reduce(
    (n: number, c: Collection) => n + c.items.length,
    0,
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        <section className="animate-reveal grid md:grid-cols-[1fr_2fr] gap-12 items-start">
          <div className="space-y-6">
            <div className="relative size-24">
              <img
                src={curator.avatar}
                alt={curator.displayName}
                width={96}
                height={96}
                className="size-24 object-cover outline-1 outline-offset-4 outline-primary"
              />
            </div>
            <div>
              <div className="font-mono text-[10px] text-primary uppercase tracking-widest mb-2">
                Curator // {curator.location}
              </div>
              <h1 className="text-3xl font-semibold tracking-tighter">
                @{curator.username}
              </h1>
              <p className="text-sm text-muted-soft mt-1">
                {curator.displayName}
              </p>
              <p className="text-muted mt-4 text-balance leading-relaxed">
                {curator.bio}
              </p>
            </div>

            <button
              type="button"
              className="w-full bg-foreground text-background font-mono text-[11px] uppercase tracking-widest py-3 hover:bg-primary transition-colors"
            >
              + Follow
            </button>

            <dl className="grid grid-cols-4 gap-2 pt-4 border-t border-border">
              <Stat label="Followers" value={curator.followers} />
              <Stat label="Following" value={curator.following} />
              <Stat label="Collections" value={collections.length} />
              <Stat label="Items" value={totalItems} />
            </dl>

            <div className="pt-2 space-y-3">
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Taste Signature
              </h4>
              <div className="flex flex-wrap gap-2">
                {curator.taste.map((tag: string) => (
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
              {collections.map((c: Collection, idx: number) => (
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
                      {c.category}
                    </span>
                  </div>
                  <div className="aspect-[16/9] -mx-5 overflow-hidden border-y border-border bg-stone-100">
                    <img
                      src={c.cover}
                      alt={c.name}
                      loading="lazy"
                      width={400}
                      height={225}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold leading-tight">{c.name}</h4>
                    <div className="flex items-center justify-between mt-2 font-mono text-[10px] text-muted uppercase tracking-widest">
                      <span>♡ {c.likes}</span>
                      <span>⌘ {c.saves}</span>
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
