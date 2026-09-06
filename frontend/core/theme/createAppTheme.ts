import { createTheme } from "@mui/material";
import type { PaletteMode } from "@mui/material";
import {
  brown,
  common,
  deepOrange,
  green,
  grey,
  lime,
  red,
  teal,
} from "@mui/material/colors";
import { alpha } from "@mui/material/styles";

/**
 * Light brand colors from Sotheby's Motorsport screenshots.
 * Previous tokens: `frontend/docs/theme.md`.
 */
const LIGHT_BRAND = {
  sage: "#a0b4a0",
  sageLight: "#b3c3b3",
  sageDark: "#889988",
  /** Deeper muted sage for success — same family as primary, not MUI grass green. */
  sageSuccess: "#548a5c",
  orange: "#FF4B14",
  cream: "#f0f0e6",
  paper: "#ffffff",
  ink: "#000000",
  /** Deep forest green for body copy. */
  forest: "#325e49",
  forestMuted: "#6e7471",
  gray: "#757575",
  /** `rgba(0,0,0,.12)` flattened onto white (disabled button fill). */
  disabledButton: "#e0e0e0",
} as const;

/** Semantic palette → MUI primitives (Figma: light `hue/700`, dark `hue/200`). */
const TOKENS = {
  light: {
    bg: LIGHT_BRAND.cream,
    header: LIGHT_BRAND.cream,
    paper: LIGHT_BRAND.paper,
    gray: LIGHT_BRAND.gray,
    primary: {
      main: LIGHT_BRAND.sage,
      light: LIGHT_BRAND.sageLight,
      dark: LIGHT_BRAND.sageDark,
      contrastText: LIGHT_BRAND.ink,
    },
    secondary: {
      main: LIGHT_BRAND.ink,
      light: grey[800],
      dark: LIGHT_BRAND.ink,
      contrastText: common.white,
    },
    info: { main: LIGHT_BRAND.orange, contrastText: common.white },
    success: { main: LIGHT_BRAND.sageSuccess, contrastText: LIGHT_BRAND.cream },
    warning: { main: lime[900], contrastText: common.white },
    error: { main: red[600], contrastText: common.white },
    divider: LIGHT_BRAND.disabledButton,
    textPrimary: LIGHT_BRAND.forest,
    textSecondary: LIGHT_BRAND.forestMuted,
    footer: LIGHT_BRAND.sage,
    disabledButton: LIGHT_BRAND.disabledButton,
  },
  dark: {
    bg: grey[900],
    header: common.black,
    paper: grey[800],
    gray: grey[500],
    primary: {
      main: teal[200],
      light: teal[50],
      dark: teal[400],
      contrastText: grey[900],
    },
    secondary: {
      main: grey[200],
      light: grey[50],
      dark: grey[400],
      contrastText: grey[900],
    },
    info: { main: deepOrange[200], contrastText: grey[900] },
    success: { main: green[200], contrastText: grey[900] },
    warning: { main: lime[200], contrastText: grey[900] },
    error: { main: red[200], contrastText: grey[900] },
    divider: alpha(common.white, 0.12),
    textPrimary: brown[200],
    textSecondary: alpha(common.white, 0.5),
    footer: common.black,
    disabledButton: alpha(common.white, 0.12),
  },
} as const;

export function createAppTheme(mode: PaletteMode) {
  const t = TOKENS[mode];

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
      mode,
      common: {
        gray: t.gray,
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
      action: {
        disabledBackground: t.disabledButton,
      },
    },
    custom: {
      bgColors: {
        primary: t.bg,
        header: t.header,
        secondary: t.footer,
      },
      gradients: {
        sunset:
          `linear-gradient(120deg, ${alpha(t.primary.light, 0.18)} 0%, ${alpha(
            t.primary.main,
            0.10,
          )} 35%, ${alpha(t.secondary.main, 0.06)} 100%)`,
        sky: "none",
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
          mode === "light"
            ? t.footer
            : `linear-gradient(170deg, ${alpha(t.footer, 0.94)} 0%, ${alpha(
                t.footer,
                0.98,
              )} 55%, ${alpha(common.black, 0.98)} 100%)`,
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
          const autofillBg = theme.palette.background.paper;

          return {
            html: {
              backgroundColor: theme.palette.background.default,
            },
            body: {
              // Improve font rendering on dark backgrounds.
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
              backgroundColor: theme.palette.background.default,
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
            "&:hover": { boxShadow: "none" },
            "&.Mui-disabled": {
              backgroundColor: t.disabledButton,
            },
          },
        },
      },
      MuiAppBar: {
        defaultProps: {
          color: "inherit",
        },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: "none",
            backgroundColor: theme.custom.bgColors.header,
            color:
              theme.palette.mode === "light"
                ? theme.palette.text.primary
                : theme.palette.common.white,
            borderBottom: `1px solid ${theme.palette.divider}`,
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
              color: theme.palette.primary.dark,
              textDecorationColor: alpha(theme.palette.primary.dark, 0.8),
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

