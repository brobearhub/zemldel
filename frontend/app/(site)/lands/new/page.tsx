import { getServerAuthSession } from "@/core/auth";
import { signInRedirectFromRequest } from "@/core/auth/sign-in-redirect";
import { LandEditor } from "@/widgets/lands/LandEditor";

export const metadata = {
  title: "Разместить объявление об участке",
  robots: { index: false },
};

export default async function NewLandPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return signInRedirectFromRequest("/lands/new");

  const { kind } = await searchParams;
  return (
    <LandEditor initialKind={kind === "SELECTION" ? "SELECTION" : "SALE"} />
  );
}
