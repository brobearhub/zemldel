/** Sign-in and sign-up keep their form styling while using the selected palette. */
import { createTheme } from "@mui/material";
import type { PaletteMode } from "@mui/material";
import { ruRU } from "@mui/material/locale";
import { alpha } from "@mui/material/styles";
import { breakpointValues, media } from "./breakpoints";
import { createAppTheme } from "./createAppTheme";
import type { DarkPaletteId } from "./dark-palettes";
import { readableTypography } from "./typography";

export { breakpointValues, media };

export function createLegacyAuthTheme(
  mode: PaletteMode,
  options: { darkPalette?: DarkPaletteId } = {},
) {
  const appTheme = createAppTheme(mode, { ...options, cssVariables: false });

  return createTheme(
    {
      cssVariables: true,
      breakpoints: { values: breakpointValues },
      media,
      palette: appTheme.palette,
      custom: {
        ...appTheme.custom,
        preserveAuthAppearance: true,
      },
      shape: { borderRadius: 8 },
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
        MuiInputLabel: {
          styleOverrides: {
            root: ({ theme }) => ({
              // Sage primary is too pale for small label text on a white field.
              // Keep error/disabled states and contextual glass-form colors.
              "&.Mui-focused:where(:not(.Mui-error, .Mui-disabled))": {
                color: theme.palette.text.primary,
              },
            }),
          },
        },
        MuiDialogContent: {
          styleOverrides: {
            root: ({ theme }) => ({
              // MUI removes this padding after DialogTitle. Floating labels then
              // extend above the scroll container and get clipped on focus/value.
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
              },
              "button:focus, button:focus-visible, [role='button']:focus, [role='button']:focus-visible":
                {
                  outline: "none",
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
              fontWeight: 800,
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
                backgroundColor: appTheme.palette.action.disabledBackground,
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
              ...readableTypography.body1,
              "& .MuiTypography-body2": {
                lineHeight: readableTypography.body2.lineHeight,
              },
              backgroundImage: "none",
              backgroundColor: theme.custom.bgColors.header,
              color: theme.palette.text.primary,
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
            root: ({ theme }) => ({
              borderRadius: theme.shape.borderRadius,
            }),
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
            root: ({ theme }) => ({
              borderRadius: theme.shape.borderRadius,
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
              backgroundImage: theme.custom.gradients.glass,
              boxShadow:
                theme.palette.mode === "light"
                  ? "0 10px 30px rgba(0,0,0,0.06)"
                  : "0 14px 50px rgba(0,0,0,0.40)",
            }),
          },
        },
      },
    },
    ruRU,
  );
}
