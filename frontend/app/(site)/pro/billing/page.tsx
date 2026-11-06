import type { Metadata } from "next";
import { getServerAuthSession } from "@/core/auth";
import { getActiveMembership } from "@/core/auth/authorization";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { BillingDashboard } from "@/widgets/billing/BillingDashboard";

export const metadata: Metadata = { title: "Тариф и оплата — Земледел" };
export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; product?: string }>;
}) {
  const query = await searchParams;
  const session = await getServerAuthSession();
  const returnQuery = new URLSearchParams();
  if (query.order) returnQuery.set("order", query.order);
  if (query.product) returnQuery.set("product", query.product);
  if (!session?.user?.id)
    signInRedirect(`/pro/billing${returnQuery.size ? `?${returnQuery}` : ""}`);
  const member = getActiveMembership(session?.user ?? null);
  if (!member)
    return <p>Выберите профиль исполнителя, чтобы управлять тарифом.</p>;
  return (
    <BillingDashboard
      key={member.providerId}
      providerId={member.providerId}
      providerName={member.providerName}
      returnOrder={query.order}
      initialProduct={query.product}
    />
  );
}
