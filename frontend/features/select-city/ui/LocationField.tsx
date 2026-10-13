"use client";

import { useState, type Ref } from "react";
import { Box, Typography } from "@mui/material";
import type { CitySuggestItemDto } from "@/entities/city";
import { LocationButton, type LocationIconColor, type LocationTone } from "./LocationButton";
import { LocationDialog } from "./LocationDialog";

type Props = {
  label: string;
  value: CitySuggestItemDto | null;
  onChange: (next: CitySuggestItemDto | null) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  /** Подпись над кнопкой, если рядом несколько локаций. */
  caption?: string;
  iconColor?: LocationIconColor;
  /** `light` — цвет родителя, чтобы локация читалась на тёмном стекле. */
  tone?: LocationTone;
  /** Подпись кнопки, пока город не выбран. */
  emptyLabel?: string;
  /** Крестик сброса рядом с выбранным городом. В шапке не используется. */
  clearable?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
};

const EMPTY_LABEL = "Выбрать локацию";

export function LocationField({
  label,
  value,
  onChange,
  disabled,
  error,
  helperText,
  caption,
  emptyLabel = EMPTY_LABEL,
  iconColor,
  tone = "default",
  clearable = true,
  buttonRef,
}: Props) {
  const [open, setOpen] = useState(false);
  const hint = helperText?.trim() ? helperText : null;

  function openDialog() {
    if (!disabled) setOpen(true);
  }

  return (
    <Box>
      {caption ? (
        <Typography variant="body2" sx={{ color: tone === "light" ? "inherit" : "text.secondary", mb: 0.25 }}>
          {caption}
        </Typography>
      ) : null}
      <LocationButton
        label={value ? value.name : emptyLabel}
        onClick={openDialog}
        disabled={disabled}
        error={error}
        buttonRef={buttonRef}
        iconColor={iconColor}
        tone={tone}
        onClear={clearable && value ? () => onChange(null) : undefined}
      />
      {hint ? (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 0.5,
            color: error ? "error.main" : tone === "light" ? "inherit" : "text.secondary",
          }}
        >
          {hint}
        </Typography>
      ) : null}
      {open ? (
        <LocationDialog
          open
          title={label}
          value={value}
          onClose={() => setOpen(false)}
          onSelect={(next) => {
            onChange(next);
            setOpen(false);
          }}
          onReset={() => {
            onChange(null);
            setOpen(false);
          }}
        />
      ) : null}
    </Box>
  );
}
