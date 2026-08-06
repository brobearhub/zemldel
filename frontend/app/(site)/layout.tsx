import type { ReactNode } from "react";
import { Header } from "@/widgets/header/ui";
import { Footer } from "@/widgets/footer/ui/Footer";
import { Box } from "@mui/material";
import { SITE_HEADER_SPACER_PX } from "@/shared/config/site-layout";

interface Props {
  readonly children: ReactNode;
}

export default function SiteLayout({ children }: Props) {
  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <Box className="mui-fixed" sx={{ position: "fixed", left: 0, top: 0, width: "100%", zIndex: 1200 }}>
        <Header />
      </Box>
      {/* Единый зазор header → контент (см. SITE_HEADER_SPACER_PX). Страницы не дублируют pt сверху. */}
      <Box sx={{ height: { xs: SITE_HEADER_SPACER_PX.xs, sm: SITE_HEADER_SPACER_PX.sm } }} />
      {children}
      <Footer />
    </Box>
  );
}
