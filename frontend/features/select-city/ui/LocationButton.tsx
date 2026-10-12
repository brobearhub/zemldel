"use client";

import { Box, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";

const ICON_COLOR = {
  gray: "common.gray",
  primary: "primary.main",
  accent: "accent.main",
} as const;

export type LocationIconColor = keyof typeof ICON_COLOR;

type Props = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  error?: boolean;
  iconColor?: LocationIconColor;
  /** В шапке текст прячется на узком экране, в меню и формах остаётся видимым. */
  labelDisplay?: "always" | "fromMd";
  /** Сброс выбранного города. В шапке не передаётся. */
  onClear?: () => void;
};

export function LocationButton({
  label,
  onClick,
  disabled,
  error,
  iconColor = "gray",
  labelDisplay = "always",
  onClear,
}: Props) {
  const textColor = error ? "error.main" : "common.gray";
  const pinColor = error ? "error.main" : ICON_COLOR[iconColor];

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", maxWidth: "100%", minWidth: 0 }}>
      <Box
        component="button"
        type="button"
        aria-haspopup="dialog"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          px: { xs: 0.75, sm: 1 },
          py: 0.75,
          minWidth: 0,
          maxWidth: "100%",
          borderRadius: 1,
          border: 0,
          outline: "none",
          cursor: disabled ? "default" : "pointer",
          bgcolor: "transparent",
          textAlign: "left",
          color: textColor,
          "&:focus, &:focus-visible": { outline: "none" },
          "&:hover": {
            color: disabled ? textColor : "primary.main",
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
            color: "common.gray",
            cursor: disabled ? "default" : "pointer",
            "&:focus, &:focus-visible": { outline: "none" },
            "&:hover": { color: disabled ? "common.gray" : "primary.main" },
            "&:disabled": { opacity: 0.6 },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </Box>
      ) : null}
    </Box>
  );
}
