"use client";

import { useState, type KeyboardEvent } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { CadastralNumberMapLink } from "@/entities/request/ui/CadastralNumberMapLink";
import {
  cadastralPartsFromInput,
  createEmptyCadastralParts,
  formatCadastralParts,
  isCadastralPartsComplete,
  joinCadastralParts,
  type CadastralNumberParts,
} from "@/entities/request/lib/cadastral-number";
import { CadastralNumberTextField } from "./CadastralNumberTextField";

type Props = {
  value: CadastralNumberParts[];
  onChange: (next: CadastralNumberParts[]) => void;
  disabled?: boolean;
  labelAlign?: "left" | "center" | "right";
  errorText?: string;
};

/**
 * Последняя строка — черновик в поле. Предыдущие полные номера — чипы.
 * Так одно поле заменяет набор из четырёх клеток на каждый номер.
 */
function splitRows(rows: readonly CadastralNumberParts[]) {
  if (rows.length === 0) {
    return {
      chips: [] as CadastralNumberParts[],
      draft: createEmptyCadastralParts(),
    };
  }
  const draft = rows[rows.length - 1] ?? createEmptyCadastralParts();
  const chips = rows
    .slice(0, -1)
    .filter((row) => isCadastralPartsComplete(row));
  return { chips, draft };
}

export function CadastralNumberChipsField({
  value,
  onChange,
  disabled = false,
  labelAlign = "left",
  errorText,
}: Props) {
  const { chips, draft } = splitRows(value);
  const [shortSeparator, setShortSeparator] = useState(false);
  const formattedDraft = formatCadastralParts(draft);
  const draftText = shortSeparator && /^\d{2}:\d{2}:\d{6}$/.test(formattedDraft)
    ? formattedDraft + ":"
    : formattedDraft;

  function publish(
    nextChips: CadastralNumberParts[],
    nextDraft: CadastralNumberParts,
  ) {
    onChange([...nextChips, nextDraft]);
  }

  function updateDraft(formatted: string) {
    setShortSeparator(formatted.endsWith(":"));
    publish(chips, cadastralPartsFromInput(formatted));
  }

  function commitDraft() {
    if (!isCadastralPartsComplete(draft)) return;
    const joined = joinCadastralParts(draft);
    const duplicate = chips.some((row) => joinCadastralParts(row) === joined);
    publish(duplicate ? chips : [...chips, draft], createEmptyCadastralParts());
  }

  function removeChip(index: number) {
    publish(
      chips.filter((_, chipIndex) => chipIndex !== index),
      draft,
    );
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "Enter" || !isCadastralPartsComplete(draft)) return;
    event.preventDefault();
    commitDraft();
  }

  return (
    <Stack spacing={1} sx={{ width: "100%" }}>
      <Typography
        sx={{
          color: "common.gray",
          fontSize: "1rem",
          lineHeight: 1.5,
          textAlign: labelAlign,
        }}
      >
        Кадастровый номер · необязательно
      </Typography>

      {chips.length > 0 ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {chips.map((row, index) => {
            const label = joinCadastralParts(row) ?? "";
            return (
              <Box
                key={`${label}-${index}`}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  pl: 1.25,
                  pr: 0.5,
                  py: 0.5,
                  borderRadius: "8px",
                  bgcolor: "background.default",
                  border: "1px solid",
                  borderColor: "divider",
                  color: "text.primary",
                  fontSize: "1rem",
                  lineHeight: 1.5,
                }}
              >
                <CadastralNumberMapLink
                  value={label}
                  sx={{ fontSize: "1rem", lineHeight: 1.5 }}
                />
                <IconButton
                  type="button"
                  size="small"
                  aria-label={`Удалить кадастровый номер ${label}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => removeChip(index)}
                  disabled={disabled}
                  sx={{ p: 0.25, color: "inherit" }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      ) : null}

      <CadastralNumberTextField
        value={draftText}
        error={Boolean(errorText)}
        helperText={errorText}
        onValueChange={updateDraft}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        disabled={disabled}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "16px",
            color: "common.gray",
          },
          "& .MuiOutlinedInput-input::placeholder": {
            color: "common.gray",
            opacity: 1,
          },
        }}
      />
    </Stack>
  );
}
