import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/core/auth";
import { resolveAccountKind } from "@/core/auth/authorization";
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

  return <ProCabinetLayout>{children}</ProCabinetLayout>;
}
