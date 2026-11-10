"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Box, IconButton, Modal } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha } from "@mui/material/styles";
import MenuRounded from "@mui/icons-material/MenuRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { resolveAccountKind } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import { requestReminderCount } from "@/entities/request/lib/reminder-events";
import { CabinetNavigationPanel } from "@/widgets/cabinet-chrome/ui/CabinetNavigationPanel";
import { CabinetSettingsPanel } from "@/widgets/cabinet-chrome/ui/CabinetSettingsPanel";
import { CabinetSidebarFooter } from "@/widgets/cabinet-chrome/ui/CabinetSidebarFooter";

type NavigationContext = { open: boolean; openMenu: () => void };
const Context = createContext<NavigationContext | null>(null);

export function MobileMenuButton() {
  const navigation = useContext(Context);
  return (
    <IconButton
      aria-label="Открыть меню"
      aria-haspopup="dialog"
      aria-expanded={navigation?.open ?? false}
      onClick={navigation?.openMenu}
      sx={{
        width: 44,
        height: 44,
        border: 0,
        color: "text.primary",
        bgcolor: "transparent",
        "&:hover": {
          bgcolor: "transparent",
        },
      }}
    >
      <MenuRounded />
    </IconButton>
  );
}

const PANEL_WIDTH = "min(420px, calc(100vw - 80px))";
const MENU_DURATION_MS = 280;
const MENU_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export function MobileNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mobile = useMediaQuery((theme) => theme.breakpoints.down("tablet"));
  const { status, user } = useAppSelector((state) => state.auth);
  const authenticated = status === "authenticated";
  const provider = authenticated && resolveAccountKind(user) === "PROVIDER";
  const [menuOpen, setMenuOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsTrigger = useRef<HTMLElement | null>(null);
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
  const [position, setPosition] = useState({ scroll: 0, height: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLButtonElement>(null);
  const motionRef = useRef<Animation[]>([]);

  useEffect(() => {
    setMenuOpen(false);
    setClosing(false);
    setSettingsOpen(false);
  }, [pathname, mobile]);

  const close = () => {
    setSettingsOpen(false);
    setMenuOpen(false);
    setClosing(false);
  };
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => {
      setMenuOpen(false);
      setClosing(false);
      requestAnimationFrame(() =>
        window.scrollTo({ top: position.scroll, behavior: "instant" }),
      );
    }, MENU_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [closing, position.scroll]);

  const dismiss = () => {
    if (closing) return;
    setSettingsOpen(false);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      close();
      requestAnimationFrame(() =>
        window.scrollTo({ top: position.scroll, behavior: "instant" }),
      );
    } else {
      setClosing(true);
    }
  };
  const openMenu = useCallback(() => {
    setPosition({
      scroll: window.scrollY,
      height: stageRef.current?.scrollHeight ?? window.innerHeight,
    });
    setMenuOpen(true);
    setClosing(false);
    setRevealed(false);
    requestReminderCount();
  }, []);
  const open = menuOpen && mobile;
  const visible = revealed && !closing;

  useEffect(() => {
    if (!open) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }
    // Mount the page, menu and blur at their shared starting position first.
    let nextFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      nextFrame = requestAnimationFrame(() => setRevealed(true));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(nextFrame);
    };
  }, [open]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    if (!open || !stage || !panel || !overlay) {
      motionRef.current.forEach((animation) => animation.cancel());
      motionRef.current = [];
      return;
    }
    if ((!revealed && !closing) || typeof stage.animate !== "function") return;
    const interrupted = motionRef.current.some(
      (animation) => animation.playState === "running",
    );
    const width = `${panel.getBoundingClientRect().width}px`;
    const stageFrom = interrupted
      ? getComputedStyle(stage).transform
      : visible
        ? "translateX(0)"
        : `translateX(${width})`;
    const panelFrom = interrupted
      ? getComputedStyle(panel).transform
      : visible
        ? "translateX(-100%)"
        : "translateX(0)";
    const overlayStyle = getComputedStyle(overlay);
    const overlayFrom = {
      left: interrupted ? overlayStyle.left : visible ? "0px" : width,
      opacity: interrupted ? overlayStyle.opacity : visible ? "0" : "1",
      backdropFilter: interrupted
        ? overlayStyle.backdropFilter
        : visible
          ? "blur(0px)"
          : "blur(3px)",
    };
    motionRef.current.forEach((animation) => animation.cancel());
    motionRef.current = [];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const options = { duration: MENU_DURATION_MS, easing: MENU_EASING };
    const animations = [
      stage.animate(
        [
          { transform: stageFrom },
          { transform: visible ? `translateX(${width})` : "translateX(0)" },
        ],
        options,
      ),
      panel.animate(
        [
          { transform: panelFrom },
          { transform: visible ? "translateX(0)" : "translateX(-100%)" },
        ],
        options,
      ),
      overlay.animate(
        [
          overlayFrom,
          {
            left: visible ? width : "0px",
            opacity: visible ? "1" : "0",
            backdropFilter: visible ? "blur(3px)" : "blur(0px)",
          },
        ],
        options,
      ),
    ];
    // One timeline start keeps the menu edge, page edge and blur aligned.
    const startTime = document.timeline.currentTime;
    animations.forEach((animation) => {
      animation.startTime = startTime;
    });
    motionRef.current = animations;
  }, [open, revealed, closing, visible]);

  useEffect(
    () => () => motionRef.current.forEach((animation) => animation.cancel()),
    [],
  );
  const context = useMemo(() => ({ open, openMenu }), [open, openMenu]);

  return (
    <Context.Provider value={context}>
      <Box sx={{ minHeight: open ? position.height : undefined }}>
        <Box
          ref={stageRef}
          data-testid="mobile-page-surface"
          sx={{
            minHeight: "100dvh",
            bgcolor: "background.default",
            ...(open
              ? {
                  position: "fixed",
                  inset: 0,
                  height: "100dvh",
                  width: "100%",
                  overflow: "hidden",
                  transform: visible
                    ? `translateX(${PANEL_WIDTH})`
                    : "translateX(0)",
                  borderRadius: 0,
                  boxShadow: "0 0 36px rgba(0,0,0,.16)",
                  zIndex: 1300,
                }
              : {}),
          }}
        >
          <Box sx={{ mt: open ? `${-position.scroll}px` : undefined }}>
            {children}
          </Box>
        </Box>
      </Box>

      <Modal
        open={open}
        onClose={dismiss}
        disableAutoFocus={false}
        sx={{ zIndex: 1400 }}
        slotProps={{ backdrop: { sx: { bgcolor: "transparent" } } }}
      >
        <Box
          role="dialog"
          aria-modal="true"
          aria-labelledby={
            settingsOpen ? "mobile-settings-title" : "mobile-menu-title"
          }
          tabIndex={-1}
          sx={{
            position: "fixed",
            inset: 0,
            outline: 0,
          }}
        >
          <Box
            ref={panelRef}
            sx={{
              width: PANEL_WIDTH,
              color: (theme) =>
                theme.palette.mode === "light" ? "#252723" : "#f1f2ec",
              height: "100dvh",
              display: "flex",
              flexDirection: "column",
              bgcolor: (theme) =>
                theme.palette.mode === "light"
                  ? "#f3f4ef"
                  : "background.default",
              pt: "max(16px, env(safe-area-inset-top))",
              px: 1.5,
              boxSizing: "border-box",
              transform: visible ? "translateX(0)" : "translateX(-100%)",
            }}
          >
            <Box sx={{ display: settingsOpen ? "none" : "contents" }}>
              <CabinetNavigationPanel
                titleId="mobile-menu-title"
                onNavigate={close}
              />
            </Box>
            {settingsOpen ? (
              <CabinetSettingsPanel
                titleId="mobile-settings-title"
                provider={provider}
                authenticated={authenticated}
                onBack={backToMenu}
                onNavigate={close}
              />
            ) : null}
            <CabinetSidebarFooter
              titleId={
                settingsOpen ? "mobile-settings-title" : "mobile-menu-title"
              }
              settingsOpen={settingsOpen}
              onOpenSettings={openSettings}
              onBack={backToMenu}
              onNavigate={close}
              onToggleCollapsed={dismiss}
            />
          </Box>
          <Box
            ref={overlayRef}
            component="button"
            type="button"
            aria-label="Закрыть меню"
            onClick={dismiss}
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              left: visible ? PANEL_WIDTH : 0,
              p: 0,
              border: 0,
              borderRadius: 0,
              bgcolor: "transparent",
              backdropFilter: visible ? "blur(3px)" : "blur(0px)",
              WebkitBackdropFilter: visible ? "blur(3px)" : "blur(0px)",
              opacity: visible ? 1 : 0,
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              pt: "max(16px, env(safe-area-inset-top))",
              color: "text.primary",
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: -4,
              },
            }}
          >
            <Box
              component="span"
              sx={{
                width: 44,
                height: 44,
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                bgcolor: (theme) => alpha(theme.palette.background.paper, 0.65),
              }}
            >
              <CloseRounded />
            </Box>
          </Box>
        </Box>
      </Modal>
    </Context.Provider>
  );
}
