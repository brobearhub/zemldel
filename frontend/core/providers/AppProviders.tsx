"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { CssBaseline, ThemeProvider } from "@mui/material";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { ColorModeProvider, useColorMode } from "@/core/theme/ColorModeContext";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { ReduxProvider } from "@/core/providers/ReduxProvider";
import { AuthProvider } from "@/core/providers/AuthProvider";
import { ConfirmProvider } from "@/shared/ui/confirm";

interface Props {
  readonly children: ReactNode;
}

const InnerProviders = ({ children }: Props) => {
  const { mode } = useColorMode();
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ConfirmProvider>{children}</ConfirmProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
};

export const AppProviders = ({ children }: Props) => {
  return (
    <ReduxProvider>
      <AuthProvider>
        <ColorModeProvider>
          <InnerProviders>{children}</InnerProviders>
        </ColorModeProvider>
      </AuthProvider>
    </ReduxProvider>
  );
};

