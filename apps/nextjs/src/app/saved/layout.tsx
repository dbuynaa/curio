import { requireProfile } from "~/lib/require-auth";

export default async function SavedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProfile("/saved");
  return children;
}
