import { Suspense } from "react";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { MyLandListings } from "@/widgets/lands/MyLandListings";
export const metadata = {
  title: "Мои объявления об участках",
  robots: { index: false },
};
export default async function MyLandsPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) signInRedirect("/lands/mine");
  return (
    <Suspense>
      <MyLandListings />
    </Suspense>
  );
}
