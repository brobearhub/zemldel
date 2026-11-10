"use client";

import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const isChats =
    pathname === "/pro/chats" || pathname.startsWith("/pro/chats/");
  return (
    <Box
      sx={{
        height: isChats ? "100%" : undefined,
        minHeight: 0,
      }}
    >
      <Container
        maxWidth={false}
        disableGutters
        sx={
          isChats
            ? {
                height: "100%",
                minHeight: 0,
                pb: 0,
              }
            : sitePageContainerSx
        }
      >
        <Box
          component="aside"
          aria-label="Разделы кабинета исполнителя"
          sx={{
            display: {
              xs: "none",
              tablet: "block",
            },
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
            height: isChats ? "100%" : undefined,
            minHeight: 0,
            display: isChats ? "flex" : undefined,
            flexDirection: "column",
            ml: {
              tablet: "var(--pro-sidebar-width, 240px)",
            },
            px: {
              xs: isChats ? 0 : 2,
              tablet: 4,
            },
          }}
        >
          <PlanStatusBanner />
          {children}
        </Box>
      </Container>
    </Box>
  );
}
