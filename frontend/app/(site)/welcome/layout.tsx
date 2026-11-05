import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

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
