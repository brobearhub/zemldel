import "server-only";

import { forbidden, notFound } from "next/navigation";
import { getServerAuthSession } from "@/core/auth";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";

export async function fetchAdminUsers<T>(path: string): Promise<T> {
  const session = await getServerAuthSession();
  if (!session?.user?.id || session.user.systemRole !== "PLATFORM_ADMIN") forbidden();
  try {
    return await fetchBackendJsonAsUser<T>(path, session.user.id);
  } catch (error) {
    if (error instanceof BackendApiError) {
      if (error.status === 401 || error.status === 403) forbidden();
      if (error.status === 404) notFound();
    }
    throw error;
  }
}
