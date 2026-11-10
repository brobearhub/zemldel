import { createTheme } from "@mui/material";
import type { PaletteMode } from "@mui/material";
import { ruRU } from "@mui/material/locale";
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
import { breakpointValues, media } from "./breakpoints";
import { readableTypography } from "./typography";
import type {} from "@mui/x-date-pickers/themeAugmentation";

export { breakpointValues, media };

/**
 * Light brand colors from Sotheby's Motorsport screenshots.
 */
const LIGHT_BRAND = {
  sage: "#a0b4a0",
  sageLight: "#b3c3b3",
  sageDark: "#889988",
  /** Deeper muted sage for success — same family as primary, not MUI grass green. */
  sageSuccess: "#548a5c",
  /** Brand accent. Lives on `palette.accent`, separate from semantic `info`. */
  accent: "#FA5018",
  orange: "#FF4B14",
  cream: "#f0f0e6",
  paper: "#ffffff",
  ink: "#000000",
  /** Deep forest green for body copy. */
  forest: "#325e49",
  forestMuted: "#6e7471",
  /** `forestMuted` shifted toward cream for lower emphasis. */
  forestMutedLight: "#9c9f9a",
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
    accent: { main: LIGHT_BRAND.accent, contrastText: common.white },
    success: { main: LIGHT_BRAND.sageSuccess, contrastText: LIGHT_BRAND.cream },
    warning: { main: lime[900], contrastText: common.white },
    error: { main: red[600], contrastText: common.white },
    divider: LIGHT_BRAND.disabledButton,
    textPrimary: LIGHT_BRAND.forest,
    textSecondary: LIGHT_BRAND.forestMuted,
    textSecondaryLight: LIGHT_BRAND.forestMutedLight,
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
    accent: { main: LIGHT_BRAND.accent, contrastText: common.white },
    success: { main: green[200], contrastText: grey[900] },
    warning: { main: lime[200], contrastText: grey[900] },
    error: { main: red[200], contrastText: grey[900] },
    divider: alpha(common.white, 0.12),
    textPrimary: brown[200],
    textSecondary: alpha(common.white, 0.5),
    textSecondaryLight: alpha(common.white, 0.35),
    footer: common.black,
    disabledButton: alpha(common.white, 0.12),
  },
} as const;

