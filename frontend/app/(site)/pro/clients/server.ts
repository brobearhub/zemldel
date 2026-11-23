import "server-only";
import { notFound } from "next/navigation";
import { getServerAuthSession } from "@/core/auth";
import { getActiveMembership } from "@/core/auth/authorization";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import {
  BackendApiError,
  fetchBackendJsonAsUser,
} from "@/shared/api/backend/server";

export async function loadClientWorkspace<T>(path: string, returnTo: string) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) signInRedirect(returnTo);
  const membership = getActiveMembership(session.user);
  if (membership?.status !== "ACTIVE" || membership.role === "EMPLOYEE")
    notFound();
  try {
    return await fetchBackendJsonAsUser<T>(path, session.user.id, {
      cache: "no-store",
    });
  } catch (error) {
    if (
      error instanceof BackendApiError &&
      [401, 403, 404].includes(error.status)
    )
      notFound();
    throw error;
  }
}
