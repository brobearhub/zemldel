"use client";

import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { Box, Drawer, Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "@/shared/ui/Link";
import type { CabinetNavItem as NavItem } from "@/widgets/cabinet-chrome/model/nav-config";
import { CabinetNavItem } from "@/widgets/cabinet-chrome/ui/CabinetNavItem";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";

export const CABINET_BOTTOM_NAV_HEIGHT_PX = 64;

type Props = {
  items: readonly NavItem[];
  moreItems: readonly NavItem[];
};

export function CabinetBottomNav({ items, moreItems }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { unreadByRequestId } = useChatSocket();
  const [moreOpen, setMoreOpen] = useState(false);

  const unreadTotal = useMemo(() => Object.values(unreadByRequestId).reduce((acc, v) => acc + v, 0), [unreadByRequestId]);
  const ctx = useMemo(() => ({ pathname, searchParams: new URLSearchParams(searchParams?.toString() ?? "") }), [pathname, searchParams]);
  const moreSelected = moreItems.some((item) => item.isActive(ctx));

  return (
    <>
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
            justifyContent: "flex-start",
            px: 0.5,
            overflow: "hidden",
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
          {moreItems.length > 0 ? (
            <CabinetNavItem
              label="Ещё"
              icon={<MoreHorizIcon />}
              selected={moreSelected || moreOpen}
              expanded={moreOpen}
              size="mobile"
              onClick={() => setMoreOpen(true)}
            />
          ) : null}
        </Box>
      </Box>

      <Drawer
        anchor="bottom"
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        slotProps={{ paper: { sx: { pb: "env(safe-area-inset-bottom)", borderTopLeftRadius: 16, borderTopRightRadius: 16 } } }}
      >
        <Stack component="nav" aria-label="Ещё разделы" sx={{ py: 1 }}>
          {moreItems.map((item) => {
            const selected = item.isActive(ctx);
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={selected ? "page" : undefined}
                onClick={() => setMoreOpen(false)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  minHeight: 44,
                  px: 2,
                  textDecoration: "none",
                  color: "text.primary",
                  bgcolor: selected ? "action.selected" : "transparent",
                }}
              >
                <Box sx={{ display: "inline-flex", color: "text.primary" }}>{item.icon}</Box>
                <Typography>{item.label}</Typography>
              </Link>
            );
          })}
        </Stack>
      </Drawer>
    </>
  );
}
