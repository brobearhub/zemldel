"use client";

import { useState } from "react";
import { Alert, Button, Stack } from "@mui/material";
import type { ProviderVerificationView } from "../model/verification-view";
import { ProviderVerificationForm } from "./ProviderVerificationForm";

type Props = {
  providerId: string;
  view: ProviderVerificationView;
};

export function VerifiedRequisitesChange({ providerId, view }: Props) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>
        <Alert severity="warning">Профиль снова уйдёт на проверку, значок пропадёт.</Alert>
        <Button variant="outlined" onClick={() => setEditing(true)} sx={{ minHeight: 44 }}>
          Изменить реквизиты
        </Button>
      </Stack>
    );
  }

  return <ProviderVerificationForm providerId={providerId} view={view} />;
}
