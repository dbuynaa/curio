import type { Metadata } from "next";

import { requireProfile } from "~/lib/require-auth";

export const metadata: Metadata = {
  title: "New Collection — Curio",
  description:
    "Begin a new collection. Add a title, a description, and as many items as you like — each with credit.",
  openGraph: {
    title: "New Collection — Curio",
    description:
      "Begin a new collection. Add a title, a description, and as many items as you like — each with credit.",
  },
};

export default async function NewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProfile("/collection/new");
  return children;
}
