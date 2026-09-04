"use client";

import { Avatar, Box, Stack, Typography } from "@mui/material";
import type { CounterpartyField } from "../model/counterparty-card";
import { getCounterpartyInitials, hasAnyCounterpartyValue } from "../model/counterparty-card";

type Props = {
  fields: readonly CounterpartyField[];
  avatarSrc?: string | null;
  avatarName?: string | null;
  emptyText?: string;
};

function fieldValue(value: string | null): string {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : "Не указано";
}

export function RequestCounterpartyPanel({ fields, avatarSrc, avatarName, emptyText = "Контакты не указаны" }: Props) {
  const hasValues = hasAnyCounterpartyValue(fields);
  const initials = getCounterpartyInitials(avatarName);

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        alignItems: "flex-start",
        justifyContent: "space-between"
      }}>
      <Box sx={{ minWidth: 0, flex: "1 1 auto" }}>
        {hasValues ? (
          <Stack spacing={1.5}>
            {fields.map((field) => (
              <Box key={field.label}>
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  {field.label}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 700,
                    whiteSpace: "pre-wrap"
                  }}>
                  {fieldValue(field.value)}
                </Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography sx={{
            color: "text.secondary"
          }}>{emptyText}</Typography>
        )}
      </Box>
      <Avatar
        src={avatarSrc?.trim() || undefined}
        alt={avatarName?.trim() || "Контрагент"}
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
  );
}

