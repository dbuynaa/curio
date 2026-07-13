import { requireProfile } from "~/lib/require-auth";

export default async function FollowingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProfile("/following");
  return children;
}
