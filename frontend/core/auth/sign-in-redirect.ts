import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { buildSignInHref, isSafeReturnToPath } from "./session-recovery";

export function signInRedirect(returnTo: string): never {
  redirect(buildSignInHref(returnTo));
}

/** Для layout, который не знает дочерний путь: его проставляет middleware в x-pathname. */
export async function signInRedirectFromRequest(fallback: string): Promise<never> {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";
  const search = headerStore.get("x-search") ?? "";
  const candidate = pathname ? `${pathname}${search}` : fallback;
  signInRedirect(isSafeReturnToPath(candidate) ? candidate : fallback);
}
