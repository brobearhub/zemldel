import type { Metadata } from "next";
import { PartnerInvitation } from "@/widgets/partners/PartnerInvitation";
export const metadata: Metadata = {
  title: "Приглашение в партнёры — Земледел",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PartnerInvitation token={token} />;
}
