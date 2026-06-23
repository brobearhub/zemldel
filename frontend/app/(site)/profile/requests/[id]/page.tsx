import { notFound, redirect } from "next/navigation";
import type { RequestCustomerDto } from "@/entities/request";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { CustomerRequestDetailClient } from "./CustomerRequestDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CustomerRequestDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  let req: RequestCustomerDto;
  try {
    req = await fetchBackendJsonAsUser<RequestCustomerDto>(`/requests/mine/${id}`, session.user.id);
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  }

  return (
    <main>
      <CustomerRequestDetailClient initialRequest={req} />
    </main>
  );
}

