"use client";

import { useEffect } from "react";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import CloseIcon from "@mui/icons-material/Close";
import { Avatar, Box, IconButton, Paper, Stack, Typography } from "@mui/material";
import type { CounterpartyField } from "../model/counterparty-card";
import { getCounterpartyInitials, hasAnyCounterpartyValue } from "../model/counterparty-card";

type Props = {
  open: boolean;
  title: string;
  fields: readonly CounterpartyField[];
  avatarSrc?: string | null;
  avatarName?: string | null;
  onClose: () => void;
};

function fieldValue(value: string | null): string {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : "Не указано";
}

export function RequestCounterpartyOverlay({
  open,
  title,
  fields,
  avatarSrc,
  avatarName,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const hasValues = hasAnyCounterpartyValue(fields);
  const initials = getCounterpartyInitials(avatarName);

  return (
    <Paper
      elevation={0}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      sx={(theme) => ({
        position: "absolute",
        inset: 0,
        zIndex: 2,
        overflow: "auto",
        p: { xs: 2, sm: 2.5 },
        borderRadius: "16px",
        bgcolor: `color-mix(in srgb, ${theme.palette.common.black} 3.5%, ${theme.palette.background.default})`,
        boxShadow: "none",
      })}
    >
      <Stack spacing={2.5}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <AssignmentIndIcon color="inherit" />
            <Typography variant="h5" fontWeight={800}>
              {title}
            </Typography>
          </Stack>
          <IconButton aria-label="Закрыть" onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ minWidth: 0, flex: "1 1 auto" }}>
            {hasValues ? (
              <Stack spacing={1.5}>
                {fields.map((field) => (
                  <Box key={field.label}>
                    <Typography variant="body2" color="text.secondary">
                      {field.label}
                    </Typography>
                    <Typography fontWeight={700} sx={{ whiteSpace: "pre-wrap" }}>
                      {fieldValue(field.value)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">Контакты не указаны</Typography>
            )}
          </Box>
          <Avatar
            src={avatarSrc?.trim() || undefined}
            alt={avatarName?.trim() || title}
            sx={{
              width: 96,
              height: 96,
              flexShrink: 0,
              bgcolor: "primary.main",
              color: "common.white",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            {initials}
          </Avatar>
        </Stack>
      </Stack>
    </Paper>
  );
}
