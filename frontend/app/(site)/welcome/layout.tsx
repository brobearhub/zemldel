import type { ReactNode } from "react";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";

interface Props {
  readonly children: ReactNode;
}

export default async function WelcomeLayout({ children }: Props) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return signInRedirect("/welcome");
  }

  return <>{children}</>;
}
