import { createTheme } from "@mui/material";
import type { PaletteMode } from "@mui/material";
import { alpha } from "@mui/material/styles";

/**
 * Single light theme (brand colors).
 */
const TOKENS = {
  light: {
    bg: "#F4F7F6",
    paper: "#FFFFFF",
    primary: {
      main: "#006E4D",
      light: "#11805E",
      dark: "#00523A",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#353438",
      light: "#5A5960",
      dark: "#232226",
      contrastText: "#FFFFFF",
    },
    info: { main: "#FA5018", contrastText: "#FFFFFF" },
    success: { main: "#2D7D46", contrastText: "#FFFFFF" },
    warning: { main: "#9A6B16", contrastText: "#FFFFFF" },
    error: { main: "#DC2626", contrastText: "#FFFFFF" },
    divider: "rgba(53, 52, 56, 0.12)",
    textPrimary: "#6A4E3A",
    textSecondary: "rgba(27, 26, 31, 0.65)",
  },
} as const;

export function createAppTheme(_mode: PaletteMode) {
  const t = TOKENS.light;
  const resolvedMode: PaletteMode = "light";

  return createTheme({
    cssVariables: true,
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536,
        xxl: 1920,
      },
    },
    palette: {
      mode: resolvedMode,
      common: {
        gray: "#a1a4a3",
      },
      primary: t.primary,
      secondary: t.secondary,
      info: {
        main: t.info.main,
        contrastText: t.info.contrastText,
      },
      success: { main: t.success.main, contrastText: t.success.contrastText },
      warning: {
        main: t.warning.main,
        contrastText: t.warning.contrastText,
      },
      error: { main: t.error.main, contrastText: t.error.contrastText },
      background: {
        default: t.bg,
        paper: t.paper,
      },
      divider: t.divider,
      text: {
        primary: t.textPrimary,
        secondary: t.textSecondary,
      },
    },
    custom: {
      bgColors: {
        primary: t.bg,
        secondary: t.secondary.main,
      },
      gradients: {
        sunset:
          `linear-gradient(120deg, ${alpha(t.primary.light, 0.18)} 0%, ${alpha(
            t.primary.main,
            0.10,
          )} 35%, ${alpha(t.secondary.main, 0.06)} 100%)`,
        sky:
          `radial-gradient(1200px 800px at 70% 35%, ${alpha(
            t.primary.light,
            0.22,
          )} 0%, ${alpha(t.info.main, 0.10)} 40%, ${alpha(t.bg, 0)} 70%)`,
        glass:
          `linear-gradient(180deg, ${alpha(t.primary.main, 0.06)} 0%, ${alpha(
            t.primary.main,
            0.02,
          )} 100%)`,
        header:
          `linear-gradient(170deg, ${alpha(t.primary.light, 0.20)} 0%, ${alpha(
            t.primary.main,
            0.12,
          )} 40%, ${alpha(t.secondary.main, 0.06)} 100%)`,
        footer:
          `linear-gradient(170deg, ${alpha(t.secondary.main, 0.94)} 0%, ${alpha(
            t.secondary.dark,
            0.98,
          )} 55%, ${alpha("#000000", 0.98)} 100%)`,
      }
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: "var(--font-nunito-sans)",
      h1: { fontWeight: 900, letterSpacing: "-0.03em" },
      h2: { fontWeight: 900, letterSpacing: "-0.02em" },
      h3: { fontWeight: 800, letterSpacing: "-0.015em" },
      h4: { fontWeight: 800, letterSpacing: "-0.01em" },
      h5: { fontWeight: 800 },
      h6: { fontWeight: 800 },
      button: { fontWeight: 800 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: (theme) => {
          const autofillBg = "#fff";

          return {
            body: {
              // Improve font rendering on dark backgrounds.
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
            },
            // Prevent browser autofill from painting blue/yellow backgrounds.
            // Kept global and minimal to preserve default MUI label/padding behavior.
            "input:-webkit-autofill, textarea:-webkit-autofill, select:-webkit-autofill, .MuiInputBase-input:-webkit-autofill, .MuiOutlinedInput-input:-webkit-autofill": {
              WebkitBoxShadow: `0 0 0 1000px ${autofillBg} inset !important`,
              boxShadow: `0 0 0 1000px ${autofillBg} inset !important`,
              WebkitTextFillColor: `${theme.palette.text.primary} !important`,
              caretColor: `${theme.palette.text.primary} !important`,
              transition: "background-color 9999s ease-out 0s",
            },
            "input:-webkit-autofill:focus, textarea:-webkit-autofill:focus, select:-webkit-autofill:focus, .MuiInputBase-input:-webkit-autofill:focus, .MuiOutlinedInput-input:-webkit-autofill:focus": {
              WebkitBoxShadow: `0 0 0 1000px ${autofillBg} inset !important`,
              boxShadow: `0 0 0 1000px ${autofillBg} inset !important`,
            },
          };
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 14,
            fontWeight: 800,
          },
          outlined: {
            borderWidth: 1,
            borderColor: "currentColor",
          },
          contained: {
            boxShadow: "none",
          },
          containedPrimary: {
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
          },
          containedSecondary: {
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: theme.custom.gradients.glass,
            backgroundColor: alpha(theme.palette.background.paper, 0.82),
            borderBottom: `1px solid ${theme.palette.divider}`,
            backdropFilter: "blur(14px)",
          }),
        },
      },
      MuiLink: {
        defaultProps: {
          underline: "hover",
        },
        styleOverrides: {
          root: ({ theme }) => ({
            color: "inherit",
            textDecorationThickness: "from-font",
            textUnderlineOffset: "0.18em",
            transition: "color 140ms ease, text-decoration-color 140ms ease",
            "&:hover": {
              color: theme.palette.secondary.main,
              textDecorationColor: alpha(theme.palette.secondary.main, 0.8),
            },
          }),
        },
      },
      MuiChip: {
        styleOverrides: {
          root: ({ theme, ownerState }) => ({
            borderRadius: 999,
            fontWeight: 700,
            ...(ownerState.variant === "filled"
              ? {
                  border: "none",
                }
              : {
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: alpha(theme.palette.primary.main, 0.06),
                }),
          }),
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 14,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: ({ theme }) => ({
            backgroundColor: alpha("#0B1220", 0.88),
            border: `1px solid ${alpha("#FFFFFF", 0.08)}`,
            backdropFilter: "blur(10px)",
          }),
          arrow: ({ theme }) => ({
            color: alpha("#0B1220", 0.88),
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 14,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
            backgroundImage: "none",
          }),
          outlined: ({ theme }) => ({
            borderColor: alpha(theme.palette.text.primary, 0.10),
            backgroundImage: theme.custom.gradients.glass,
            boxShadow:
              theme.palette.mode === "light"
                ? "0 10px 30px rgba(0,0,0,0.06)"
                : "0 14px 50px rgba(0,0,0,0.40)",
          }),
        },
      },
    },
  });
}

export const appThemeTokens = TOKENS;

