"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Badge,
  Box,
  Collapse,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";
import DynamicFeedOutlinedIcon from "@mui/icons-material/DynamicFeedOutlined";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import PeopleOutlineOutlinedIcon from "@mui/icons-material/PeopleOutlineOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import DataSaverOnIcon from "@mui/icons-material/DataSaverOn";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";
import { ProSettingsMenu } from "./ProSettingsMenu";
import { getActiveMembership } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";

type SidebarNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  active: (pathname: string) => boolean;
};

const REQUEST_ITEMS: readonly SidebarNavItem[] = [
  {
    href: "/pro/requests/feed",
    label: "Лента",
    icon: <DynamicFeedOutlinedIcon />,
    active: (pathname) => pathname === "/pro/requests/feed",
  },
  {
    href: "/pro/requests/board",
    label: "Доска",
    icon: <ViewKanbanOutlinedIcon />,
    active: (pathname) =>
      pathname.startsWith("/pro/requests") && pathname !== "/pro/requests/feed",
  },
];

const TEAM_ITEMS: readonly SidebarNavItem[] = [
  {
    href: "/pro/team/add-manager",
    label: "Добавление менеджера",
    icon: null,
    active: (pathname) => pathname === "/pro/team/add-manager",
  },
  {
    href: "/pro/team/tasks",
    label: "Задачи команды",
    icon: null,
    active: (pathname) => pathname === "/pro/team/tasks",
  },
];

const NAV_ITEMS: readonly SidebarNavItem[] = [
  {
    href: "/pro/services",
    label: "Услуги",
    icon: <FormatListBulletedOutlinedIcon />,
    active: (path) => path.startsWith("/pro/services"),
  },
  {
    href: "/pro/clients",
    label: "Клиенты",
    icon: <Groups2OutlinedIcon />,
    active: (path) => path.startsWith("/pro/clients"),
  },
  {
    href: "/pro/stories",
    label: "Сторисы",
    icon: <DataSaverOnIcon />,
    active: (path) => path.startsWith("/pro/stories"),
  },
  {
    href: "/pro/overview",
    label: "Обзор",
    icon: <BarChartOutlinedIcon />,
    active: (path) => path.startsWith("/pro/overview"),
  },
];

type Props = {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  providerName: string;
  mobile?: boolean;
  onNavigate?: () => void;
};

