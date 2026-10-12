"use client";

import { useState } from "react";
import { Box, Typography } from "@mui/material";
import type { CitySuggestItemDto } from "@/entities/city";
import { LocationButton, type LocationIconColor } from "./LocationButton";
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
  /** Крестик сброса рядом с выбранным городом. В шапке не используется. */
  clearable?: boolean;
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
  iconColor,
  clearable = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const hint = helperText?.trim() ? helperText : null;

  function openDialog() {
    if (!disabled) setOpen(true);
  }

  return (
    <Box>
      {caption ? (
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.25 }}>
          {caption}
        </Typography>
      ) : null}
      <LocationButton
        label={value ? value.name : EMPTY_LABEL}
        onClick={openDialog}
        disabled={disabled}
        error={error}
        iconColor={iconColor}
        onClear={clearable && value ? () => onChange(null) : undefined}
      />
      {hint ? (
        <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: error ? "error.main" : "text.secondary" }}>
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
