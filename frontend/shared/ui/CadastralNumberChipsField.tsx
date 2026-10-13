"use client";

import { useLayoutEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, Stack, TextField, Typography } from "@mui/material";
import { CadastralNumberMapLink } from "@/entities/request/ui/CadastralNumberMapLink";
import {
  cadastralCaretFromDigitCount,
  cadastralPartsFromInput,
  createEmptyCadastralParts,
  digitsOnly,
  formatCadastralInput,
  formatCadastralParts,
  isCadastralPartsComplete,
  joinCadastralParts,
  type CadastralNumberParts,
} from "@/entities/request/lib/cadastral-number";

type Props = {
  value: CadastralNumberParts[];
  onChange: (next: CadastralNumberParts[]) => void;
  disabled?: boolean;
};

const PLACEHOLDER = "66:41:0000000:000";

/**
 * Последняя строка — черновик в поле. Предыдущие полные номера — чипы.
 * Так одно поле заменяет набор из четырёх клеток на каждый номер.
 */
function splitRows(rows: readonly CadastralNumberParts[]) {
  if (rows.length === 0) {
    return { chips: [] as CadastralNumberParts[], draft: createEmptyCadastralParts() };
  }
  const draft = rows[rows.length - 1] ?? createEmptyCadastralParts();
  const chips = rows.slice(0, -1).filter((row) => isCadastralPartsComplete(row));
  return { chips, draft };
}

export function CadastralNumberChipsField({ value, onChange, disabled = false }: Props) {
  const { chips, draft } = splitRows(value);
  const draftText = formatCadastralParts(draft);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const caretRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const caret = caretRef.current;
    if (!input || caret == null) return;
    caretRef.current = null;
    input.setSelectionRange(caret, caret);
  }, [draftText]);

  function publish(nextChips: CadastralNumberParts[], nextDraft: CadastralNumberParts) {
    onChange([...nextChips, nextDraft]);
  }

  function updateDraft(raw: string, caretDigits: number | null) {
    const formatted = formatCadastralInput(raw);
    if (caretDigits != null) {
      caretRef.current = cadastralCaretFromDigitCount(formatted, caretDigits);
    }
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

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    const caret = event.target.selectionStart ?? raw.length;
    updateDraft(raw, digitsOnly(raw.slice(0, caret)).length);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || !isCadastralPartsComplete(draft)) return;
    event.preventDefault();
    commitDraft();
  }

  return (
    <Stack spacing={1} sx={{ width: "100%" }}>
      <Typography sx={{ color: "common.gray", fontSize: 16, lineHeight: 1.5 }}>
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
                  bgcolor: "primary.light",
                  color: "text.primary",
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                <CadastralNumberMapLink value={label} sx={{ fontSize: 13, lineHeight: 1.4 }} />
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

      <TextField
        size="small"
        value={draftText}
        placeholder={PLACEHOLDER}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        disabled={disabled}
        fullWidth
        slotProps={{
          htmlInput: {
            ref: inputRef,
            inputMode: "numeric",
            autoComplete: "off",
            "aria-label": "Кадастровый номер",
          },
        }}
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
