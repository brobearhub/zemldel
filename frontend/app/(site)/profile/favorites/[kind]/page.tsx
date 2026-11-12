import { notFound, redirect } from "next/navigation";
import { getServerAuthSession } from "@/core/auth";
import { FavoritesPage } from "@/widgets/favorites/FavoritesPage";
export default async function Page({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (kind !== "services" && kind !== "providers") notFound();
  const session = await getServerAuthSession();
  if (!session?.user?.id)
    redirect(
      `/signin?returnTo=${encodeURIComponent(`/profile/favorites/${kind}`)}`,
    );
  if (session.user.accountKind === "PROVIDER") redirect("/pro/interest");
  return (
    <FavoritesPage
      key={`${session.user.id}:${kind}`}
      kind={kind}
    />
  );
}
