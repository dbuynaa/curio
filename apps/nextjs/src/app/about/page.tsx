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
    <main className="animate-reveal mx-auto max-w-3xl px-6 py-20">
      <div className="text-primary mb-6 font-mono text-[10px] tracking-widest uppercase">
        Manifesto / v1.0 / 2026
      </div>
      <h1 className="mb-10 text-5xl font-semibold tracking-tighter text-balance">
        A curation layer for the internet.
      </h1>
      <p className="text-foreground mb-16 font-serif text-2xl leading-relaxed italic">
        &ldquo;The library is not a collection of books. It is a collection of
        decisions about which books to keep next to one another.&rdquo;
      </p>

      <div className="border-border space-y-12 border-t pt-12">
        {principles.map((p) => (
          <article
            key={p.n}
            className="grid grid-cols-[3rem_1fr] items-baseline gap-8"
          >
            <span className="text-primary font-mono text-[10px] tracking-widest uppercase">
              {p.n}
            </span>
            <div>
              <h3 className="mb-3 text-2xl font-semibold tracking-tight">
                {p.title}
              </h3>
              <p className="text-muted leading-relaxed">{p.body}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="border-foreground mt-20 flex items-baseline justify-between border-t pt-10">
        <span className="text-muted font-mono text-[10px] tracking-widest uppercase">
          Start a collection
        </span>
        <Link
          href="/new"
          className="text-primary font-mono text-[11px] tracking-widest uppercase hover:underline"
        >
          Open the composer →
        </Link>
      </div>
    </main>
  );
}
