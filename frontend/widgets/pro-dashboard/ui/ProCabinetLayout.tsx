import { PlanStatusBanner } from "@/widgets/billing/PlanStatusBanner";
import type { ReactNode } from "react";
import { Box, Container } from "@mui/material";
import { sitePageContainerSx } from "@/shared/config/site-layout";
import { ProSidebarSlot } from "./ProSidebarSlot";

type Props = {
  children: ReactNode;
  providerName: string;
};

export function ProCabinetLayout({ children, providerName }: Props) {
  return (
    <main>
      <Container maxWidth={false} disableGutters sx={sitePageContainerSx}>
        <Box
          component="aside"
          aria-label="Разделы кабинета исполнителя"
          sx={{
            display: { xs: "none", tablet: "block" },
            position: "fixed",
            top: 0,
            left: 0,
            width: "var(--pro-sidebar-width, 240px)",
            height: "100dvh",
            overflowY: "auto",
            zIndex: 1301,
          }}
        >
          <ProSidebarSlot providerName={providerName} />
        </Box>
        <Box
          sx={{
            minWidth: 0,
            ml: { tablet: "var(--pro-sidebar-width, 240px)" },
            px: { xs: 2, tablet: 4 },
          }}
        >
          <PlanStatusBanner />
          {children}
        </Box>
      </Container>
    </main>
  );
}
