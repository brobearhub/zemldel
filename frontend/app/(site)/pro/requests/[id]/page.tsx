import { notFound } from "next/navigation";
import type { RequestProDto } from "@/entities/request";
import {
  BackendApiError,
  fetchBackendJsonAsUser,
} from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { ProRequestWorkspace } from "@/widgets/pro-requests/ui/ProRequestWorkspace";

type Props = {
  params: Promise<{ id: string }>;
};

function pickSubtitle(item: RequestProDto) {
  if (item.subjectType === "SERVICE")
    return item.serviceTitle ?? "Заявка по услуге";
  if (item.subjectType === "CATEGORY")
    return item.categoryName
      ? `Категория: ${item.categoryName}`
      : "Заявка по категории";
  return item.location ? `Локация: ${item.location}` : "Свободная заявка";
}

export default async function ProRequestDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    signInRedirect(`/pro/requests/${id}`);
  }

  if ((session.user.memberships?.length ?? 0) === 0) {
    notFound();
  }

  let req: RequestProDto;
  try {
    req = await fetchBackendJsonAsUser<RequestProDto>(
      `/pro/requests/${id}`,
      session.user.id,
    );
  } catch (error) {
    if (
      error instanceof BackendApiError &&
      (error.status === 401 || error.status === 403 || error.status === 404)
    ) {
      notFound();
    }
    throw error;
  }

  return (
    <ProRequestWorkspace initialRequest={req} subtitle={pickSubtitle(req)} />
  );
}
