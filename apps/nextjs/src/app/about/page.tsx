import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter, SiteNav } from "~/app/_components/site-nav";

export const metadata: Metadata = {
  title: "Manifesto — Curio",
  description:
    "Curio is a curation layer for the internet. Every saved item links back to its source. Credit is the contract.",
  openGraph: {
    title: "Manifesto — Curio",
    description:
      "A social platform for building public collections around your taste — with every item linked back to its source.",
  },
};

const principles = [
  {
    n: "01",
    title: "Credit is the contract",
    body: "Every item in a Curio collection links back to its creator and its source. Without that link, it isn't a citation — it's a copy.",
  },
  {
    n: "02",
    title: "Taste is a long sentence",
    body: "A collection is not a feed. It is an argument made out of objects. We build tools for the patient arrangement of things.",
  },
  {
    n: "03",
    title: "Discovery through people",
    body: "We don't believe in algorithmic mush. You find the next thing because a person with strong taste already loved it.",
  },
  {
    n: "04",
    title: "The graph is the work",
    body: "Tags, creators, collections, curators — they cross-reference. The interesting object is rarely the post. It's the connections.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="max-w-3xl mx-auto px-6 py-20 animate-reveal">
        <div className="font-mono text-[10px] text-primary uppercase tracking-widest mb-6">
          Manifesto / v1.0 / 2026
        </div>
        <h1 className="text-5xl font-semibold tracking-tighter mb-10 text-balance">
          A curation layer for the internet.
        </h1>
        <p className="font-serif text-2xl italic leading-relaxed text-foreground mb-16">
          &ldquo;The library is not a collection of books. It is a collection of
          decisions about which books to keep next to one another.&rdquo;
        </p>

        <div className="space-y-12 border-t border-border pt-12">
          {principles.map((p) => (
            <article
              key={p.n}
              className="grid grid-cols-[3rem_1fr] gap-8 items-baseline"
            >
              <span className="font-mono text-[10px] text-primary uppercase tracking-widest">
                {p.n}
              </span>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight mb-3">
                  {p.title}
                </h3>
                <p className="text-muted leading-relaxed">{p.body}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-20 pt-10 border-t border-foreground flex items-baseline justify-between">
          <span className="font-mono text-[10px] text-muted uppercase tracking-widest">
            Start a collection
          </span>
          <Link
            href="/new"
            className="font-mono text-[11px] text-primary uppercase tracking-widest hover:underline"
          >
            Open the composer →
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
