"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Box, IconButton } from "@mui/material";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import useMediaQuery from "@mui/material/useMediaQuery";
import { resolveAccountKind } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import { SITE_HEADER_HEIGHT_PX } from "@/shared/config/site-layout";
import { useCabinetSidebar } from "@/shared/ui/CabinetSidebarContext";
import { CabinetNavigationPanel } from "./CabinetNavigationPanel";
import { CabinetSettingsPanel } from "./CabinetSettingsPanel";
import { CabinetSidebarFooter } from "./CabinetSidebarFooter";

export function CabinetDesktopSidebar({
  compactPublicPage = false,
}: {
  compactPublicPage?: boolean;
}) {
  const wide = useMediaQuery((theme) => theme.breakpoints.up("tablet"));
  const pathname = usePathname();
  const titleId = useId();
  const { status, user } = useAppSelector((state) => state.auth);
  const authenticated = status === "authenticated";
  const provider = resolveAccountKind(user) === "PROVIDER";
  const storageKey = provider
    ? "ui.sidebar.pro.collapsed"
    : "ui.sidebar.profile.collapsed";
  const [savedCollapsed, setSavedCollapsed] = useState(false);
  const [publicSidebar, setPublicSidebar] = useState({ pathname, collapsed: true });
  const [requestSidebar, setRequestSidebar] = useState<{
    pathname: string;
    collapsed: boolean;
  } | null>(null);
  const requestDetail =
    wide && /^\/pro\/requests\/(?!feed\/?$|board\/?$)[^/]+\/?$/.test(pathname);
  const board = wide && /^\/pro\/requests\/board\/?$/.test(pathname);
  // Requests and the board start collapsed, independently of the saved preference.
  const collapseByDefault = requestDetail || board;
  const collapsed = compactPublicPage
    ? publicSidebar.pathname !== pathname || publicSidebar.collapsed
    : collapseByDefault
      ? requestSidebar?.pathname === pathname
        ? requestSidebar.collapsed
        : true
      : savedCollapsed;
  const { setExpanded, collapseRequest } = useCabinetSidebar();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsTrigger = useRef<HTMLElement | null>(null);
  const narrow = collapsed && !settingsOpen;
  const ultraCompact = compactPublicPage && narrow;

  useLayoutEffect(() => {
    if (!requestDetail || collapseRequest === 0) return;
    setRequestSidebar({ pathname, collapsed: true });
    setSettingsOpen(false);
  }, [collapseRequest, pathname, requestDetail]);

  useLayoutEffect(() => {
    setExpanded(wide && !narrow);
    return () => setExpanded(false);
  }, [wide, narrow, setExpanded]);

  const openSettings = () => {
    settingsTrigger.current = document.activeElement as HTMLElement | null;
    setSettingsOpen(true);
  };
  const backToMenu = () => {
    setSettingsOpen(false);
  };

  useLayoutEffect(() => {
    if (!settingsOpen && settingsTrigger.current) {
      settingsTrigger.current.focus();
      settingsTrigger.current = null;
    }
  }, [settingsOpen]);

  useEffect(() => {
    if (compactPublicPage) return;
    try {
      const value = localStorage.getItem(storageKey);
      setSavedCollapsed(value === "1" || value === "true");
    } catch {
      /* Storage may be unavailable. */
    }
  }, [compactPublicPage, storageKey]);

  useEffect(() => {
    setSettingsOpen(false);
    setRequestSidebar(null);
  }, [pathname, wide]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--cabinet-sidebar-width",
      ultraCompact ? "26px" : narrow ? "80px" : "300px",
    );
    return () => {
      document.documentElement.style.removeProperty("--cabinet-sidebar-width");
    };
  }, [narrow, ultraCompact]);

  const toggle = () => {
    const next = !collapsed;
    if (compactPublicPage) {
      setPublicSidebar({ pathname, collapsed: next });
      return;
    }
    if (collapseByDefault) {
      setRequestSidebar({ pathname, collapsed: next });
      return;
    }
    setSavedCollapsed(next);
    try {
      localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {
      /* Keep working without storage. */
    }
  };

  if (!wide) return null;

  return (
    <Box
      component="aside"
      aria-label={
        provider ? "Разделы кабинета исполнителя" : "Разделы кабинета клиента"
      }
      sx={{
        "--cabinet-navigation-top-height": `${SITE_HEADER_HEIGHT_PX.sm + 1 - 16}px`,
        position: "fixed",
        inset: "0 auto 0 0",
        width: "var(--cabinet-sidebar-width, 300px)",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        color: (theme) =>
          theme.palette.mode === "light" ? "#252723" : "#f1f2ec",
        bgcolor: "background.default",
        borderRight: 1,
        borderColor: "divider",
        pt: ultraCompact ? 0 : 2,
        px: ultraCompact ? 0 : narrow ? 0.75 : 1.5,
        boxSizing: "border-box",
        zIndex: 1201,
      }}
    >
      {ultraCompact ? (
        <IconButton
          aria-label="Развернуть меню"
          title="Развернуть меню"
          aria-expanded={false}
          onClick={toggle}
          sx={{
            flex: 1,
            width: "100%",
            minWidth: 0,
            px: 0,
            borderRadius: 0,
            color: "text.secondary",
          }}
        >
          <ChevronRightRounded />
        </IconButton>
      ) : (
        <>
          <Box sx={{ display: settingsOpen ? "none" : "contents" }}>
            <CabinetNavigationPanel
              titleId={titleId}
              collapsed={collapsed}
              showCollapsedLogo={authenticated && !provider && !compactPublicPage}
              onNavigate={() => setSettingsOpen(false)}
            />
          </Box>
          {settingsOpen ? (
            <CabinetSettingsPanel
              titleId={`${titleId}-settings`}
              provider={provider}
              authenticated={authenticated}
              onBack={backToMenu}
              onNavigate={() => setSettingsOpen(false)}
            />
          ) : null}
          <CabinetSidebarFooter
            titleId={settingsOpen ? `${titleId}-settings` : titleId}
            collapsed={narrow}
            settingsOpen={settingsOpen}
            onOpenSettings={openSettings}
            onBack={backToMenu}
            onNavigate={() => setSettingsOpen(false)}
            onToggleCollapsed={toggle}
          />
        </>
      )}
    </Box>
  );
}
