"use client";

import GppGoodOutlinedIcon from "@mui/icons-material/GppGoodOutlined";
import { Button, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import Link from "@/shared/ui/Link";
import { UserLocalDate } from "@/shared/ui/UserLocalDate";
import {
  finishSentence,
  type ProviderVerificationView,
} from "../model/verification-view";

export function ProviderVerificationBanner({
  view,
}: {
  view: ProviderVerificationView;
}) {
  const pending = view.status === "PENDING";
  const verified = view.status === "VERIFIED";
  const rejected = view.status === "REJECTED";
  const title = !view.available
    ? "Подтверждение профиля"
    : verified
      ? "Реквизиты проверены"
      : pending
        ? "Профиль на проверке"
        : "Подтверждение профиля";

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 1.5,
        boxShadow: "none",
        borderColor: (theme) => alpha(theme.palette.primary.dark, 0.24),
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
      }}
    >
      <Stack
        direction={{ xs: "column", tablet: "row" }}
        spacing={2.5}
        sx={{
          alignItems: { xs: "stretch", tablet: "center" },
          justifyContent: "space-between",
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "flex-start",
            minWidth: 0,
          }}
        >
          <GppGoodOutlinedIcon
            aria-hidden
            sx={{
              fontSize: 20,
              flexShrink: 0,
              mt: 0.25,
            }}
          />
          <Stack
            spacing={0.5}
            sx={{
              minWidth: 0,
              overflowWrap: "anywhere",
            }}
          >
            <Typography
              component="h2"
              variant="subtitle2"
              sx={{ fontWeight: 700 }}
            >
              {title}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary" }}
            >
              {!view.available ? (
                "Проверка для физлиц появится позже"
              ) : pending ? (
                <>
                  Решение до 1 рабочего дня.
                  {view.submittedAt ? (
                    <>
                      {" "}
                      Заявка отправлена <UserLocalDate iso={view.submittedAt} />.
                    </>
                  ) : null}
                </>
              ) : verified ? (
                view.verifiedAt ? (
                  <>
                    Дата проверки: <UserLocalDate iso={view.verifiedAt} />
                  </>
                ) : (
                  "Профиль подтверждён"
                )
              ) : rejected ? (
                finishSentence(
                  view.rejectReason?.trim()
                    ? `Заявку отклонили: ${view.rejectReason.trim()}`
                    : "Заявку отклонили",
                )
              ) : (
                "Выше в поиске · Значок · Больше доверия"
              )}
            </Typography>
          </Stack>
        </Stack>
        {view.available && !pending ? (
          <Button
            component={Link}
            href="/pro/settings/profile/verification"
            variant={verified ? "outlined" : "contained"}
            sx={{
              minHeight: 48,
              flexShrink: 0,
              px: 1.5,
              width: { xs: "100%", tablet: "auto" },
              ...(verified ? { color: "text.primary" } : {}),
            }}
          >
            {verified
              ? "Изменить реквизиты"
              : rejected
                ? "Исправить и отправить снова"
                : "Запросить проверку"}
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}
