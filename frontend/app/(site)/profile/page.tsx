import ProfilePageContent from "@/widgets/profile/ui/ProfilePageContent";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/core/auth";
import { resolveAccountKind } from "@/core/auth/authorization";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerAuthSession();
  if (session?.user && resolveAccountKind(session.user) === "PROVIDER") {
    const params = await searchParams;
    const target =
      params.section === "profile"
        ? "/pro/settings/account"
        : "/pro/requests/feed";
    const forwarded = new URLSearchParams();
    for (const key of ["notice", "welcome"]) {
      const value = params[key];
      if (typeof value === "string") forwarded.set(key, value);
    }
    redirect(`${target}${forwarded.size ? `?${forwarded}` : ""}`);
  }
  return <ProfilePageContent />;
}
