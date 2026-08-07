"use client";

import { AppBar, Box, Toolbar } from "@mui/material";
import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { CabinetNavItem as NavItem } from "@/widgets/cabinet-chrome/model/nav-config";
import { CabinetNavItem } from "@/widgets/cabinet-chrome/ui/CabinetNavItem";
import { HeaderLogo } from "@/widgets/header/ui/HeaderLogo";
import { ProfileMenu } from "@/widgets/header/ui/ProfileMenu";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";

type Props = {
  items: readonly NavItem[];
};

export function CabinetDesktopBar({ items }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { unreadByRequestId } = useChatSocket();

  const unreadTotal = useMemo(() => Object.values(unreadByRequestId).reduce((acc, v) => acc + v, 0), [unreadByRequestId]);
  const ctx = useMemo(() => ({ pathname, searchParams: new URLSearchParams(searchParams?.toString() ?? "") }), [pathname, searchParams]);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        backdropFilter: "blur(2px)",
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 0.5,
          height: { xs: 60, sm: 70 },
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          width: "100%",
          backgroundColor: "secondary.main",
          columnGap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifySelf: "start" }}>
          <HeaderLogo />
        </Box>

        <Box
          sx={{
            minWidth: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            justifySelf: "center",
            gap: 0.5,
            overflowX: "auto",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {items.map((item) => (
            <CabinetNavItem
              key={item.key}
              href={item.href}
              label={item.label}
              icon={item.icon}
              selected={item.isActive(ctx)}
              badge={item.badgeKind === "chatUnreadTotal" ? unreadTotal : undefined}
              size="desktop"
            />
          ))}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifySelf: "end" }}>
          <ProfileMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
}

