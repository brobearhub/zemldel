"use client";

import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { usePathname } from "next/navigation";
import { Header } from "@/widgets/header/ui";
import { Footer } from "@/widgets/footer/ui/Footer";
import { SITE_CONTENT_GAP_PX, SITE_HEADER_SPACER_PX } from "@/shared/config/site-layout";
import { CabinetChrome, CABINET_BOTTOM_NAV_HEIGHT_PX, getCabinetZone } from "@/widgets/cabinet-chrome";

type Props = {
  children: ReactNode;
};

export function SiteChrome({ children }: Props) {
  const pathname = usePathname();
  const zone = getCabinetZone(pathname);

  if (!zone) {
    return (
      <>
        <Box className="mui-fixed" sx={{ position: "fixed", left: 0, top: 0, width: "100%", zIndex: 1200 }}>
          <Header />
        </Box>
        {/* Единый зазор header → контент (см. SITE_HEADER_SPACER_PX). Страницы не дублируют pt сверху. */}
        <Box sx={{ height: { xs: SITE_HEADER_SPACER_PX.xs, sm: SITE_HEADER_SPACER_PX.sm } }} />
        {children}
        <Footer />
      </>
    );
  }

  return (
    <>
      <Box className="mui-fixed" sx={{ position: "fixed", left: 0, top: 0, width: "100%", zIndex: 1200 }}>
        <CabinetChrome />
      </Box>
      {/* На cabinet routes chrome фиксирован, поэтому нужен spacer. */}
      <Box sx={{ height: { xs: SITE_HEADER_SPACER_PX.xs, sm: SITE_HEADER_SPACER_PX.sm } }} />

      <Box
        sx={{
          pb: {
            xs: CABINET_BOTTOM_NAV_HEIGHT_PX + SITE_CONTENT_GAP_PX.xs,
            sm: CABINET_BOTTOM_NAV_HEIGHT_PX + SITE_CONTENT_GAP_PX.sm,
            md: 0,
          },
        }}
      >
        {children}
      </Box>
    </>
  );
}

