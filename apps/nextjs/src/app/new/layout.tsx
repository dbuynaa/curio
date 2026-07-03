import type { Metadata } from "next";

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

export default function NewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
