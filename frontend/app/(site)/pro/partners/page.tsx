import type { Metadata } from "next";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { PartnersPage } from "@/widgets/partners/PartnersPage";

export const metadata: Metadata = { title: "Партнёры — Земледел" };

export default async function Page() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) signInRedirect("/pro/partners");
  return <PartnersPage />;
}
