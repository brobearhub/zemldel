import { notFound } from "next/navigation";
import type { ServiceDto } from "@/entities/service";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { ProServiceEditor } from "@/widgets/pro-services/ui/ProServiceEditor";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProServicesEditPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    signInRedirect(`/pro/services/${id}/edit`);
  }

  let service: ServiceDto;

  try {
    service = await fetchBackendJsonAsUser<ServiceDto>(`/pro/services/${id}`, session.user.id);
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  }

  return <ProServiceEditor mode="edit" initialService={service} />;
}