export function ProSidebar({
  collapsed: sidebarCollapsed = false,
  onToggleCollapsed,
  providerName,
  mobile = false,
  onNavigate,
}: Props) {
  const pathname = usePathname();
  const id = useId();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const theme = useTheme();
  const collapsed = sidebarCollapsed && !settingsOpen;
  const settingsTrigger = useRef<HTMLDivElement>(null);
  const settingsBack = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (settingsOpen) settingsBack.current?.focus();
  }, [settingsOpen]);
  const closeSettings = () => {
    setSettingsOpen(false);
    requestAnimationFrame(() => settingsTrigger.current?.focus());
  };
  const [requestsExpanded, setRequestsExpanded] = useState(true);
  const [teamExpanded, setTeamExpanded] = useState(false);
  const requestsActive = REQUEST_ITEMS.some((item) => item.active(pathname));

  useEffect(() => {
    if (requestsActive) setRequestsExpanded(true);
  }, [pathname, requestsActive]);
  const activeProviderName = useAppSelector(
    (state) => getActiveMembership(state.auth.user)?.providerName,
  );
  const displayName = activeProviderName ?? providerName;
  const { unreadByRequestId } = useChatSocket();
  const unreadTotal = useMemo(
    () =>
      Object.values(unreadByRequestId).reduce(
        (total, count) => total + count,
        0,
      ),
    [unreadByRequestId],
  );

  useEffect(() => {
    if (mobile) return;
    document.documentElement.style.setProperty(
      "--pro-sidebar-width",
      collapsed ? "72px" : "240px",
    );
    document.documentElement.style.setProperty(
      "--pro-header-logo-display",
      collapsed ? "none" : "flex",
    );
    return () => {
      document.documentElement.style.removeProperty("--pro-sidebar-width");
      document.documentElement.style.removeProperty(
        "--pro-header-logo-display",
      );
    };
  }, [collapsed, mobile]);

  const renderItem = (item: SidebarNavItem, nested = false) => {
    const selected = item.active(pathname);
    const button = (
      <ListItemButton
        key={item.href}
        component={Link}
        href={item.href}
        onClick={onNavigate}
        selected={selected}
        aria-current={selected ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        sx={{
          minHeight: nested ? 44 : 52,
          mx: collapsed ? 1 : 1.75,
          mb: 0.25,
          px: collapsed ? 1 : 2.125,
          pl: collapsed ? 1 : nested ? 4.5 : 2.125,
          borderRadius: 1,
          color: (theme) =>
            theme.palette.mode === "light"
              ? "#59625d"
              : theme.palette.text.secondary,
          justifyContent: collapsed ? "center" : "flex-start",
          gap: collapsed ? 0 : 2.5,
          "&:hover": {
            bgcolor: (theme) =>
              theme.palette.mode === "light"
                ? "#e4e9dd"
                : theme.palette.action.hover,
          },
          "&.Mui-selected": {
            bgcolor: (theme) =>
              theme.palette.mode === "light"
                ? "#d8e1d0"
                : theme.palette.action.selected,
            color: (theme) =>
              theme.palette.mode === "light"
                ? "#1f513a"
                : theme.palette.text.primary,
          },
          "&.Mui-selected:hover": {
            bgcolor: (theme) =>
              theme.palette.mode === "light"
                ? "#d2ddca"
                : theme.palette.action.hover,
          },
        }}
      >
        {item.icon && (
          <ListItemIcon
            sx={{
              minWidth: 20,
              color: "inherit",
              "& .MuiSvgIcon-root": {
                fontSize: 22,
              },
            }}
          >
            {item.icon}
          </ListItemIcon>
        )}
        {collapsed ? null : (
          <ListItemText
            primary={item.label}
            sx={{
              minWidth: 0,
            }}
            slotProps={{
              primary: {
                sx: {
                  fontSize: nested ? 15 : 17,
                  fontWeight: selected ? 800 : 400,
                  lineHeight: 1.35,
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                },
              },
            }}
          />
        )}
      </ListItemButton>
    );
    return collapsed ? (
      <Tooltip key={item.href} title={item.label} placement="right">
        {button}
      </Tooltip>
    ) : (
      button
    );
  };

  return (
    <Box
      component="nav"
      aria-label="Меню исполнителя"
      onKeyDown={(event) => {
        if (settingsOpen && event.key === "Escape") {
          event.stopPropagation();
          closeSettings();
        }
      }}
      sx={{
        display: "flex",
        flexDirection: "column",
        width: mobile ? "100%" : collapsed ? 72 : 240,
        height: mobile ? "min(85dvh, 800px)" : "100dvh",
        overflow: "hidden",
        boxSizing: "border-box",
        py: 0,
        bgcolor: (theme) =>
          theme.palette.mode === "light"
            ? "#f0f0e6"
            : theme.palette.background.default,
        borderRight: (theme) =>
          `1px solid ${theme.palette.mode === "light" ? "#dcded6" : theme.palette.divider}`,
      }}
    >
      <Box
        title={displayName}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1,
          height: 71,
          boxSizing: "border-box",
          flexShrink: 0,
          px: collapsed ? 1 : 1.75,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.25,
          bgcolor: (theme) =>
            theme.palette.mode === "light"
              ? "#f0f0e6"
              : theme.palette.background.default,
          borderBottom: (theme) =>
            `1px solid ${theme.palette.mode === "light" ? "#dcded6" : theme.palette.divider}`,
        }}
      >
        {collapsed ? (
          <Box
            component={Link}
            href="/"
            aria-label="На главную"
            sx={{
              display: "inline-flex",
            }}
          >
            <Box
              component="img"
              src={
                theme.palette.mode === "light"
                  ? "/zemledel_logo_dark.svg"
                  : "/zemledel_logo_light.svg"
              }
              alt="Земледел"
              sx={{
                width: 40,
                height: 48,
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
          </Box>
        ) : (
          <Typography
            variant="body2"
            sx={{
              minWidth: 0,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              color: "text.primary",
              fontSize: 16,
              fontWeight: 700,
              lineHeight: 1.25,
              textAlign: "center",
            }}
          >
            {displayName}
          </Typography>
        )}
      </Box>
      {settingsOpen ? (
        <Box
          component="section"
          id={`${id}-settings-panel`}
          aria-labelledby={`${id}-settings-title`}
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ py: 1, flexShrink: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2.5,
                minHeight: 52,
              }}
            >
              <Typography id={`${id}-settings-title`} sx={{ fontWeight: 700 }}>
                Настройки
              </Typography>
              <IconButton
                ref={settingsBack}
                aria-label="Закрыть настройки"
                onClick={closeSettings}
              >
                <CloseRoundedIcon />
              </IconButton>
            </Box>
          </Box>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ pb: 1, flexShrink: 0 }}>
              <ProSettingsMenu onNavigate={onNavigate} />
            </Box>
          </Box>
        </Box>
      ) : (
        <>
          <List disablePadding sx={{ pt: 1.75, overflowY: "auto", flex: 1 }}>
            <Tooltip title={collapsed ? "Заявки" : ""} placement="right">
              <ListItemButton
                onClick={() => setRequestsExpanded((value) => !value)}
                aria-expanded={requestsExpanded}
                aria-controls={`${id}-requests-submenu`}
                aria-label="Заявки"
                sx={{
                  minHeight: 52,
                  mx: collapsed ? 1 : 1.75,
                  px: collapsed ? 1 : 2.125,
                  gap: collapsed ? 0 : 2.5,
                  borderRadius: 1,
                  justifyContent: collapsed ? "center" : "flex-start",
                  color: requestsActive ? "text.primary" : "text.secondary",
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 20,
                    color: "inherit",
                  }}
                >
                  <Badge
                    badgeContent={unreadTotal}
                    color="error"
                    max={99}
                    invisible={unreadTotal === 0}
                  >
                    <InboxOutlinedIcon sx={{ fontSize: 22 }} />
                  </Badge>
                </ListItemIcon>
                {collapsed ? null : (
                  <>
                    <ListItemText
                      primary="Заявки"
                      slotProps={{
                        primary: {
                          sx: {
                            fontSize: 17,
                            fontWeight: 700,
                          },
                        },
                      }}
                    />
                    {requestsExpanded ? (
                      <ExpandLessRoundedIcon />
                    ) : (
                      <ExpandMoreRoundedIcon />
                    )}
                  </>
                )}
              </ListItemButton>
            </Tooltip>
            <Collapse in={requestsExpanded}>
              <List
                id={`${id}-requests-submenu`}
                component="div"
                aria-label="Заявки"
                disablePadding
              >
                {REQUEST_ITEMS.map((item) => renderItem(item, true))}
              </List>
            </Collapse>
            {NAV_ITEMS.slice(0, 2).map((item) => renderItem(item))}
            <Tooltip title={collapsed ? "Команда" : ""} placement="right">
              <ListItemButton
                onClick={() => {
                  if (collapsed) onToggleCollapsed?.();
                  setTeamExpanded((value) => collapsed || !value);
                }}
                aria-label="Команда"
                aria-expanded={teamExpanded && !collapsed}
                aria-controls={`${id}-team-submenu`}
                sx={{
                  minHeight: 52,
                  mx: collapsed ? 1 : 1.75,
                  px: collapsed ? 1 : 2.125,
                  gap: collapsed ? 0 : 2.5,
                  borderRadius: 1,
                  justifyContent: collapsed ? "center" : "flex-start",
                  color: pathname.startsWith("/pro/team/")
                    ? "text.primary"
                    : "text.secondary",
                }}
              >
                <ListItemIcon sx={{ minWidth: 20, color: "inherit" }}>
                  <PeopleOutlineOutlinedIcon sx={{ fontSize: 22 }} />
                </ListItemIcon>
                {!collapsed && (
                  <>
                    <ListItemText
                      primary="Команда"
                      slotProps={{ primary: { sx: { fontSize: 17 } } }}
                    />
                    {teamExpanded ? (
                      <ExpandLessRoundedIcon />
                    ) : (
                      <ExpandMoreRoundedIcon />
                    )}
                  </>
                )}
              </ListItemButton>
            </Tooltip>
            <Collapse in={teamExpanded && !collapsed}>
              <List
                id={`${id}-team-submenu`}
                component="div"
                aria-label="Команда"
                disablePadding
              >
                {TEAM_ITEMS.map((item) => renderItem(item, true))}
              </List>
            </Collapse>
            {NAV_ITEMS.slice(2).map((item) => renderItem(item))}
          </List>
        </>
      )}
      <Box
        sx={{
          display: "flex",
          flexDirection: collapsed ? "column" : "row",
          alignItems: "center",
          gap: 0.5,
          px: collapsed ? 1 : 1.75,
          py: 1,
          flexShrink: 0,
        }}
      >
        <Tooltip title={collapsed ? "Настройки" : ""} placement="right">
          <ListItemButton
            ref={settingsTrigger}
            onClick={() =>
              settingsOpen ? closeSettings() : setSettingsOpen(true)
            }
            aria-label="Настройки"
            aria-expanded={settingsOpen}
            aria-controls={settingsOpen ? `${id}-settings-panel` : undefined}
            selected={settingsOpen || pathname.startsWith("/pro/settings")}
            sx={{
              flex: collapsed ? undefined : 1,
              minWidth: 0,
              width: collapsed ? "100%" : undefined,
              px: collapsed ? 1 : 1.75,
              minHeight: 52,
              borderRadius: 1,
              gap: 1.5,
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <SettingsOutlinedIcon sx={{ fontSize: 22, flexShrink: 0 }} />
            {!collapsed && (
              <ListItemText
                primary="Настройки"
                slotProps={{
                  primary: { sx: { fontSize: 17, whiteSpace: "nowrap" } },
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>
        {!mobile && <Tooltip title={collapsed ? "Развернуть меню" : "Свернуть меню"}>
          <IconButton
            size="small"
            aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
            onClick={() => {
              if (settingsOpen) setSettingsOpen(false);
              if (!settingsOpen || !sidebarCollapsed) onToggleCollapsed?.();
            }}
            disabled={!onToggleCollapsed}
            sx={{ flexShrink: 0 }}
          >
            {collapsed ? (
              <ChevronRightRoundedIcon />
            ) : (
              <ChevronLeftRoundedIcon />
            )}
          </IconButton>
        </Tooltip>}
      </Box>
    </Box>
  );
}
