"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { Box } from "@mui/material";
import { usePathname } from "next/navigation";
import { CabinetDesktopSidebar } from "@/widgets/cabinet-chrome/ui/CabinetDesktopSidebar";
import { SiteNavigation } from "@/widgets/mobile-navigation/ui/SiteNavigation";
import { Header } from "@/widgets/header/ui";
import { AuthFooter } from "@/widgets/footer/ui/AuthFooter";
import { Footer } from "@/widgets/footer/ui/Footer";
import {
  isFullBleedAuthPath,
  SITE_HEADER_HEIGHT_PX,
  SITE_HEADER_SPACER_PX,
} from "@/shared/config/site-layout";
import { rememberInternalNav } from "@/shared/lib/internal-nav-history";
import { CabinetChrome, getCabinetZone } from "@/widgets/cabinet-chrome";
import { CabinetSidebarProvider } from "@/shared/ui/CabinetSidebarContext";
import { resolveAccountKind } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import { isPublicSidebarRoute } from "@/widgets/cabinet-chrome/lib/is-public-sidebar-route";

type Props = {
  children: ReactNode;
};

function SkipLink() {
  return (
    <Box
      component="a"
      href="#main-content"
      sx={{
        position: "fixed",
        left: 8,
        top: 8,
        maxWidth: "calc(100% - 16px)",
        transform: "translateY(calc(-100% - 16px))",
        zIndex: 2000,
        px: 1.5,
        py: 1,
        bgcolor: "background.paper",
        color: "text.primary",
        "&:focus": {
          transform: "none",
        },
      }}
    >
      Перейти к содержимому
    </Box>
  );
}

export function SiteChrome({ children }: Props) {
  return (
    <SiteNavigation>
      <CabinetSidebarProvider>
        <SiteChromeContent>{children}</SiteChromeContent>
      </CabinetSidebarProvider>
    </SiteNavigation>
  );
}

function SiteChromeContent({ children }: Props) {
  const pathname = usePathname();
  const zone = getCabinetZone(pathname);
  const chatBasePath = zone === "profile" ? "/profile/chats" : "/pro/chats";
  const isChats =
    pathname === chatBasePath || pathname.startsWith(`${chatBasePath}/`);
  const isChatThread = pathname.startsWith(`${chatBasePath}/`);
  const fullBleedAuth = isFullBleedAuthPath(pathname);
  const isAbout = pathname === "/about";
  const publicSidebar = useAppSelector(
    (state) =>
      state.auth.status === "authenticated" &&
      resolveAccountKind(state.auth.user) === "PROVIDER" &&
      isPublicSidebarRoute(pathname),
  );

  // Why: пишем синхронно в render, чтобы «Назад» на услуге успел прочитать prev
  // до своего useEffect. Query не нужен: router.back() вернёт полный URL.
  rememberInternalNav(pathname);

  if (!zone) {
    // Auth: контент не ниже экрана, футер появляется только при прокрутке.
    // minHeight, не height: длинная форма регистрации растёт и не наезжает на футер.
    if (fullBleedAuth) {
      return (
        <>
          <SkipLink />
          <Box
            className="mui-fixed"
            sx={{
              position: "fixed",
              left: 0,
              top: 0,
              width: "100%",
              zIndex: 1200,
            }}
          >
            <Header />
          </Box>
          <Box
            component="main"
            id="main-content"
            sx={{
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              minHeight: "100dvh",
            }}
          >
            {children}
          </Box>
          <AuthFooter />
        </>
      );
    }

    return (
      <Box
        sx={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          ml: publicSidebar
            ? { tablet: "var(--cabinet-sidebar-width, 26px)" }
            : undefined,
        }}
      >
        <SkipLink />
        <Box
          className="mui-fixed"
          sx={{
            position: "fixed",
            left: publicSidebar
              ? { xs: 0, tablet: "var(--cabinet-sidebar-width, 26px)" }
              : 0,
            top: 0,
            width: publicSidebar
              ? {
                  xs: "100%",
                  tablet: "calc(100% - var(--cabinet-sidebar-width, 26px))",
                }
              : "100%",
            zIndex: 1200,
            ...(publicSidebar && {
              "& > .MuiAppBar-root": {
                position: "static",
                left: "auto",
                width: "100%",
              },
            }),
          }}
        >
          <Header />
        </Box>
        {publicSidebar ? (
          <Suspense fallback={null}>
            <CabinetDesktopSidebar compactPublicPage />
          </Suspense>
        ) : null}
        {/* About starts directly below the header, including its 1px bottom border. */}
        <Box
          sx={{
            height: {
              xs: isAbout
                ? SITE_HEADER_HEIGHT_PX.xs + 1
                : SITE_HEADER_SPACER_PX.xs,
              sm: isAbout
                ? SITE_HEADER_HEIGHT_PX.sm + 1
                : SITE_HEADER_SPACER_PX.sm,
            },
          }}
        />
        <Box
          component="main"
          id="main-content"
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </Box>
        <Footer />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: isChats ? 0 : "100dvh",
        height: isChats ? "var(--chat-viewport-height, 100dvh)" : undefined,
        overflow: isChats ? "hidden" : undefined,
        position: isChatThread
          ? {
              xs: "fixed",
              tablet: "relative",
            }
          : undefined,
        top: isChatThread
          ? {
              xs: "var(--chat-viewport-top, 0px)",
              tablet: 0,
            }
          : undefined,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        pb: isChats
          ? 0
          : {
              xs: "calc(24px + env(safe-area-inset-bottom))",
              md: 0,
            },
      }}
    >
      <SkipLink />
      <Box
        className="mui-fixed"
        sx={{
          position: "fixed",
          left: 0,
          top: 0,
          width: "100%",
          zIndex: 1200,
          display: isChatThread
            ? {
                xs: "none",
                tablet: "block",
              }
            : undefined,
        }}
      >
        <Suspense
          fallback={
            <Box
              sx={{
                height: {
                  xs: SITE_HEADER_SPACER_PX.xs,
                  sm: SITE_HEADER_SPACER_PX.sm,
                },
              }}
            />
          }
        >
          <CabinetChrome />
        </Suspense>
      </Box>
      <Suspense fallback={null}>
        <CabinetDesktopSidebar />
      </Suspense>
      {/* The mobile thread owns its header; the inbox keeps the cabinet navigation. */}
      <Box
        sx={{
          flexShrink: 0,
          height: isChats
            ? {
                xs: isChatThread ? 0 : 60,
                tablet: SITE_HEADER_SPACER_PX.sm,
              }
            : {
                xs: SITE_HEADER_SPACER_PX.xs,
                sm: SITE_HEADER_SPACER_PX.sm,
              },
        }}
      />

      <Box
        component="main"
        id="main-content"
        sx={{
          flex: 1,
          ml: { tablet: "var(--cabinet-sidebar-width, 300px)" },
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
