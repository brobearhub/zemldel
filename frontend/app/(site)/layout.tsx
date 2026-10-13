import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Box } from "@mui/material";
import { getServerAuthSession } from "@/core/auth";
import { getActiveMembership, resolveAccountKind } from "@/core/auth/authorization";
import { providerWithoutProfileRedirect } from "@/core/auth/provider-onboarding-gate";
import { SiteChrome } from "./SiteChrome";

interface Props {
  readonly children: ReactNode;
}

export default async function SiteLayout({ children }: Props) {
  const session = await getServerAuthSession();
  const user = session?.user;
  const pathname = (await headers()).get("x-pathname") ?? "";
  const onboardingPath = providerWithoutProfileRedirect({
    accountKind: user ? resolveAccountKind(user) : null,
    systemRole: user?.systemRole,
    hasMembership: Boolean(user && getActiveMembership(user)),
    pathname,
  });
  if (onboardingPath) redirect(onboardingPath);

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <SiteChrome>{children}</SiteChrome>
    </Box>
  );
}
