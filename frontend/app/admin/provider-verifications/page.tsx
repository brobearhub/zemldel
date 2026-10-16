import { Box, Button, Chip, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { UserLocalDate } from "@/shared/ui/UserLocalDate";
import { forbidden } from "next/navigation";
import {
  PROVIDER_TYPE_LABEL,
  REQUEST_STATUS_LABEL,
  registrationNumberLabel,
  type VerificationQueue,
} from "./model";

type Props = {
  searchParams: Promise<{ status?: string; q?: string }>;
};

const FILTERS = [
  { value: "", label: "Все" },
  { value: "PENDING", label: "На проверке" },
  { value: "APPROVED", label: "Подтверждена" },
  { value: "REJECTED", label: "Отклонена" },
] as const;

export default async function ProviderVerificationsPage({ searchParams }: Props) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) forbidden();
  const query = await searchParams;
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";

  let queue: VerificationQueue;
  try {
    queue = await fetchBackendJsonAsUser<VerificationQueue>(
      `/admin/provider-verifications${suffix}`,
      session.user.id,
    );
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      forbidden();
    }
    throw error;
  }

  return (
    <Container sx={{ py: { xs: 2, md: 4 }, px: { xs: 0, sm: 2 } }}>
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 900 }}>
            Проверки исполнителей
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Неразобранных: {queue.pendingCount}. Сначала старые.
          </Typography>
        </Stack>

        <Box component="form" action="/admin/provider-verifications" sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {query.status ? <input type="hidden" name="status" value={query.status} /> : null}
          <TextField name="q" defaultValue={query.q ?? ""} label="ИНН, ОГРН или название" size="small" />
          <Button type="submit" variant="contained" sx={{ minHeight: 44 }}>
            Найти
          </Button>
        </Box>

        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          {FILTERS.map((filter) => {
            const href = filter.value
              ? `/admin/provider-verifications?status=${filter.value}${query.q ? `&q=${encodeURIComponent(query.q)}` : ""}`
              : `/admin/provider-verifications${query.q ? `?q=${encodeURIComponent(query.q)}` : ""}`;
            const active = (query.status ?? "") === filter.value;
            return (
              <Button key={filter.label} component="a" href={href} variant={active ? "contained" : "outlined"} sx={{ minHeight: 44 }}>
                {filter.label}
              </Button>
            );
          })}
        </Stack>

        {queue.items.length === 0 ? (
          <Typography>Заявок нет.</Typography>
        ) : (
          <Stack spacing={1}>
            {queue.items.map((item) => {
              const registrationLabel = registrationNumberLabel(item.type);
              return (
                <Paper
                  key={item.id}
                  variant="outlined"
                  component="a"
                  href={`/admin/provider-verifications/${item.id}`}
                  sx={{
                    p: 2,
                    display: "block",
                    textDecoration: "none",
                    color: "inherit",
                    borderColor: item.overdue ? "warning.main" : "divider",
                    bgcolor: item.overdue ? "warning.light" : "background.paper",
                  }}
                >
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
                      <Typography sx={{ fontWeight: 800 }}>{item.displayName}</Typography>
                      <Chip size="small" label={PROVIDER_TYPE_LABEL[item.type] ?? item.type} />
                      <Chip size="small" label={REQUEST_STATUS_LABEL[item.status]} />
                      {item.overdue ? <Chip size="small" color="warning" label="Старше 1 рабочего дня" /> : null}
                    </Stack>
                    <Typography variant="body2">
                      <UserLocalDate iso={item.submittedAt} />
                      {item.inn ? ` · ИНН ${item.inn}` : ""}
                      {item.ogrn && registrationLabel ? ` · ${registrationLabel} ${item.ogrn}` : ""}
                    </Typography>
                    <Typography variant="body2" sx={{ color: item.fnsLabel === "Сверка недоступна" ? "text.secondary" : "text.primary" }}>
                      ФНС: {item.fnsLabel}
                    </Typography>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
