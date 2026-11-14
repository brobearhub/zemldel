import type { Metadata } from "next";
import { TeamInvitation } from "@/widgets/provider-team/TeamInvitation";

export const metadata: Metadata = {
  title: "Приглашение в команду — Земледел",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function TeamInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TeamInvitation token={token} />;
}
