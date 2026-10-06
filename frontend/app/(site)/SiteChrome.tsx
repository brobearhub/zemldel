"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { Box } from "@mui/material";
import { usePathname } from "next/navigation";
import { Header } from "@/widgets/header/ui";
import { Footer } from "@/widgets/footer/ui/Footer";
import {
  isFullBleedAuthPath,
  SITE_CONTENT_GAP_PX,
  SITE_HEADER_SPACER_PX,
} from "@/shared/config/site-layout";
import { rememberInternalNav } from "@/shared/lib/internal-nav-history";
import { CabinetChrome, CABINET_BOTTOM_NAV_HEIGHT_PX, getCabinetZone } from "@/widgets/cabinet-chrome";

type Props = {
  children: ReactNode;
};

export function SiteChrome({ children }: Props) {
  const pathname = usePathname();
  const zone = getCabinetZone(pathname);
  const fullBleedAuth = isFullBleedAuthPath(pathname);

  // Why: пишем синхронно в render, чтобы «Назад» на услуге успел прочитать prev
  // до своего useEffect. Query не нужен: router.back() вернёт полный URL.
  rememberInternalNav(pathname);

  if (!zone) {
    // Auth: на desktop контент занимает высоту экрана, а футер виден только при скролле.
    // На mobile высоту не фиксируем: футер идёт сразу за контентом.
    if (fullBleedAuth) {
      return (
        <>
          <Box className="mui-fixed" sx={{ position: "fixed", left: 0, top: 0, width: "100%", zIndex: 1200 }}>
            <Header />
          </Box>
          <Box
            component="main"
            sx={{
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              height: { xs: "auto", md: "100dvh" },
            }}
          >
            {children}
          </Box>
          <Footer />
        </>
      );
    }

    return (
      <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <Box className="mui-fixed" sx={{ position: "fixed", left: 0, top: 0, width: "100%", zIndex: 1200 }}>
          <Header />
        </Box>
        {/* Единый зазор header → контент (см. SITE_HEADER_SPACER_PX). Страницы не дублируют pt сверху. */}
        <Box sx={{ height: { xs: SITE_HEADER_SPACER_PX.xs, sm: SITE_HEADER_SPACER_PX.sm } }} />
        <Box component="main" sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {children}
        </Box>
        <Footer />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        pb: {
          xs: `calc(${CABINET_BOTTOM_NAV_HEIGHT_PX}px + ${SITE_CONTENT_GAP_PX.xs}px + env(safe-area-inset-bottom))`,
          sm: `calc(${CABINET_BOTTOM_NAV_HEIGHT_PX}px + ${SITE_CONTENT_GAP_PX.sm}px + env(safe-area-inset-bottom))`,
          md: 0,
        },
      }}
    >
      <Box className="mui-fixed" sx={{ position: "fixed", left: 0, top: 0, width: "100%", zIndex: 1200 }}>
        <Suspense fallback={<Box sx={{ height: { xs: SITE_HEADER_SPACER_PX.xs, sm: SITE_HEADER_SPACER_PX.sm } }} />}>
          <CabinetChrome />
        </Suspense>
      </Box>
      {/* На cabinet routes chrome фиксирован, поэтому нужен spacer. */}
      <Box sx={{ height: { xs: SITE_HEADER_SPACER_PX.xs, sm: SITE_HEADER_SPACER_PX.sm } }} />

      <Box component="main" sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
}

