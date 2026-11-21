import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { LandEditScreen } from "@/widgets/lands/LandEditor";
export const metadata = {
  title: "Редактировать объявление",
  robots: { index: false },
};
export default async function EditLandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) signInRedirect(`/lands/${id}/edit`);
  return <LandEditScreen id={id} />;
}
