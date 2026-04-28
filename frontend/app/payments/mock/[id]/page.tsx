import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import { getServerAuthSession } from "@/lib/auth";
import { BackendApiError, fetchBackendJsonAsUser } from "@/lib/backend-api";
import { MockPaymentActions } from "./MockPaymentActions";

type PaymentDto = {
  id: string;
  serviceRequestId: string;
  type: "PAYMENT" | "PAYOUT";
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  providerKey: string;
  amountMinor: number;
  currency: string;
  redirectUrl: string | null;
  externalId: string | null;
};

type Props = {
  params: Promise<{ id: string }>;
};

function formatAmount(amountMinor: number, currency: string) {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
}

export default async function MockPaymentPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/payments/mock/${id}`)}`);
  }

  let payment: PaymentDto;
  try {
    payment = await fetchBackendJsonAsUser<PaymentDto>(
      `/payments/${id}`,
      session.user.id,
    );
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  }

  if (payment.providerKey !== "test") {
    notFound();
  }

  const returnUrl = `/profile?section=requests&requestResume=${payment.serviceRequestId}`;

  if (payment.status !== "PENDING") {
    redirect(returnUrl);
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
      <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
        <Image src="/zemledel_logo_dark.svg" alt="Земледел" width={140} height={63} style={{ objectFit: "contain" }} />
      </Box>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing="0.1em">
              Тестовая оплата
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
              {formatAmount(payment.amountMinor, payment.currency)}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Провайдер: test (development). Реальные деньги не списываются.
            </Typography>
          </Box>

          <MockPaymentActions paymentId={payment.id} returnUrl={returnUrl} />
        </Stack>
      </Paper>
    </Container>
  );
}
