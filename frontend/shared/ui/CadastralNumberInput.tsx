"use client";

import { useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { Box, Stack, Typography } from "@mui/material";
import {
  CADASTRAL_PART_MAX_LENGTHS,
  digitsOnly,
  type CadastralNumberParts,
} from "@/entities/request/lib/cadastral-number";

type Props = {
  value: CadastralNumberParts;
  onChange: (next: CadastralNumberParts) => void;
  disabled?: boolean;
  size?: "small" | "medium";
};

export function CadastralNumberInput({
  value,
  onChange,
  disabled = false,
  size = "small",
}: Props) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function updatePart(index: number, raw: string) {
    const nextPart = digitsOnly(raw).slice(0, CADASTRAL_PART_MAX_LENGTHS[index]);
    const next = [...value] as CadastralNumberParts;
    next[index] = nextPart;
    onChange(next);

    if (nextPart.length >= CADASTRAL_PART_MAX_LENGTHS[index] && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleChange(index: number) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updatePart(index, event.target.value);
    };
  }

  function handleKeyDown(index: number) {
    return (event: KeyboardEvent) => {
      if (event.key !== "Backspace" || value[index].length > 0 || index === 0) return;
      inputRefs.current[index - 1]?.focus();
    };
  }

  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{
      alignItems: "center"
    }}>
      {value.map((part, index) => (
        <Stack key={index} direction="row" spacing={0.75} sx={{
          alignItems: "center"
        }}>
          <Box
            component="input"
            ref={(element: HTMLInputElement | null) => {
              inputRefs.current[index] = element;
            }}
            value={part}
            onChange={handleChange(index)}
            onKeyDown={handleKeyDown(index)}
            disabled={disabled}
            inputMode="numeric"
            placeholder={index === 3 ? "0000" : "0".repeat(CADASTRAL_PART_MAX_LENGTHS[index])}
            maxLength={CADASTRAL_PART_MAX_LENGTHS[index]}
            aria-label={`Кадастровый номер, часть ${index + 1}`}
            sx={{
              width: index === 2 ? 96 : index === 3 ? "auto" : 56,
              minWidth: index === 3 ? 56 : undefined,
              ...(index === 3
                ? {
                    width: `calc(${Math.max(4, part.length || 0) + 1}ch)`,
                    // запас +1ch, чтобы последняя цифра не "подъедалась" из‑за метрик шрифта/рендеринга
                    boxSizing: "content-box",
                  }
                : null),
              height: size === "medium" ? 40 : 32,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              px: 1,
              font: "inherit",
              fontSize: size === "medium" ? 16 : 14,
              outline: "none",
              bgcolor: "background.paper",
              "&:focus": {
                borderColor: "primary.main",
              },
            }}
          />
          {index < 3 ? (
            <Typography
              sx={{
                color: "text.secondary",
                fontWeight: 700
              }}>
              :
            </Typography>
          ) : null}
        </Stack>
      ))}
    </Stack>
  );
}
