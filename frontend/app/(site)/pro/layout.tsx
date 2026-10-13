import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/core/auth";
import { getActiveMembership, resolveAccountKind } from "@/core/auth/authorization";
import { ProCabinetLayout } from "@/widgets/pro-dashboard/ui/ProCabinetLayout";

export const metadata: Metadata = {
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
    (pathname === "/pro" || pathname.startsWith("/pro/"))
  ) {
    redirect("/providers/new");
  }

  return <ProCabinetLayout>{children}</ProCabinetLayout>;
}
