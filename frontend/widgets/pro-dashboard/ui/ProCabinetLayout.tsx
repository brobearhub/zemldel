"use client";

import { useAppSelector } from "@/core/store/hooks";
import { getActiveMembership } from "@/core/auth/authorization";
import { usePathname } from "next/navigation";
import { PlanStatusBanner } from "@/widgets/billing/PlanStatusBanner";
import type { ReactNode } from "react";
import { Box, Container } from "@mui/material";
import { sitePageContainerSx } from "@/shared/config/site-layout";

type Props = {
  children: ReactNode;
  providerName: string;
};

export function ProCabinetLayout({ children }: Props) {
  const pathname = usePathname();
  const isEmployee = useAppSelector((state) => getActiveMembership(state.auth.user)?.role === "EMPLOYEE");
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
          sx={{
            minWidth: 0,
            height: isChats ? "100%" : undefined,
            minHeight: 0,
            display: isChats ? "flex" : undefined,
            flexDirection: "column",
            px: {
              xs: isChats ? 0 : 2,
              tablet: 4,
            },
          }}
        >
          {!isEmployee ? <PlanStatusBanner /> : null}
          {children}
        </Box>
      </Container>
    </Box>
  );
}
