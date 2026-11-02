"use client";

import { Alert, Box, Paper, Stack, Typography } from "@mui/material";
import Link from "@/shared/ui/Link";
import { getPendingRequestEditHref, type PendingRequestDraft } from "@/entities/request";
import { formatCityLabel } from "@/shared/lib/format-city-label";

export function PendingRequestAuthSummary({ draft, loaded, mode }: {
  draft: PendingRequestDraft | null;
  loaded: boolean;
  mode: "signin" | "signup";
}) {
  if (!loaded) return <Typography role="status">Загружаем сохранённую заявку…</Typography>;
  if (!draft) {
    return (
      <Alert severity="warning">
        Черновик заявки не найден в этой вкладке. После входа можно создать новую заявку.{" "}
        <Link href="/" sx={{ color: "inherit", fontWeight: 700 }}>Вернуться на главную</Link>
      </Alert>
    );
  }
  const isService = draft.kind === "SERVICE";
  return (
    <Paper variant="outlined" sx={{ p: 2, color: "inherit", bgcolor: "rgba(0,0,0,0.18)", borderColor: "rgba(255,255,255,0.4)" }}>
      <Stack spacing={1} role="region" aria-label="Сохранённая заявка">
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
          Ваша заявка сохранена
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {isService ? draft.subjectTitle ?? "Заявка по услуге" : draft.subjectTitle ?? "Свободная заявка"}
        </Typography>
        {draft.message ? <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{draft.message}</Typography> : null}
        {draft.requestCityId ? (
          <Typography variant="body2">Место работ: {draft.requestCity ? formatCityLabel(draft.requestCity.name, draft.requestCity.regionName) : "локация сохранена"}</Typography>
        ) : null}
        {draft.cadastralNumbers.length > 0 ? (
          <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>Кадастровые номера: {draft.cadastralNumbers.join(", ")}</Typography>
        ) : null}
        <Typography variant="body2">
          После {mode === "signup" ? "регистрации" : "входа"} {isService
            ? "отправим заявку исполнителю этой услуги и откроем ваш чат."
            : "опубликуем заявку для подходящих исполнителей. Вы сможете обсудить предложения и выбрать одного."}
        </Typography>
        <Box><Link href={getPendingRequestEditHref(draft)} sx={{ color: "inherit", fontWeight: 700 }}>Изменить заявку</Link></Box>
      </Stack>
    </Paper>
  );
}
