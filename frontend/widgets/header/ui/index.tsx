"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { AppBar, Box, Toolbar } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { resolveAccountKind } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import { SITE_HEADER_HEIGHT_PX } from "@/shared/config/site-layout";
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
  const pathname = usePathname();
  const isAuthenticated = useAppSelector(
    (state) => state.auth.status === "authenticated",
  );
  const isProviderAccount = useAppSelector(
    (state) => resolveAccountKind(state.auth.user) === "PROVIDER",
  );
  const isWide = useMediaQuery((theme) => theme.breakpoints.up("tablet"));
  const hideHeaderCity = pathname === "/signup";
  const showCatalogNav =
    pathname === "/" || pathname === "/lands" || pathname.startsWith("/lands/");

  if (
    (showCatalogNav || pathname === "/about") &&
    isAuthenticated &&
    isProviderAccount &&
    isWide
  ) {
    return (
      <Suspense fallback={null}>
        <CabinetDesktopBar
          items={PROVIDER_HEADER_NAV}
          navigation={showCatalogNav ? <HeaderCatalogNav /> : undefined}
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
          display: showCatalogNav ? "grid" : "flex",
          gridTemplateColumns: showCatalogNav
            ? "auto minmax(0, 1fr) auto"
            : undefined,
          flexWrap: "nowrap",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          gap: 1,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            minWidth: 0,
            flex: "0 0 auto",
            ...(showCatalogNav && {
              "& img": { width: { xs: 44, tablet: 100 } },
            }),
          }}
        >
          <HeaderLogo />
          <Box sx={{ display: { xs: "none", tablet: "flex" } }}>
            {hideHeaderCity ? null : <HeaderCity />}
          </Box>
        </Box>

        {showCatalogNav ? (
          <Box
            sx={{
              minWidth: 0,
            }}
          >
            <HeaderCatalogNav />
          </Box>
        ) : null}

        <Box
          sx={{
            display: { xs: "none", tablet: "flex" },
            alignItems: "center",
            flex: "0 0 auto",
          }}
        >
          {isAuthenticated && !isProviderAccount ? (
            <CabinetHeaderStatus
              notification={<CustomerNotificationsButton />}
            />
          ) : null}
          <HeaderNav showLandLink={!showCatalogNav} />
        </Box>

        <Box
          sx={{
            display: { xs: "flex", tablet: "none" },
            alignItems: "center",
            gap: 0.5,
            ml: "auto",
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
