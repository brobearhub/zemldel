/** Shared readable type scale. Values are rem so browser text settings are respected. */
export const readableTypography = {
  fontFamily: "var(--font-nunito-sans)",
  fontSize: 16,
  fontWeightRegular: 400,
  fontWeightMedium: 600,
  fontWeightBold: 700,
  h1: {
    fontSize: "2rem",
    lineHeight: 1.25,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    "@media (min-width:900px)": {
      fontSize: "3rem",
      lineHeight: 58 / 48,
    },
  },
  h2: {
    fontSize: "1.625rem",
    lineHeight: 34 / 26,
    fontWeight: 700,
    letterSpacing: "-0.015em",
    "@media (min-width:900px)": {
      fontSize: "2rem",
      lineHeight: 42 / 32,
    },
  },
  h3: {
    fontSize: "1.375rem",
    lineHeight: 30 / 22,
    fontWeight: 700,
    "@media (min-width:900px)": {
      fontSize: "1.5rem",
      lineHeight: 32 / 24,
    },
  },
  h4: { fontSize: "1.375rem", lineHeight: 30 / 22, fontWeight: 700 },
  h5: { fontSize: "1.25rem", lineHeight: 1.4, fontWeight: 700 },
  h6: { fontSize: "1.125rem", lineHeight: 1.5, fontWeight: 700 },
  subtitle1: { fontSize: "1.125rem", lineHeight: 1.5, fontWeight: 600 },
  subtitle2: { fontSize: "1rem", lineHeight: 1.5, fontWeight: 600 },
  body1: { fontSize: "1.125rem", lineHeight: 30 / 18 },
  body2: { fontSize: "1rem", lineHeight: 1.5 },
  caption: { fontSize: "1rem", lineHeight: 1.5 },
  overline: {
    fontSize: "1rem",
    lineHeight: 1.5,
    fontWeight: 600,
    letterSpacing: "0.02em",
    textTransform: "none" as const,
  },
  button: {
    fontSize: "1rem",
    lineHeight: 1.5,
    fontWeight: 700,
    textTransform: "none" as const,
  },
};
