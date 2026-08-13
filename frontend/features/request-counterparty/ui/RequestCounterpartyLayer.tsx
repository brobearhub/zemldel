"use client";

import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { RequestCounterpartyOverlay } from "./RequestCounterpartyOverlay";
import type { CounterpartyField } from "../model/counterparty-card";

type Props = {
  open: boolean;
  title: string;
  fields: readonly CounterpartyField[];
  avatarSrc?: string | null;
  avatarName?: string | null;
  onClose: () => void;
  children: ReactNode;
};

/** Why: оверлей только внутри блока «Заявка», прогресс и чат не перекрываются. */
export function RequestCounterpartyLayer({
  open,
  title,
  fields,
  avatarSrc,
  avatarName,
  onClose,
  children,
}: Props) {
  return (
    <Box sx={{ position: "relative", borderRadius: "16px", overflow: "hidden" }}>
      {children}
      <RequestCounterpartyOverlay
        open={open}
        title={title}
        fields={fields}
        avatarSrc={avatarSrc}
        avatarName={avatarName}
        onClose={onClose}
      />
    </Box>
  );
}
