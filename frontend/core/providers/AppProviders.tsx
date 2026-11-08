"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { CssBaseline, ThemeProvider } from "@mui/material";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { ColorModeProvider, useColorMode } from "@/core/theme/ColorModeContext";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { createLegacyAuthTheme } from "@/core/theme/legacyAuthTheme";
import { preservesAuthAppearance } from "@/shared/config/preserved-auth-appearance";
import { ReduxProvider } from "@/core/providers/ReduxProvider";
import { AuthProvider } from "@/core/providers/AuthProvider";
import { ConfirmProvider } from "@/shared/ui/confirm";
import { CitySelectProvider } from "@/features/select-city";

interface Props {
  readonly children: ReactNode;
}

const InnerProviders = ({ children }: Props) => {
  const { mode } = useColorMode();
  const legacyAuth = preservesAuthAppearance(usePathname());
  const theme = useMemo(
    () => (legacyAuth ? createLegacyAuthTheme(mode) : createAppTheme(mode)),
    [legacyAuth, mode],
  );

  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme} forceThemeRerender>
        <CssBaseline />
        <ConfirmProvider>
          <CitySelectProvider>{children}</CitySelectProvider>
        </ConfirmProvider>
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
