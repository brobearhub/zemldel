"use client";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { AppBar, Box, IconButton, Toolbar } from "@mui/material";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { CabinetNavItem as NavItem } from "@/widgets/cabinet-chrome/model/nav-config";
import { CabinetNavItem } from "@/widgets/cabinet-chrome/ui/CabinetNavItem";
import { ColorModeToggle } from "@/core/theme/ColorModeToggle";
import { HeaderCity } from "@/widgets/header/ui/HeaderCity";
import { HeaderLogo } from "@/widgets/header/ui/HeaderLogo";
import { ProfileMenu } from "@/widgets/header/ui/ProfileMenu";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";

type Props = {
  items: readonly NavItem[];
  showProviderCity?: boolean;
};

function NavScroller({ children }: { children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const update = () => {
      const max = node.scrollWidth - node.clientWidth;
      setEdges({
        left: node.scrollLeft > 4,
        right: max - node.scrollLeft > 4,
      });
    };
    update();
    node.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [children]);

  function scrollBy(direction: -1 | 1) {
    scroller.current?.scrollBy({ left: direction * 180, behavior: "smooth" });
  }

  return (
    <Box sx={{ minWidth: 0, display: "flex", alignItems: "center", overflow: "hidden" }}>
      {edges.left ? (
        <IconButton aria-label="Пункты меню слева" onClick={() => scrollBy(-1)} size="small">
          <ChevronLeftIcon />
        </IconButton>
      ) : null}
      <Box
        ref={scroller}
        sx={{
          minWidth: 0,
          flex: 1,
          display: "flex",
          flexWrap: "nowrap",
          alignItems: "center",
          justifyContent: edges.left || edges.right ? "flex-start" : "center",
          gap: 0.5,
          overflowX: "auto",
          scrollbarWidth: "thin",
        }}
      >
        {children}
      </Box>
      {edges.right ? (
        <IconButton aria-label="Пункты меню справа" onClick={() => scrollBy(1)} size="small">
          <ChevronRightIcon />
        </IconButton>
      ) : null}
    </Box>
  );
}

export function CabinetDesktopBar({ items, showProviderCity = false }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { unreadByRequestId } = useChatSocket();

  const unreadTotal = useMemo(() => Object.values(unreadByRequestId).reduce((acc, v) => acc + v, 0), [unreadByRequestId]);
  const ctx = useMemo(() => ({ pathname, searchParams: new URLSearchParams(searchParams?.toString() ?? "") }), [pathname, searchParams]);

  return (
    <AppBar position="fixed" elevation={0}>
      <Toolbar
        disableGutters
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 0.5,
          height: { xs: 60, sm: 70 },
          display: "grid",
          gridTemplateColumns: "auto minmax(0, 1fr) auto",
          alignItems: "center",
          width: "100%",
          overflow: "hidden",
          columnGap: { md: 1, lg: 2 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, position: "relative", zIndex: 1 }}>
          <HeaderLogo />
          {showProviderCity ? <HeaderCity showLabel scope="provider" /> : null}
        </Box>

        <NavScroller>
          {items.map((item) => (
            <Box key={item.key} sx={{ flex: "0 0 auto" }}>
              <CabinetNavItem
                href={item.href}
                label={item.label}
                icon={item.icon}
                selected={item.isActive(ctx)}
                badge={item.badgeKind === "chatUnreadTotal" ? unreadTotal : undefined}
                size="desktop"
              />
            </Box>
          ))}
        </NavScroller>

        <Box sx={{ display: "flex", alignItems: "center", justifySelf: "end", gap: 0.5, position: "relative", zIndex: 1 }}>
          <ColorModeToggle />
          <ProfileMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
}

