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
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Modal,
  Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha } from "@mui/material/styles";
import MenuRounded from "@mui/icons-material/MenuRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import ChatOutlined from "@mui/icons-material/ChatOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import {
  getActiveMembership,
  resolveAccountKind,
} from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import { requestReminderCount } from "@/entities/request/lib/reminder-events";
import { formatProviderIdentity } from "@/entities/provider/lib/provider-identity";
import { CdnAvatar } from "@/shared/ui/cdn-image";
import { UnreadCountBadge } from "@/shared/ui/UnreadCountBadge";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";
import { HeaderCity } from "@/widgets/header/ui/HeaderCity";
import { CUSTOMER_NAV } from "@/widgets/cabinet-chrome/model/nav-config";
import {
  NAV_ITEMS,
  REQUEST_ITEMS,
  TEAM_ITEMS,
} from "@/widgets/pro-dashboard/model/navigation";
import { MobileSettingsSheet } from "./MobileSettingsSheet";
import { ProviderNotificationsButton } from "@/widgets/cabinet-chrome/ui/ProviderHeaderStatus";

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
  const { unreadByRequestId } = useChatSocket();
  const unreadTotal = Object.values(unreadByRequestId).reduce(
    (total, count) => total + count,
    0,
  );
  const provider = authenticated && resolveAccountKind(user) === "PROVIDER";
  const membership = provider ? getActiveMembership(user) : null;
  const identity = membership ? formatProviderIdentity(membership) : null;
  const title = identity?.title || user?.name || "Мой профиль";
  const providerKindLabel =
    membership?.providerType === "SOLE_PROPRIETOR"
      ? "Индивидуальный предприниматель"
      : identity?.kindLabel || "Исполнитель";
  const avatar = identity ? membership?.providerImage : user?.image;
  const initials =
    identity?.initials ||
    user?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("") ||
    "Я";
  const [menuOpen, setMenuOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState("");
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
    setQuery(window.location.search);
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
    const interrupted = motionRef.current.some((animation) => animation.playState === "running");
    const width = `${panel.getBoundingClientRect().width}px`;
    const stageFrom = interrupted ? getComputedStyle(stage).transform : visible ? "translateX(0)" : `translateX(${width})`;
    const panelFrom = interrupted ? getComputedStyle(panel).transform : visible ? "translateX(-100%)" : "translateX(0)";
    const overlayStyle = getComputedStyle(overlay);
    const overlayFrom = {
      left: interrupted ? overlayStyle.left : visible ? "0px" : width,
      opacity: interrupted ? overlayStyle.opacity : visible ? "0" : "1",
      backdropFilter: interrupted ? overlayStyle.backdropFilter : visible ? "blur(0px)" : "blur(3px)",
    };
    motionRef.current.forEach((animation) => animation.cancel());
    motionRef.current = [];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const options = { duration: MENU_DURATION_MS, easing: MENU_EASING };
    const animations = [
      stage.animate([{ transform: stageFrom }, { transform: visible ? `translateX(${width})` : "translateX(0)" }], options),
      panel.animate([{ transform: panelFrom }, { transform: visible ? "translateX(0)" : "translateX(-100%)" }], options),
      overlay.animate([overlayFrom, { left: visible ? width : "0px", opacity: visible ? "1" : "0", backdropFilter: visible ? "blur(3px)" : "blur(0px)" }], options),
    ];
    // One timeline start keeps the menu edge, page edge and blur aligned.
    const startTime = document.timeline.currentTime;
    animations.forEach((animation) => { animation.startTime = startTime; });
    motionRef.current = animations;
  }, [open, revealed, closing, visible]);

  useEffect(() => () => motionRef.current.forEach((animation) => animation.cancel()), []);
  const context = useMemo(() => ({ open, openMenu }), [open, openMenu]);
  const routeContext = {
    pathname,
    searchParams: new URLSearchParams(query),
  };
  const row = (
    href: string,
    label: string,
    icon: ReactNode,
    selected = pathname === href,
    unreadCount = 0,
  ) => (
    <ListItemButton
      key={href}
      component={Link}
      href={href}
      onClick={close}
      selected={selected}
      aria-current={selected ? "page" : undefined}
      aria-label={
        unreadCount > 0
          ? `${label}, непрочитанных сообщений: ${unreadCount}`
          : undefined
      }
      sx={{
        minHeight: 50,
        px: 1.25,
        py: 1,
        gap: 1.5,
        borderRadius: "14px",
        mb: 0.25,
        color: "inherit",
        "&.Mui-selected": { bgcolor: "action.selected" },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: 24,
          color: "inherit",
          "& .MuiSvgIcon-root": { fontSize: 24 },
        }}
      >
        {unreadCount > 0 ? (
          <UnreadCountBadge count={unreadCount}>
            {icon}
          </UnreadCountBadge>
        ) : (
          icon
        )}
      </ListItemIcon>
      <ListItemText
        primary={label}
        slotProps={{
          primary: {
            noWrap: true,
            sx: { fontSize: "1rem", fontWeight: selected ? 700 : 500 },
          },
        }}
      />
    </ListItemButton>
  );
  const group = (label: string, items: ReactNode) => (
    <Box sx={{ mt: 2 }}>
      <Typography
        component="h3"
        sx={{
          px: 1.25,
          mb: 0.75,
          fontSize: "0.875rem",
          color: "text.secondary",
          fontWeight: 500,
        }}
      >
        {label}
      </Typography>
      <List disablePadding aria-label={label}>
        {items}
      </List>
    </Box>
  );

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
                  transform: visible ? `translateX(${PANEL_WIDTH})` : "translateX(0)",
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
          aria-labelledby="mobile-menu-title"
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
            <Box sx={{
              px: 1.25,
              pb: 1,
              flexShrink: 0,
            }}>
              {!authenticated ? (
                <Typography
                  id="mobile-menu-title"
                  component="h2"
                  sx={{
                    fontSize: "1.625rem",
                    fontWeight: 800,
                    lineHeight: 1.4,
                    letterSpacing: "-0.04em",
                    color: "text.primary",
                  }}
                >
                  Земледел
                </Typography>
              ) : null}
              <Box sx={{
                mt: 0.5,
                ml: -1,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}>
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  <HeaderCity
                    showLabel
                    scope={provider ? "provider" : undefined}
                  />
                </Box>
                {provider ? (
                  <ProviderNotificationsButton
                    label="Напоминания"
                    buttonSize={44}
                    onNavigate={close}
                  />
                ) : null}
              </Box>
            </Box>
            <Box
              component="nav"
              aria-label={provider ? "Меню исполнителя" : "Меню сайта"}
              sx={{
                overflowY: "auto",
                overscrollBehavior: "contain",
                minHeight: 0,
                flex: 1,
                pb: 2,
                scrollbarWidth: "thin",
              }}
            >
              <List disablePadding>
                {row("/", "Главная", <HomeOutlined />)}
                {authenticated
                  ? row(
                      provider ? "/pro/chats" : "/profile?section=requests",
                      "Чаты",
                      <ChatOutlined />,
                      provider && pathname.startsWith("/pro/chats"),
                      unreadTotal,
                    )
                  : null}
              </List>
              {provider ? (
                <>
                  {group(
                    "Заявки",
                    REQUEST_ITEMS.map((item) =>
                      row(
                        item.href,
                        item.label,
                        item.icon,
                        item.active(pathname),
                      ),
                    ),
                  )}
                  {group(
                    "Работа",
                    [
                      ...NAV_ITEMS,
                      ...TEAM_ITEMS.filter((item) => item.href === "/pro/team/tasks"),
                    ].map((item) =>
                      row(
                        item.href,
                        item.label,
                        item.icon || <AssignmentOutlined />,
                        item.active(pathname),
                      ),
                    ),
                  )}
                </>
              ) : authenticated ? (
                group(
                  "Личный кабинет",
                  CUSTOMER_NAV.desktop.filter((item) => item.key !== "profile").map((item) =>
                    row(
                      item.href,
                      item.label,
                      item.icon,
                      item.isActive(routeContext),
                    ),
                  ),
                )
              ) : (
                group(
                  "Вход",
                  <>
                    {row(
                      "/signin",
                      "Войти как клиент",
                      <PersonOutlineRounded />,
                      false,
                    )}
                    {row(
                      "/signin?returnTo=%2Fpro%2Frequests%2Ffeed",
                      "Войти как исполнитель",
                      <PersonOutlineRounded />,
                      false,
                    )}
                    {row("/signup", "Регистрация", <AddRounded />)}
                  </>,
                )
              )}
              {group(
                "Земледел",
                <>
                  {row("/about", "О проекте и контакты", <InfoOutlined />)}
                  {user?.systemRole === "PLATFORM_ADMIN"
                    ? row(
                        "/admin",
                        "Админка",
                        <AdminPanelSettingsOutlined />,
                        pathname.startsWith("/admin"),
                      )
                    : null}
                </>,
              )}
            </Box>
            <Box
              sx={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: authenticated ? 1 : 1.5,
                pt: 1.5,
                pb: "max(16px, env(safe-area-inset-bottom))",
                px: 1,
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              <IconButton
                aria-label="Настройки"
                aria-haspopup="dialog"
                onClick={() => setSettingsOpen(true)}
                title={authenticated ? title : "Настройки"}
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  border: 1,
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  flexShrink: 0,
                }}
              >
                {authenticated ? (
                  <CdnAvatar
                    src={avatar || undefined}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      bgcolor: "background.paper",
                      color: "text.primary",
                      fontSize: "0.875rem",
                      fontWeight: 800,
                    }}
                  >
                    {initials}
                  </CdnAvatar>
                ) : (
                  <SettingsOutlined />
                )}
              </IconButton>
              {authenticated ? (
                <Box
                  component="button"
                  type="button"
                  aria-label={`Настройки: ${title}`}
                  aria-haspopup="dialog"
                  onClick={() => setSettingsOpen(true)}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 44,
                    p: 0,
                    border: 0,
                    bgcolor: "transparent",
                    font: "inherit",
                    textAlign: "left",
                    cursor: "pointer",
                    "&:focus-visible": {
                      outline: "2px solid",
                      outlineColor: "text.primary",
                      outlineOffset: 4,
                    },
                  }}
                >
                  <Typography
                    component="p"
                    noWrap
                    title={provider ? providerKindLabel : "Клиент"}
                    sx={{
                      mb: 0.25,
                      fontSize: "0.6875rem",
                      lineHeight: 1.4,
                      color: "text.secondary",
                    }}
                  >
                    {provider ? providerKindLabel : "Клиент"}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 0.5,
                    }}
                  >
                    <Typography
                      id="mobile-menu-title"
                      component="h2"
                      title={title}
                      sx={{
                        minWidth: 0,
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        lineHeight: 1.35,
                        color: "text.primary",
                        overflowWrap: "anywhere",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                      }}
                    >
                      {title}
                    </Typography>
                  </Box>
                </Box>
              ) : null}
              {!authenticated ? (
                <Button
                  component={Link}
                  href="/signin"
                  onClick={close}
                  variant="contained"
                  disableElevation
                  sx={{
                    flex: "0 1 auto",
                    ml: "auto",
                    minWidth: 0,
                    minHeight: 48,
                    borderRadius: "28px",
                    px: 1.5,
                    fontSize: "0.875rem",
                    bgcolor: (theme) =>
                      theme.palette.mode === "light" ? "#242522" : "#f5f6f2",
                    color: (theme) =>
                      theme.palette.mode === "light" ? "#fff" : "#242522",
                    "&:hover": { bgcolor: "text.secondary" },
                  }}
                >
                  Войти
                </Button>
              ) : null}
              {authenticated ? (
                <IconButton
                  aria-label="Свернуть меню"
                  title="Свернуть меню"
                  onClick={dismiss}
                  sx={{
                    ml: "auto",
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: "50%",
                    color: "text.secondary",
                  }}
                >
                  <ChevronLeftRounded />
                </IconButton>
              ) : null}
            </Box>
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
      <MobileSettingsSheet
        open={settingsOpen && open}
        provider={provider}
        authenticated={authenticated}
        onClose={() => setSettingsOpen(false)}
        onNavigate={close}
      />
    </Context.Provider>
  );
}
