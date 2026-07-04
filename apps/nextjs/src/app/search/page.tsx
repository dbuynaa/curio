import type { Metadata } from "next";

import { SearchPageClient } from "./search-client";

export const metadata: Metadata = {
  title: "Search — Curio",
  description: "Search collections, curators, and cited creators on Curio.",
  openGraph: {
    title: "Search — Curio",
    description: "Search collections, curators, and cited creators on Curio.",
  },
};

export default function SearchPage() {
  return <SearchPageClient />;
}
