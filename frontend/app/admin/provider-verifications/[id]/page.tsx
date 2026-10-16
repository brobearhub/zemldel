import { Chip, Container, Paper, Stack, Typography } from "@mui/material";
import { forbidden, notFound } from "next/navigation";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { UserLocalDate } from "@/shared/ui/UserLocalDate";
import {
  PROVIDER_TYPE_LABEL,
  REQUEST_STATUS_LABEL,
  registrationNumberLabel,
  type VerificationCard,
} from "../model";
import { FnsManualCheck } from "../ui/FnsManualCheck";
import { VerificationDecision } from "../ui/VerificationDecision";

type Props = { params: Promise<{ id: string }> };

function finishAdminSentence(text: string) {
  const trimmed = text.trim();
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export default async function ProviderVerificationCardPage({ params }: Props) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) forbidden();
  const { id } = await params;

  let card: VerificationCard;
  try {
    card = await fetchBackendJsonAsUser<VerificationCard>(
      `/admin/provider-verifications/${id}`,
      session.user.id,
    );
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) notFound();
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) forbidden();
    throw error;
  }

  const registrationLabel = registrationNumberLabel(card.type);

  return (
    <Container sx={{ py: { xs: 2, md: 4 }, px: { xs: 0, sm: 2 } }}>
      <Stack spacing={2}>
        <Typography component="a" href="/admin/provider-verifications" sx={{ color: "text.secondary", textDecoration: "none" }}>
          ← К очереди
        </Typography>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 900 }}>
          {card.displayName}
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          <Chip label={PROVIDER_TYPE_LABEL[card.type] ?? card.type} />
          <Chip label={REQUEST_STATUS_LABEL[card.status]} />
        </Stack>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={0.75}>
            <Typography sx={{ fontWeight: 800 }}>Реквизиты</Typography>
            <Typography>Подано: <UserLocalDate iso={card.submittedAt} /></Typography>
            {card.requisites.fullName ? <Typography>ФИО: {card.requisites.fullName}</Typography> : null}
            {card.requisites.legalName ? <Typography>Наименование: {card.requisites.legalName}</Typography> : null}
            <Typography>ИНН: {card.requisites.inn ?? "—"}</Typography>
            {registrationLabel ? (
              <Typography>
                {registrationLabel}: {card.requisites.ogrn ?? "—"}
              </Typography>
            ) : null}
            <Typography>
              Профиль: {card.provider.name}
              {card.provider.cityName ? `, ${card.provider.cityName}` : ""}
            </Typography>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={0.75}>
            <Typography sx={{ fontWeight: 800 }}>Данные ФНС</Typography>
            <Typography>{card.fns.label}</Typography>
            {card.fns.available && card.fns.checkedAt ? (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Источник: {card.fns.source ?? "—"}, <UserLocalDate iso={card.fns.checkedAt} />
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Сверка не мешает решению заявки.
              </Typography>
            )}
          </Stack>
        </Paper>

        <FnsManualCheck
          requestId={card.id}
          providerType={card.type}
          inn={card.requisites.inn}
          ogrn={card.requisites.ogrn}
          fnsLabel={card.fns.label}
          fnsStatus={card.fns.status}
          fnsAvailable={card.fns.available}
          fnsCheckedAt={card.fns.checkedAt}
          fnsSource={card.fns.source}
          manualCheckedAt={card.fns.manualCheckedAt}
        />

        {card.status === "PENDING" ? <VerificationDecision requestId={card.id} /> : (
          <Typography>
            {finishAdminSentence(
              card.rejectReason?.trim()
                ? `Решение уже в журнале: ${card.rejectReason.trim()}`
                : "Решение уже в журнале",
            )}
          </Typography>
        )}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography sx={{ fontWeight: 800 }}>Журнал</Typography>
            {card.history.map((item) => (
              <Stack key={item.id} spacing={0.25}>
                <Typography>
                  <UserLocalDate iso={item.submittedAt} /> — {REQUEST_STATUS_LABEL[item.status]}
                </Typography>
                {item.decidedAt ? (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {item.decidedByName ?? "Администратор"}, <UserLocalDate iso={item.decidedAt} />
                    {item.rejectReason ? `. ${item.rejectReason.trim().replace(/[.!?…]+$/, "")}` : ""}
                  </Typography>
                ) : null}
                {item.fnsManualCheckedAt ? (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Проверено на сайте ФНС вручную
                    {item.fnsManualCheckedByName ? `, ${item.fnsManualCheckedByName}` : ""},{" "}
                    <UserLocalDate iso={item.fnsManualCheckedAt} />
                  </Typography>
                ) : null}
              </Stack>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
