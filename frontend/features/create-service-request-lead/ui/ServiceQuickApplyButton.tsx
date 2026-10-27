"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { buildRequestAuthHref, savePendingRequestDraft } from "@/entities/request";
import { useServiceAskQuestion } from "@/features/create-service-request-lead/model/useServiceAskQuestion";

type Props = {
  serviceId: string;
  isAuthenticated: boolean;
  sx?: SxProps<Theme>;
  fullWidth?: boolean;
};

export function ServiceQuickApplyButton({ serviceId, isAuthenticated, sx, fullWidth }: Props) {
  const router = useRouter();
  const ask = useServiceAskQuestion({ serviceId });
  const [guestBusy, setGuestBusy] = useState(false);

  const handleClick = useCallback(() => {
    if (isAuthenticated) {
      void ask.submit({ questionText: "", cadastralNumbers: [] });
      return;
    }

    setGuestBusy(true);
    try {
      savePendingRequestDraft({
        kind: "SERVICE",
        serviceId,
        customerName: null,
        customerEmail: null,
        customerPhone: null,
        message: null,
        requestCityId: null,
        cadastralNumbers: [],
      });
      router.push(buildRequestAuthHref("signup", { kind: "SERVICE", serviceId }));
    } finally {
      setGuestBusy(false);
    }
  }, [ask, isAuthenticated, router, serviceId]);

  const busy = isAuthenticated ? ask.busy : guestBusy;

  return (
    <Button
      type="button"
      variant="contained"
      onClick={handleClick}
      loading={busy}
      sx={sx}
      fullWidth={fullWidth}
    >
      ПОДАТЬ ЗАЯВКУ
    </Button>
  );
}

