"use client";

import { Suspense } from "react";
import { Alert, Stack } from "@mui/material";
import { useSearchParams } from "next/navigation";

const ACCESS_NOTICES: Record<string, string> = {
  "providers-only": "Раздел только для исполнителей",
  "customer-account": "Заявки заказчика создаются отдельным аккаунтом",
  "profile-ready": "Профиль исполнителя уже создан",
};

function Notices({ welcome }: { welcome?: string }) {
  const params = useSearchParams();
  const access = ACCESS_NOTICES[params.get("notice") ?? ""];
  const showWelcome = params.get("welcome") === "1" && Boolean(welcome);

  if (!access && !showWelcome) return null;

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {access ? (
        <Alert severity="info" role="status">
          {access}
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
