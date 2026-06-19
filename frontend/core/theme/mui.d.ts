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
        /** Warm gold → orange → teal → deep navy */
        sunset: string;
        /** Subtle teal-to-navy atmospheric gradient */
        sky: string;
        /** Glassy overlay for translucent surfaces */
        glass: string;
        /** Header: visible gradient (light beige → warmer beige in light; subtle tint in dark) */
        header: string;
        /** Footer: visible gradient (light beige → warmer beige in light; subtle tint in dark) */
        footer: string;
      };
      bgColors: {
        /** Background color for dark mode */
        primary: string;
        /** Background color for light mode */
        secondary: string;
      };
    };
  }

  // allow configuration using `createTheme`
  interface ThemeOptions {
    custom?: Theme["custom"];
  }
}

