"use client";

import type { ReactNode } from "react";
import type { PaperProps, SxProps, Theme } from "@mui/material";
import { Paper, useTheme } from "@mui/material";
import { LegacyAuthPaper } from "./LegacyAuthPaper";

export type RainGlassPaperProps = Omit<PaperProps, "sx" | "children"> & {
  children?: ReactNode;
  sx?: SxProps<Theme>;
  /** Цветовая схема валидации/ошибок для полей внутри (error=красный, warning=оранжевый). */
  validationTone?: "error" | "warning";
};

const baseSx: SxProps<Theme> = (theme) => ({
  position: "relative",
  backgroundColor: theme.palette.background.paper,
  backgroundImage: "none",
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.divider}`,
  "& .MuiTypography-root": {
    color: "inherit",
  },
  "& .MuiFormHelperText-root": {
    color: theme.palette.text.secondary,
  },
  "& .MuiInputAdornment-root .MuiIconButton-root": {
    color: theme.palette.text.primary,
  },
  "& a": {
    color: "inherit",
  },
});

export function RainGlassPaper({
  children,
  sx,
  elevation = 10,
  variant,
  validationTone = "error",
  ...paperProps
}: RainGlassPaperProps) {
  const legacyAuth = useTheme().custom?.preserveAuthAppearance === true;
  if (legacyAuth) {
    return (
      <LegacyAuthPaper
        {...paperProps}
        sx={sx}
        elevation={elevation}
        variant={variant}
        validationTone={validationTone}
      >
        {children}
      </LegacyAuthPaper>
    );
  }

  const validationSx: SxProps<Theme> = (theme) => {
    const tone = theme.palette[validationTone].main;
    return {
      "& .MuiFormHelperText-root.Mui-error": { color: tone },
      "& .MuiInputLabel-root.Mui-error": { color: tone },
      "& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline": {
        borderColor: tone,
      },
      "& .MuiOutlinedInput-root.Mui-error:hover .MuiOutlinedInput-notchedOutline":
        { borderColor: tone },
      "& .MuiOutlinedInput-root.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline":
        { borderColor: tone },
    };
  };

  const mergedSx: SxProps<Theme> = sx
    ? Array.isArray(sx)
      ? [baseSx, validationSx, ...sx]
      : [baseSx, validationSx, sx]
    : [baseSx, validationSx];

  return (
    <Paper
      elevation={elevation}
      variant={variant}
      sx={mergedSx}
      {...paperProps}
    >
      {children}
    </Paper>
  );
}
