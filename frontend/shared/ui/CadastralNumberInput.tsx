"use client";

import { useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { Box, IconButton, InputBase, Stack, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { grey } from "@mui/material/colors";
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
  variant?: "default" | "sidebar";
  onClear?: () => void;
};

export function CadastralNumberInput({
  value,
  onChange,
  disabled = false,
  size = "small",
  variant = "default",
  onClear,
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

  if (variant === "sidebar") {
    const widths = [30, 30, 90, 60] as const;
    return (
      <Stack
        direction="row"
        spacing={0.75}
        useFlexGap
        sx={{ alignItems: "center", width: "100%", maxWidth: 292, overflow: "hidden" }}
      >
        <Stack
          direction="row"
          spacing={0.75}
          useFlexGap
          sx={{ alignItems: "center", flex: 1, minWidth: 0, overflow: "hidden" }}
        >
          {value.map((part, index) => (
            <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                sx={{
                  width: widths[index],
                  height: 32,
                  px: 0.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "#f4f6f4",
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              >
                <InputBase
                  inputRef={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  value={part}
                  onChange={handleChange(index)}
                  onKeyDown={handleKeyDown(index)}
                  disabled={disabled}
                  inputProps={{
                    maxLength: CADASTRAL_PART_MAX_LENGTHS[index],
                    "aria-label": `Кадастровый номер, часть ${index + 1}`,
                    inputMode: "numeric",
                    style: {
                      textAlign: "center",
                      fontSize: 13,
                      lineHeight: "normal",
                      width: "100%",
                    },
                  }}
                  placeholder={"0".repeat(CADASTRAL_PART_MAX_LENGTHS[index])}
                  sx={{ width: "100%", color: "#9e9e92" }}
                />
              </Box>
              {index < 3 ? (
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: grey[600] }}>:</Typography>
              ) : null}
            </Box>
          ))}
        </Stack>

        {onClear ? (
          <IconButton
            aria-label="Очистить кадастровый номер"
            onClick={onClear}
            disabled={disabled}
            size="small"
            sx={{ p: 0.5, flexShrink: 0 }}
          >
            <CloseRoundedIcon sx={{ fontSize: 20, color: grey[600] }} />
          </IconButton>
        ) : null}
      </Stack>
    );
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
