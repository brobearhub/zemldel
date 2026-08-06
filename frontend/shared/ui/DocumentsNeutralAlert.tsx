import type { ReactNode } from "react";
import type { AlertProps } from "@mui/material";
import { Alert } from "@mui/material";

type Props = {
  children: ReactNode;
  icon?: AlertProps["icon"];
  sx?: AlertProps["sx"];
};

/** Нейтральный (серый) баннер для пустых/информационных состояний в блоке документов заявки. */
export function DocumentsNeutralAlert({ children, icon, sx }: Props) {
  return (
    <Alert
      severity="info"
      icon={icon}
      sx={[
        {
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "grey.900" : "grey.100"),
          color: "text.secondary",
          border: "1px solid",
          borderColor: "divider",
          "& .MuiAlert-icon": { color: "text.secondary" },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Alert>
  );
}
