"use client";

import type { Ref } from "react";
import { Box, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";

const ICON_COLOR = {
  gray: "common.gray",
  primary: "primary.main",
  accent: "accent.main",
} as const;

export type LocationIconColor = keyof typeof ICON_COLOR;

/** `light` — цвет родителя. На тёмном стекле серый текст и пин не читаются. */
export type LocationTone = "default" | "light";

type Props = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  error?: boolean;
  iconColor?: LocationIconColor;
  tone?: LocationTone;
  /** В шапке текст прячется на узком экране, в меню и формах остаётся видимым. */
  labelDisplay?: "always" | "fromMd";
  /** Сброс выбранного города. В шапке не передаётся. */
  onClear?: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
};

export function LocationButton({
  label,
  onClick,
  disabled,
  error,
  iconColor = "gray",
  tone = "default",
  labelDisplay = "always",
  onClear,
  buttonRef,
}: Props) {
  const onLight = tone === "light";
  const textColor = error ? "error.dark" : onLight ? "inherit" : "common.gray";
  const pinColor = error ? "error.dark" : onLight && iconColor === "gray" ? "inherit" : ICON_COLOR[iconColor];
  const idleColor = onLight ? "inherit" : "common.gray";
  const hoverColor = onLight ? "common.white" : "primary.main";

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", maxWidth: "100%", minWidth: 0 }}>
      <Box
        component="button"
        type="button"
        ref={buttonRef}
        aria-haspopup="dialog"
        aria-label={label}
        aria-invalid={error || undefined}
        disabled={disabled}
        onClick={onClick}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          px: { xs: 0.75, sm: 1 },
          py: 0.75,
          minWidth: 0,
          minHeight: 44,
          maxWidth: "100%",
          borderRadius: 1,
          border: 0,
          outline: "none",
          cursor: disabled ? "default" : "pointer",
          bgcolor: error ? "background.paper" : "transparent",
          ...(error ? { color: "error.dark", px: 1 } : {}),
          textAlign: "left",
          color: textColor,
          "&:focus, &:focus-visible": { outline: "none" },
          "&:hover": {
            color: disabled ? textColor : hoverColor,
          },
          "&:disabled": { opacity: 0.6 },
        }}
      >
        <LocationOnOutlinedIcon sx={{ fontSize: 18, color: pinColor }} />
        <Typography
          variant="body2"
          sx={{
            color: "inherit",
            display: labelDisplay === "fromMd" ? { xs: "none", md: "block" } : "block",
            fontWeight: 600,
            fontSize: 14,
            maxWidth: labelDisplay === "fromMd" ? 160 : 280,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Typography>
      </Box>
      {onClear ? (
        <Box
          component="button"
          type="button"
          aria-label="Сбросить локацию"
          disabled={disabled}
          onClick={onClear}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            p: 0.25,
            mr: 0.5,
            border: 0,
            borderRadius: 1,
            outline: "none",
            bgcolor: "transparent",
            color: idleColor,
            cursor: disabled ? "default" : "pointer",
            "&:focus, &:focus-visible": { outline: "none" },
            "&:hover": { color: disabled ? idleColor : hoverColor },
            "&:disabled": { opacity: 0.6 },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </Box>
      ) : null}
    </Box>
  );
}
