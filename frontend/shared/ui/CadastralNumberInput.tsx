"use client";

import { useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { OutlinedInput, Stack, Typography } from "@mui/material";
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
  size = "medium",
}: Props) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function updatePart(index: number, raw: string) {
    const nextPart = digitsOnly(raw).slice(
      0,
      CADASTRAL_PART_MAX_LENGTHS[index],
    );
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
      if (event.key !== "Backspace" || value[index].length > 0 || index === 0)
        return;
      inputRefs.current[index - 1]?.focus();
    };
  }

  return (
    <Stack
      direction="row"
      spacing={0.75}
      useFlexGap
      sx={{
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {value.map((part, index) => (
        <Stack
          key={index}
          direction="row"
          spacing={0.75}
          sx={{
            alignItems: "center",
          }}
        >
          <OutlinedInput
            size={size}
            inputRef={(element: HTMLInputElement | null) => {
              inputRefs.current[index] = element;
            }}
            value={part}
            onChange={handleChange(index)}
            onKeyDown={handleKeyDown(index)}
            disabled={disabled}
            placeholder={
              index === 3
                ? "0000"
                : "0".repeat(CADASTRAL_PART_MAX_LENGTHS[index])
            }
            slotProps={{
              input: {
                inputMode: "numeric",
                maxLength: CADASTRAL_PART_MAX_LENGTHS[index],
                "aria-label": `Кадастровый номер, часть ${index + 1}`,
                sx: {
                  width: `${index === 2 ? 7 : index === 3 ? Math.max(4, part.length) + 1 : 2}ch`,
                },
              },
            }}
            sx={{
              width: "auto",
            }}
          />
          {index < 3 ? (
            <Typography
              sx={{
                color: "text.secondary",
                fontWeight: 700,
              }}
            >
              :
            </Typography>
          ) : null}
        </Stack>
      ))}
    </Stack>
  );
}
