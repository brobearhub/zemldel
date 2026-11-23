"use client";

import { Suspense } from "react";
import { AppBar, Box, Toolbar } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { resolveAccountKind } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import {
  SITE_CATALOG_HEADER_COLUMNS,
  SITE_HEADER_HEIGHT_PX,
} from "@/shared/config/site-layout";
import { PROVIDER_HEADER_NAV } from "@/widgets/cabinet-chrome/model/nav-config";
import { CabinetDesktopBar } from "@/widgets/cabinet-chrome/ui/CabinetDesktopBar";
import { HeaderLogo } from "./HeaderLogo";
import { HeaderNav } from "./HeaderNav";
import { HeaderCatalogNav } from "./HeaderCatalogNav";
import { HeaderCity } from "./HeaderCity";
import { MobileMenuButton } from "@/widgets/mobile-navigation/ui/MobileNavigation";
import { CustomerNotificationsButton } from "@/widgets/cabinet-chrome/ui/CustomerNotificationsButton";
import { CabinetHeaderStatus } from "@/widgets/cabinet-chrome/ui/CabinetHeaderStatus";

export const Header = () => {
  const isAuthenticated = useAppSelector(
    (state) => state.auth.status === "authenticated",
  );
  const isProviderAccount = useAppSelector(
    (state) => resolveAccountKind(state.auth.user) === "PROVIDER",
  );
  const isWide = useMediaQuery((theme) => theme.breakpoints.up("tablet"));

  if (isAuthenticated && isProviderAccount && isWide) {
    return (
      <Suspense fallback={null}>
        <CabinetDesktopBar
          items={PROVIDER_HEADER_NAV}
          navigation={<HeaderCatalogNav />}
          showSiteCity
          showProviderStatus
        />
      </Suspense>
    );
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
    >
      <Toolbar
        disableGutters
        sx={{
          px: { xs: 1.5, sm: 2 },
          height: {
            xs: SITE_HEADER_HEIGHT_PX.xs,
            sm: SITE_HEADER_HEIGHT_PX.sm,
          },
          minHeight: {
            xs: SITE_HEADER_HEIGHT_PX.xs,
            sm: SITE_HEADER_HEIGHT_PX.sm,
          },
          display: "grid",
          gridTemplateColumns: SITE_CATALOG_HEADER_COLUMNS,
          alignItems: "center",
          width: "100%",
          gap: 1,
          "@media (max-width: 359px)": {
            px: 0.5,
            columnGap: 0.5,
            "& nav a": { px: 0.25 },
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            minWidth: 0,
            "& img": { width: { xs: 44, tablet: 100 } },
          }}
        >
          <HeaderLogo />
          <Box
            sx={{
              display: { xs: "none", tablet: "flex" },
              minWidth: 0,
            }}
          >
            <HeaderCity />
          </Box>
        </Box>

        <HeaderCatalogNav />

        <Box
          sx={{
            display: { xs: "none", tablet: "flex" },
            alignItems: "center",
            justifySelf: "end",
          }}
        >
          {isAuthenticated && !isProviderAccount ? (
            <CabinetHeaderStatus
              notification={<CustomerNotificationsButton />}
            />
          ) : null}
          <HeaderNav />
        </Box>

        <Box
          sx={{
            display: { xs: "flex", tablet: "none" },
            alignItems: "center",
            gap: 0.5,
            justifySelf: "end",
          }}
        >
          {isAuthenticated && !isProviderAccount ? (
            <CustomerNotificationsButton />
          ) : null}
          <MobileMenuButton />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export { HeaderCity } from "./HeaderCity";
