import type {} from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface BreakpointOverrides {
    xs: true;
    sm: true;
    md: true;
    lg: true;
    xl: true;
    xxl: true;
  }

  interface CommonColors {
    /** Neutral gray for borders, muted chrome, etc. */
    gray: string;
  }

  interface Theme {
    custom: {
      gradients: {
        /** Sage → cream atmospheric gradient */
        sunset: string;
        /** Subtle atmospheric gradient */
        sky: string;
        /** Glassy overlay for translucent surfaces */
        glass: string;
        /** Header: visible gradient (light beige → warmer beige in light; subtle tint in dark) */
        header: string;
        /** Footer: visible gradient (light beige → warmer beige in light; subtle tint in dark) */
        footer: string;
      };
      bgColors: {
        /** Page background (`background.default`). */
        primary: string;
        /** Header chrome (cream in light). */
        header: string;
        /** Footer chrome (sage in light). */
        secondary: string;
      };
    };
  }

  // allow configuration using `createTheme`
  interface ThemeOptions {
    custom?: Theme["custom"];
  }
}

