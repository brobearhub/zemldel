"use client";

import { Box } from "@mui/material";
import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { CabinetNavItem as NavItem } from "@/widgets/cabinet-chrome/model/nav-config";
import { CabinetNavItem } from "@/widgets/cabinet-chrome/ui/CabinetNavItem";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";

export const CABINET_BOTTOM_NAV_HEIGHT_PX = 64;

type Props = {
  items: readonly NavItem[];
};

export function CabinetBottomNav({ items }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { unreadByRequestId } = useChatSocket();

  const unreadTotal = useMemo(() => Object.values(unreadByRequestId).reduce((acc, v) => acc + v, 0), [unreadByRequestId]);
  const ctx = useMemo(() => ({ pathname, searchParams: new URLSearchParams(searchParams?.toString() ?? "") }), [pathname, searchParams]);

  return (
    <Box
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1200,
        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: (theme) => theme.custom.bgColors.secondary,
        backdropFilter: "blur(10px)",
        pb: "env(safe-area-inset-bottom)",
      }}
    >
      <Box
        sx={{
          height: CABINET_BOTTOM_NAV_HEIGHT_PX,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          px: 1,
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
            size="mobile"
          />
        ))}
      </Box>
    </Box>
  );
}

