import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/core/auth";
import { getActiveMembership, resolveAccountKind } from "@/core/auth/authorization";
import { ProCabinetLayout } from "@/widgets/pro-dashboard/ui/ProCabinetLayout";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Кабинет исполнителя — Земледел",
};

interface Props {
  readonly children: ReactNode;
}

export default async function ProLayout({ children }: Props) {
  const session = await getServerAuthSession();
  const user = session?.user;

  if (user && user.systemRole !== "PLATFORM_ADMIN" && resolveAccountKind(user) !== "PROVIDER") {
    redirect("/profile?notice=providers-only");
  }

  const pathname = (await headers()).get("x-pathname") ?? "";
  if (
    user &&
    user.systemRole !== "PLATFORM_ADMIN" &&
    resolveAccountKind(user) === "PROVIDER" &&
    !getActiveMembership(user) &&
    (pathname.startsWith("/pro/"))
  ) {
    redirect("/providers/new");
  }

  const activeMembership = getActiveMembership(user ?? null);
  if (activeMembership?.role === "EMPLOYEE" && pathname && !/^\/pro\/(?:assigned(?:\/|$)|settings\/(?:account|messengers)(?:\/|$))/.test(pathname)) {
    const requestMatch = pathname.match(/^\/pro\/requests\/([0-9a-f-]{36})$/i);
    redirect(requestMatch ? `/pro/assigned/${requestMatch[1]}` : "/pro/assigned");
  }
  const providerName = activeMembership?.providerName;

  return (
    <ProCabinetLayout providerName={providerName ?? "Кабинет исполнителя"}>
      {children}
    </ProCabinetLayout>
  );
}
