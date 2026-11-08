"use client";

import Link from "next/link";
import { Button, Paper, Stack, Typography } from "@mui/material";

export type RequestAccessFailure = 401 | 403 | 404;

export function isRequestAccessFailure(
  status: number,
): status is RequestAccessFailure {
  return status === 401 || status === 403 || status === 404;
}

export function RequestUnavailableNotice({
  status = 404,
  returnHref,
}: {
  status?: RequestAccessFailure;
  returnHref: string;
}) {
  return (
    <Paper role="alert" sx={{ p: 3, m: 2 }}>
      <Stack spacing={2}>
        <Typography component="h1" variant="h1">
          {status === 401 ? "Сессия завершена" : "Заявка недоступна"}
        </Typography>
        <Typography color="text.secondary">
          {status === 401
            ? "Войдите снова, чтобы продолжить работу."
            : status === 403
              ? "У вас больше нет доступа к этой заявке."
              : "Заявка удалена или больше недоступна. Вернитесь к списку заявок."}
        </Typography>
        <Button
          component={Link}
          href={status === 401 ? "/signin" : returnHref}
          variant="contained"
          sx={{ alignSelf: "flex-start" }}
        >
          {status === 401 ? "Войти" : "К списку заявок"}
        </Button>
      </Stack>
    </Paper>
  );
}
