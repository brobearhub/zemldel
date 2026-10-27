"use client";

import { Suspense } from "react";
import { Alert, Stack } from "@mui/material";
import { useSearchParams } from "next/navigation";

const ACCESS_NOTICES: Record<string, string> = {
  "providers-only": "Раздел только для исполнителей",
  "customer-account": "Заявки заказчика создаются отдельным аккаунтом",
  "profile-ready": "Профиль исполнителя уже создан",
};

const WARNING_NOTICES: Record<string, string> = {
  "provider-avatar-failed": "Аватар исполнителя не загрузился. Добавьте его в разделе «Профиль»",
  "contact-avatar-failed": "Фото контактного лица не загрузилось. Добавьте его в разделе «Контактное лицо»",
  "avatars-failed":
    "Аватар исполнителя и фото контактного лица не загрузились. Добавьте их в разделах «Профиль» и «Контактное лицо»",
};

function Notices({ welcome }: { welcome?: string }) {
  const params = useSearchParams();
  const access = ACCESS_NOTICES[params.get("notice") ?? ""];
  const warning = WARNING_NOTICES[params.get("notice") ?? ""];
  const showWelcome = params.get("welcome") === "1" && Boolean(welcome);

  if (!access && !warning && !showWelcome) return null;

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {access ? (
        <Alert severity="info" role="status">
          {access}
        </Alert>
      ) : null}
      {warning ? (
        <Alert severity="warning" role="status">
          {warning}
        </Alert>
      ) : null}
      {showWelcome && welcome ? (
        <Alert severity="success" role="status">
          {welcome}
        </Alert>
      ) : null}
    </Stack>
  );
}

export function CabinetNotices({ welcome }: { welcome?: string }) {
  return (
    <Suspense fallback={null}>
      <Notices welcome={welcome} />
    </Suspense>
  );
}