export function createAppTheme(
  mode: PaletteMode,
  { cssVariables = true }: { cssVariables?: boolean } = {},
) {
  const t = TOKENS[mode];

  return createTheme(
    {
      cssVariables,
      breakpoints: { values: breakpointValues },
      media,
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
        accent: t.accent,
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
          secondaryLight: t.textSecondaryLight,
        },
        action: {
          disabledBackground: t.disabledButton,
        },
      },
      custom: {
        textColors: {
          footer: mode === "light" ? t.textPrimary : common.white,
        },
        bgColors: {
          primary: t.bg,
          header: t.header,
          secondary: t.footer,
        },
        gradients: {
          sunset: `linear-gradient(120deg, ${alpha(t.primary.light, 0.18)} 0%, ${alpha(
            t.primary.main,
            0.1,
          )} 35%, ${alpha(t.secondary.main, 0.06)} 100%)`,
          sky: "none",
          glass: `linear-gradient(180deg, ${alpha(t.primary.main, 0.06)} 0%, ${alpha(
            t.primary.main,
            0.02,
          )} 100%)`,
          header: `linear-gradient(170deg, ${alpha(t.primary.light, 0.2)} 0%, ${alpha(
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
        },
      },
      shape: { borderRadius: 8 },
      typography: readableTypography,
      components: {
        MuiButtonBase: {
          styleOverrides: {
            root: ({ theme }) => ({
              "&.Mui-focusVisible": {
                outline: `2px solid ${theme.palette.text.primary}`,
                outlineOffset: 3,
                boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
              },
            }),
          },
        },
        MuiInputLabel: {
          defaultProps: {
            shrink: true,
          },
          styleOverrides: {
            root: ({ theme }) => ({
              fontSize: "1rem",
              lineHeight: 1.5,
              fontWeight: 600,
              color: theme.palette.text.secondary,
              position: "static",
              transform: "none",
              maxWidth: "100%",
              marginBottom: 8,
              whiteSpace: "normal",
              overflow: "visible",
              textOverflow: "clip",
              pointerEvents: "auto",
              // Sage primary is too pale for small label text on a white field.
              // Keep error/disabled states and contextual glass-form colors.
              "&.Mui-focused:where(:not(.Mui-error, .Mui-disabled))": {
                color: theme.palette.text.primary,
              },
            }),
            outlined: {
              transform: "none",
              "&.MuiInputLabel-shrink": {
                transform: "none",
              },
            },
            filled: {
              "&.MuiInputLabel-shrink": {
                transform: "none",
              },
            },
            standard: {
              "&.MuiInputLabel-shrink": {
                transform: "none",
              },
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              "&:has(.MuiDateCalendar-root, .MuiTimeClock-root)": {
                margin: 8,
                maxWidth: "calc(100% - 16px)",
              },
            },
          },
        },
        MuiDialogContent: {
          styleOverrides: {
            root: ({ theme }) => ({
              // Keep a readable gap between the dialog title and form labels.
              ".MuiDialogTitle-root + &:has(.MuiInputLabel-root)": {
                paddingTop: theme.spacing(2),
              },
            }),
          },
        },
        MuiCssBaseline: {
          styleOverrides: (theme) => {
            const autofillBg = theme.palette.background.default;

            return {
              html: {
                backgroundColor: theme.palette.background.default,
              },
              body: {
                // Improve font rendering on dark backgrounds.
                WebkitFontSmoothing: "antialiased",
                MozOsxFontSmoothing: "grayscale",
                backgroundColor: theme.palette.background.default,
                overflowWrap: "anywhere",
              },
              "button, input, textarea, select": {
                fontFamily: "inherit",
              },
              // MUI fields already show focus on their border or underline.
              ":where(a, button, input, textarea, select, [contenteditable='true'], [role='button'], [role='tab'], [tabindex]):focus-visible:not(.MuiInputBase-input, .MuiPickersSectionList-root, .MuiPickersSectionList-sectionContent)":
                {
                  outline: `2px solid ${theme.palette.text.primary}`,
                  outlineOffset: 3,
                  boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                },
              // Prevent browser autofill from painting blue/yellow backgrounds.
              // Kept global and minimal to preserve default MUI label/padding behavior.
              "input:-webkit-autofill, textarea:-webkit-autofill, select:-webkit-autofill, .MuiInputBase-input:-webkit-autofill, .MuiOutlinedInput-input:-webkit-autofill":
                {
                  WebkitBoxShadow: `0 0 0 1000px ${autofillBg} inset !important`,
                  boxShadow: `0 0 0 1000px ${autofillBg} inset !important`,
                  WebkitTextFillColor: `${theme.palette.text.primary} !important`,
                  caretColor: `${theme.palette.text.primary} !important`,
                  transition: "background-color 9999s ease-out 0s",
                },
              "input:-webkit-autofill:focus, textarea:-webkit-autofill:focus, select:-webkit-autofill:focus, .MuiInputBase-input:-webkit-autofill:focus, .MuiOutlinedInput-input:-webkit-autofill:focus":
                {
                  WebkitBoxShadow: `0 0 0 1000px ${autofillBg} inset !important`,
                  boxShadow: `0 0 0 1000px ${autofillBg} inset !important`,
                },
            };
          },
        },
        MuiButton: {
          styleOverrides: {
            root: ({ theme }) => ({
              textTransform: "none",
              borderRadius: theme.shape.borderRadius,
              fontWeight: 700,
              fontSize: "1rem",
              lineHeight: 1.5,
              minHeight: 48,
              padding: "12px 20px",
              whiteSpace: "normal",
              overflowWrap: "anywhere",
              "&.Mui-focusVisible": {
                outline: `2px solid ${theme.palette.text.primary}`,
                outlineOffset: 3,
                boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
              },
            }),
            outlined: {
              borderWidth: 1,
              borderColor: "currentColor",
              "&.MuiButton-loading": {
                borderColor: "var(--variant-outlinedBorder, currentColor)",
                "& .MuiButton-loadingIndicator": {
                  color: "var(--variant-outlinedColor)",
                },
              },
            },
            contained: {
              boxShadow: "none",
              "&:hover": { boxShadow: "none" },
              "&.Mui-disabled:not(.MuiButton-loading)": {
                backgroundColor: t.disabledButton,
                color: t.textSecondary,
              },
              "&.MuiButton-loading": {
                backgroundColor: "var(--variant-containedBg)",
                "& .MuiButton-loadingIndicator": {
                  color: "var(--variant-containedColor)",
                },
              },
            },
            text: {
              "&.MuiButton-loading .MuiButton-loadingIndicator": {
                color: "var(--variant-textColor)",
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
              backgroundColor: "var(--mui-custom-bgColors-header)",
              color: "var(--mui-palette-text-primary)",
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
                color: theme.palette.text.primary,
                textDecorationColor: "currentColor",
              },
            }),
          },
        },
        MuiChip: {
          styleOverrides: {
            root: ({ theme, ownerState }) => ({
              borderRadius: 999,
              fontWeight: 600,
              fontSize: "1rem",
              height: "auto",
              minHeight: 36,
              maxWidth: "100%",
              ...(ownerState.variant === "filled"
                ? {
                    border: "none",
                  }
                : {
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: alpha(theme.palette.primary.main, 0.06),
                  }),
            }),
            label: {
              whiteSpace: "normal",
              overflow: "visible",
              textOverflow: "clip",
              lineHeight: 1.5,
              paddingTop: 6,
              paddingBottom: 6,
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            root: ({ theme }) => ({
              borderRadius: theme.shape.borderRadius,
              minWidth: 44,
              minHeight: 44,
            }),
          },
        },
        MuiTooltip: {
          styleOverrides: {
            tooltip: ({ theme }) => ({
              fontSize: "1rem",
              lineHeight: 1.5,
              color: "#ffffff",
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
            root: ({ theme }) => ({
              borderRadius: theme.shape.borderRadius,
              backgroundColor: theme.palette.background.paper,
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.text.primary,
              },
              "&.Mui-focused:not(.Mui-error) .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.text.primary,
              },
            }),
            notchedOutline: ({ theme }) => ({
              borderColor: theme.palette.divider,
              "& legend": {
                fontSize: "1rem",
                display: "none",
              },
            }),
          },
        },
        MuiInputBase: {
          styleOverrides: {
            root: ({ ownerState }) => ({
              fontSize: ownerState.size === "small" ? "1rem" : "1.125rem",
              lineHeight: ownerState.size === "small" ? 1.4375 : 26 / 18,
            }),
            input: ({ theme }) => ({
              "&::placeholder": {
                color: theme.palette.text.secondary,
                opacity: 1,
              },
            }),
          },
        },
        MuiFilledInput: {
          styleOverrides: {
            input: {
              paddingTop: 14,
            },
          },
        },
        MuiDialogTitle: {
          styleOverrides: {
            root: {
              fontSize: "1.375rem",
              lineHeight: 30 / 22,
              fontWeight: 700,
            },
          },
        },
        MuiListSubheader: {
          styleOverrides: {
            root: {
              fontSize: "1rem",
              lineHeight: 1.5,
              paddingTop: 12,
              paddingBottom: 12,
            },
          },
        },
        MuiPaginationItem: {
          styleOverrides: {
            root: {
              fontSize: "1rem",
              minWidth: 44,
              minHeight: 44,
            },
          },
        },
        MuiTablePagination: {
          styleOverrides: {
            selectLabel: { fontSize: "1rem" },
            displayedRows: { fontSize: "1rem" },
          },
        },
        MuiPickerDay: {
          styleOverrides: {
            root: { fontSize: "1rem" },
          },
        },
        MuiDatePicker: {
          defaultProps: {
            desktopModeMediaQuery: "(min-width:600px)",
          },
        },
        MuiDateTimePicker: {
          defaultProps: {
            desktopModeMediaQuery: "(min-width:600px)",
          },
        },
        MuiDateCalendar: {
          styleOverrides: {
            root: {
              maxWidth: "100%",
            },
          },
        },
        MuiDayCalendar: {
          styleOverrides: {
            weekDayLabel: { fontSize: "1rem" },
          },
        },
        MuiPickersInputBase: {
          styleOverrides: {
            root: ({ ownerState }) => ({
              fontSize: ownerState.inputSize === "small" ? "1rem" : "1.125rem",
              lineHeight: ownerState.inputSize === "small" ? 1.4375 : 26 / 18,
            }),
            sectionsContainer: ({ theme, ownerState }) => ({
              opacity: 1,
              color: ownerState.isFieldValueEmpty
                ? theme.palette.text.secondary
                : "inherit",
            }),
          },
        },
        MuiPickersOutlinedInput: {
          styleOverrides: {
            root: ({ theme }) => ({
              backgroundColor: theme.palette.background.paper,
              "&.Mui-focused:not(.Mui-error) .MuiPickersOutlinedInput-notchedOutline": {
                borderColor: theme.palette.text.primary,
              },
            }),
            notchedOutline: ({ theme }) => ({
              borderColor: theme.palette.divider,
              "& legend": { fontSize: "1rem", display: "none" },
            }),
          },
        },
        MuiFormHelperText: {
          styleOverrides: {
            root: {
              fontSize: "1rem",
              lineHeight: 1.5,
              marginTop: 8,
            },
          },
        },
        MuiFormControlLabel: {
          styleOverrides: {
            root: {
              minHeight: 44,
            },
            label: {
              fontSize: "1rem",
              lineHeight: 1.5,
            },
          },
        },
        MuiRadio: {
          styleOverrides: {
            root: ({ theme }) => ({
              color: theme.palette.divider,
            }),
          },
        },
        MuiCheckbox: {
          styleOverrides: {
            root: ({ theme }) => ({
              color: theme.palette.divider,
            }),
          },
        },
        MuiMenuItem: {
          styleOverrides: {
            root: {
              fontSize: "1rem",
              lineHeight: 1.5,
              minHeight: 48,
              whiteSpace: "normal",
            },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              fontSize: "1rem",
              lineHeight: 1.5,
            },
          },
        },
        MuiTab: {
          styleOverrides: {
            root: {
              color: t.primary.main,
              fontSize: "1rem",
              lineHeight: 1.5,
              textTransform: "none",
              "&.Mui-selected": {
                color: t.textPrimary,
              },
            },
          },
        },
        MuiAlert: {
          styleOverrides: {
            message: {
              fontSize: "1rem",
              lineHeight: 1.5,
              minWidth: 0,
            },
          },
        },
        MuiBadge: {
          styleOverrides: {
            badge: {
              fontSize: "1rem",
              lineHeight: 1.5,
              minWidth: 26,
              height: "auto",
              padding: "1px 6px",
            },
          },
        },
        MuiAvatar: {
          styleOverrides: {
            root: ({ theme }) => ({
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              fontSize: "1rem",
              fontWeight: 600,
            }),
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: ({ theme }) => ({
              backgroundColor: theme.palette.background.paper,
              backgroundImage: "none",
            }),
            outlined: ({ theme }) => ({
              borderColor: alpha(theme.palette.text.primary, 0.1),
              backgroundImage: "none",
              boxShadow:
                theme.palette.mode === "light"
                  ? "0 10px 30px rgba(0,0,0,0.06)"
                  : "0 14px 50px rgba(0,0,0,0.40)",
            }),
          },
        },
        MuiToggleButton: {
          styleOverrides: {
            root: ({ theme }) => ({
              fontSize: "1rem",
              lineHeight: 1.5,
              minHeight: 48,
              fontWeight: 600,
              textTransform: "none",
              color: theme.palette.text.secondary,
              "&.Mui-selected": {
                color: theme.palette.text.primary,
              },
            }),
          },
        },
        MuiRating: {
          styleOverrides: {
            root: ({ theme }) => ({ color: theme.palette.warning.main }),
            iconEmpty: ({ theme }) => ({ color: theme.palette.text.secondary }),
          },
        },
      },
    },
    ruRU,
  );
}

export const appThemeTokens = TOKENS;
