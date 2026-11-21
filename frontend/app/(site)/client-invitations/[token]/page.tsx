import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClientInvitation } from "@/features/client-invitation/ClientInvitation";

export const metadata: Metadata = {
  title: "Приглашение от исполнителя — Земледел",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[\w-]{43}$/.test(token)) notFound();
  return <ClientInvitation path={`/client-invitations/${token}`} />;
}
