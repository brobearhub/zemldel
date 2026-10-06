"use client";

import type { ReactNode } from "react";
import type { PaperProps, SxProps, Theme } from "@mui/material";
import { Paper } from "@mui/material";
import { alpha } from "@mui/material/styles";

export type RainGlassPaperProps = Omit<PaperProps, "sx" | "children"> & {
  children?: ReactNode;
  sx?: SxProps<Theme>;
  /** Цветовая схема валидации/ошибок для полей внутри (error=красный, warning=оранжевый). */
  validationTone?: "error" | "warning";
};

const baseSx: SxProps<Theme> = (theme) => {
  const isDark = theme.palette.mode === "dark";
  // Target look: static dark "glass" panel like in the reference screenshot.
  const glassBase = isDark
    ? alpha(theme.palette.background.paper, 0.66)
    : alpha(theme.palette.common.black, 0.40);
  const border = alpha(theme.palette.common.white, isDark ? 0.16 : 0.18);
  const topHighlight = alpha(theme.palette.common.white, isDark ? 0.12 : 0.14);
  const bottomShade = alpha(theme.palette.common.black, isDark ? 0.26 : 0.22);

  return {
    position: "relative",
    overflow: "hidden",
    backdropFilter: "blur(14px) saturate(140%)",
    WebkitBackdropFilter: "blur(14px) saturate(140%)",
    backgroundColor: glassBase,
    border: `1px solid ${border}`,
    boxShadow: isDark ? "0 18px 70px rgba(0,0,0,0.55)" : "0 18px 55px rgba(0,0,0,0.22)",
    color: alpha(theme.palette.common.white, isDark ? 0.90 : 0.92),

    "&::before": {
      content: '""',
      position: "absolute",
      inset: -2,
      borderRadius: "inherit",
      pointerEvents: "none",
      opacity: 1,
      backgroundImage: [
        // Soft internal gradient + a tiny bit of static "sheen" (no motion).
        `linear-gradient(180deg, ${topHighlight} 0%, ${alpha(theme.palette.common.white, 0)} 34%)`,
        `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0)} 55%, ${bottomShade} 100%)`,
      ].join(", "),
      backgroundBlendMode: "screen, multiply",
      filter: "blur(0.2px)",
    },

    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      pointerEvents: "none",
      opacity: 1,
      backgroundImage: [
        // Subtle sheen that slowly shifts.
        `radial-gradient(900px 260px at 12% -20%, ${alpha(
          theme.palette.common.white,
          isDark ? 0.14 : 0.18,
        )} 0%, ${alpha(theme.palette.common.white, 0)} 60%)`,
      ].join(", "),
      boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, isDark ? 0.10 : 0.16)}, inset 0 -1px 0 ${alpha(
        theme.palette.text.primary,
        isDark ? 0.18 : 0.08,
      )}`,
    },

    "& > *": {
      position: "relative",
    },

    // Make typical form content readable on a dark glass background.
    "& .MuiTypography-root": {
      color: "inherit",
    },
    "& .MuiInputLabel-root": {
      color: alpha(theme.palette.common.white, isDark ? 0.78 : 0.82),
      "&.Mui-focused": {
        color: alpha(theme.palette.common.white, isDark ? 0.88 : 0.90),
      },
    },
    "& .MuiOutlinedInput-root": {
      backgroundColor: alpha(theme.palette.common.white, isDark ? 0.06 : 0.08),
      "&:hover": {
        backgroundColor: alpha(theme.palette.common.white, isDark ? 0.08 : 0.10),
      },
      "&.Mui-focused": {
        backgroundColor: alpha(theme.palette.common.white, isDark ? 0.09 : 0.12),
      },
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: alpha(theme.palette.common.white, isDark ? 0.26 : 0.28),
      },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: alpha(theme.palette.common.white, isDark ? 0.36 : 0.38),
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: alpha(theme.palette.common.white, isDark ? 0.52 : 0.50),
      },
    },
    "& .MuiInputBase-input": {
      color: alpha(theme.palette.common.white, isDark ? 0.92 : 0.94),
    },
    // Browser autofill (Chrome/Safari) overrides MUI styles: keep the "glass" look consistent.
    "& input:-webkit-autofill, & textarea:-webkit-autofill, & select:-webkit-autofill, & input:-webkit-autofill:hover, & textarea:-webkit-autofill:hover, & select:-webkit-autofill:hover, & input:-webkit-autofill:focus, & textarea:-webkit-autofill:focus, & select:-webkit-autofill:focus, & input:-webkit-autofill:active, & textarea:-webkit-autofill:active, & select:-webkit-autofill:active": {
      WebkitTextFillColor: `${alpha(theme.palette.common.white, isDark ? 0.92 : 0.94)} !important`,
      caretColor: `${alpha(theme.palette.common.white, isDark ? 0.92 : 0.94)} !important`,
      WebkitBoxShadow: `0 0 0px 1000px ${alpha(theme.palette.common.white, isDark ? 0.06 : 0.08)} inset !important`,
      boxShadow: `0 0 0px 1000px ${alpha(theme.palette.common.white, isDark ? 0.06 : 0.08)} inset !important`,
      transition: "background-color 9999s ease-out 0s",
    },
    // Chrome internal states (non-standard, but fixes the white flash while picking autofill suggestions).
    "& input:-internal-autofill-selected, & input:-internal-autofill-previewed": {
      WebkitTextFillColor: `${alpha(theme.palette.common.white, isDark ? 0.92 : 0.94)} !important`,
      caretColor: `${alpha(theme.palette.common.white, isDark ? 0.92 : 0.94)} !important`,
      WebkitBoxShadow: `0 0 0px 1000px ${alpha(theme.palette.common.white, isDark ? 0.06 : 0.08)} inset !important`,
      boxShadow: `0 0 0px 1000px ${alpha(theme.palette.common.white, isDark ? 0.06 : 0.08)} inset !important`,
    },
    // Firefox autofill.
    "& input:-moz-autofill, & textarea:-moz-autofill, & select:-moz-autofill": {
      caretColor: `${alpha(theme.palette.common.white, isDark ? 0.92 : 0.94)} !important`,
      boxShadow: `0 0 0px 1000px ${alpha(theme.palette.common.white, isDark ? 0.06 : 0.08)} inset !important`,
    },
    "& .MuiFormHelperText-root": {
      color: alpha(theme.palette.common.white, isDark ? 0.64 : 0.68),
    },
    "& .MuiCheckbox-root": {
      color: alpha(theme.palette.common.white, isDark ? 0.78 : 0.82),
      "&.Mui-checked": {
        color: alpha(theme.palette.common.white, isDark ? 0.92 : 0.94),
      },
    },
    "& a": {
      color: "inherit",
    },

    // Intentionally no animations: reference effect is static.
  };
};

export function RainGlassPaper({
  children,
  sx,
  elevation = 10,
  variant,
  validationTone = "error",
  ...paperProps
}: RainGlassPaperProps) {
  const validationSx: SxProps<Theme> = (theme) => {
    const tone = theme.palette[validationTone].main;
    return {
      "& .MuiFormHelperText-root.Mui-error": { color: tone },
      "& .MuiInputLabel-root.Mui-error": { color: tone },
      "& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: tone },
      "& .MuiOutlinedInput-root.Mui-error:hover .MuiOutlinedInput-notchedOutline": { borderColor: tone },
      "& .MuiOutlinedInput-root.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: tone },
    };
  };

  const mergedSx: SxProps<Theme> = sx
    ? Array.isArray(sx)
      ? [baseSx, validationSx, ...sx]
      : [baseSx, validationSx, sx]
    : [baseSx, validationSx];

  return (
    <Paper elevation={elevation} variant={variant} sx={mergedSx} {...paperProps}>
      {children}
    </Paper>
  );
}

