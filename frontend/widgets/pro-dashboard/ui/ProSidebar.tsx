"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Badge,
  Box,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import DynamicFeedOutlinedIcon from "@mui/icons-material/DynamicFeedOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import PeopleOutlineOutlinedIcon from "@mui/icons-material/PeopleOutlineOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlined";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { SITE_STICKY_TOP_PX } from "@/shared/config/site-layout";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";

type SidebarNavItem = {
  readonly href: string;
  readonly label: string;
  readonly description?: string;
  readonly icon: ReactNode;
};

const NAV_ITEMS: readonly SidebarNavItem[] = [
  {
    href: "/pro",
    label: "Заявки",
    description: "Поток заявок клиентов",
    icon: <DynamicFeedOutlinedIcon />,
  },
  {
    href: "/pro/workday",
    label: "Рабочий день",
    description: "Напоминания на сегодня",
    icon: <TodayOutlinedIcon />,
  },
  {
    href: "/pro/overview",
    label: "Обзор",
    description: "Показатели и быстрые действия",
    icon: <DashboardOutlinedIcon />,
  },
  {
    href: "/pro/team",
    label: "Команда",
    description: "Участники компании и роли",
    icon: <PeopleOutlineOutlinedIcon />,
  },
  {
    href: "/pro/clients",
    label: "Клиенты",
    description: "Заказчики с оформленными заказами",
    icon: <Groups2OutlinedIcon />,
  },
  {
    href: "/pro/reminders",
    label: "Напоминания",
    description: "Все напоминания по заявкам",
    icon: <NotificationsNoneOutlinedIcon />,
  },
];

const SERVICES_GROUP = {
  hrefPrefix: "/pro/services",
  label: "Услуги",
  description: "Каталог и управление услугами",
  icon: <BuildOutlinedIcon />,
  items: [
    {
      href: "/pro/services/list",
      label: "Список",
      icon: <FormatListBulletedIcon />,
    },
    {
      href: "/pro/services/create",
      label: "Создать",
      icon: <AddCircleOutlineIcon />,
    },
  ],
} as const;

/** Описание пункта — компактнее title, чтобы в узком сайдбаре меньше переносилось. */
const NAV_SECONDARY_TYPOGRAPHY_PROPS = {
  sx: { mt: 0.25, fontSize: 11, lineHeight: 1.25 },
} as const;

/** Активный пункт: без фона, акцент warning на иконке и title (бордер — отдельный индикатор). */
const SELECTED_NAV_SX = {
  "&.Mui-selected": {
    bgcolor: "transparent",
    "&:hover": { bgcolor: "action.hover" },
    "& .MuiListItemIcon-root": { color: "warning.main" },
    "& .MuiListItemText-primary": { color: "warning.main" },
  },
  "& .MuiListItemIcon-root, & .MuiListItemText-primary": {
    transition: "color 0.2s ease",
  },
} as const;

type IndicatorRect = {
  top: number;
  height: number;
};

type Props = {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function ProSidebar({ collapsed = false, onToggleCollapsed }: Props) {
  const pathname = usePathname();
  const { unreadByRequestId } = useChatSocket();
  const listRef = useRef<HTMLUListElement | null>(null);
  const [indicator, setIndicator] = useState<IndicatorRect | null>(null);
  // Почему: описания пунктов занимают место — по умолчанию скрыты, включаются иконкой в шапке.
  const [showDescriptions, setShowDescriptions] = useState(false);
  const isServicesRoute = useMemo(
    () => pathname === SERVICES_GROUP.hrefPrefix || pathname.startsWith(`${SERVICES_GROUP.hrefPrefix}/`),
    [pathname]
  );
  const [servicesOpen, setServicesOpen] = useState<boolean>(false);
  const unreadTotal = useMemo(
    () => Object.values(unreadByRequestId).reduce((acc, value) => acc + value, 0),
    [unreadByRequestId]
  );

  // Почему: один «ездящий» индикатор вместо бордера на каждом пункте — плавно двигаем top/height.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      setIndicator(null);
      return;
    }

    const updateIndicator = () => {
      const active = list.querySelector<HTMLElement>('[data-nav-active="true"]');
      if (!active) {
        setIndicator(null);
        return;
      }
      const listRect = list.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      setIndicator({
        top: activeRect.top - listRect.top + list.scrollTop,
        height: activeRect.height,
      });
    };

    updateIndicator();

    const resizeObserver = new ResizeObserver(updateIndicator);
    resizeObserver.observe(list);
    for (const child of list.querySelectorAll<HTMLElement>("[data-nav-item]")) {
      resizeObserver.observe(child);
    }

    return () => resizeObserver.disconnect();
  }, [pathname, collapsed, servicesOpen, showDescriptions]);

  const toggleButton = (
    <Tooltip title={collapsed ? "Развернуть меню" : "Свернуть меню"}>
      <span>
        <IconButton
          size="small"
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
          onClick={onToggleCollapsed}
          disabled={!onToggleCollapsed}
        >
          {collapsed ? <ChevronRightRoundedIcon fontSize="small" /> : <ChevronLeftRoundedIcon fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        width: "100%",
        overflow: "hidden",
        borderColor: "divider",
        position: { md: "sticky" },
        top: { md: SITE_STICKY_TOP_PX },
      }}
    >
      <Box
        sx={{
          px: collapsed ? 1 : 2.5,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 1,
        }}
      >
        {collapsed ? null : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, minWidth: 0 }}>
            <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "0.08em" }}>
              Pro
            </Typography>
            <Tooltip title={showDescriptions ? "Скрыть описания" : "Показать описания"} placement="right">
              <IconButton
                size="small"
                aria-label={showDescriptions ? "Скрыть описания" : "Показать описания"}
                aria-pressed={showDescriptions}
                onClick={() => setShowDescriptions((value) => !value)}
                sx={{ color: "text.disabled" }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        {toggleButton}
      </Box>

      <Divider />

      <List dense disablePadding ref={listRef} sx={{ position: "relative" }}>
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            left: 0,
            top: indicator?.top ?? 0,
            width: "1px",
            height: indicator?.height ?? 0,
            bgcolor: "warning.main",
            opacity: indicator ? 1 : 0,
            transition: "top 0.28s ease, height 0.28s ease, opacity 0.2s ease",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {NAV_ITEMS.map((item) => {
          const selected =
            pathname === item.href || (item.href === "/pro" && pathname.startsWith("/pro/requests/"));
          const badgeEnabled = item.href === "/pro";
          const icon = badgeEnabled ? (
            <Badge color="error" badgeContent={unreadTotal} max={99} invisible={unreadTotal === 0}>
              {item.icon}
            </Badge>
          ) : (
            item.icon
          );
          const title = item.description ? `${item.label} — ${item.description}` : item.label;

          const button = (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={selected}
              data-nav-item=""
              data-nav-active={selected ? "true" : undefined}
              aria-label={collapsed ? title : undefined}
              sx={{
                px: collapsed ? 1 : 2.5,
                py: collapsed ? 1.25 : 1.5,
                alignItems: collapsed || !showDescriptions ? "center" : "flex-start",
                justifyContent: collapsed ? "center" : "flex-start",
                ...SELECTED_NAV_SX,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? "unset" : 36,
                  mt: collapsed || !showDescriptions ? 0 : 0.25,
                  justifyContent: "center",
                }}
              >
                {icon}
              </ListItemIcon>
              {collapsed ? null : (
                <ListItemText
                  primary={item.label}
                  secondary={showDescriptions ? item.description : undefined}
                  slotProps={{
                    primary: { sx: { fontWeight: selected ? 700 : 600 } },
                    secondary: NAV_SECONDARY_TYPOGRAPHY_PROPS
                  }} />
              )}
            </ListItemButton>
          );

          return collapsed ? (
            <Tooltip key={item.href} title={title} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          );
        })}

        {collapsed ? (
          <>
            {SERVICES_GROUP.items.map((item) => {
              const isCreateRoute = pathname === "/pro/services/create";
              const selected =
                item.href === "/pro/services/create" ? isCreateRoute : isServicesRoute && !isCreateRoute;
              const title = `${SERVICES_GROUP.label}: ${item.label}`;
              const button = (
                <ListItemButton
                  key={item.href}
                  component={Link}
                  href={item.href}
                  selected={selected}
                  data-nav-item=""
                  data-nav-active={selected ? "true" : undefined}
                  aria-label={title}
                  sx={{
                    px: 1,
                    py: 1.25,
                    alignItems: "center",
                    justifyContent: "center",
                    ...SELECTED_NAV_SX,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: "unset", justifyContent: "center" }}>{item.icon}</ListItemIcon>
                </ListItemButton>
              );

              return (
                <Tooltip key={item.href} title={title} placement="right">
                  {button}
                </Tooltip>
              );
            })}
          </>
        ) : (
          <>
            <ListItemButton
              component={Link}
              href="/pro/services/list"
              selected={isServicesRoute}
              data-nav-item=""
              // Почему: индикатор на родителе только если подменю закрыто — иначе едет к дочернему пункту.
              data-nav-active={isServicesRoute && !servicesOpen ? "true" : undefined}
              sx={{
                px: 2.5,
                py: 1.5,
                alignItems: showDescriptions ? "flex-start" : "center",
                ...SELECTED_NAV_SX,
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, mt: showDescriptions ? 0.25 : 0 }}>
                {SERVICES_GROUP.icon}
              </ListItemIcon>
              <ListItemText
                primary={SERVICES_GROUP.label}
                secondary={showDescriptions ? SERVICES_GROUP.description : undefined}
                slotProps={{
                  primary: { sx: { fontWeight: isServicesRoute ? 700 : 600 } },
                  secondary: NAV_SECONDARY_TYPOGRAPHY_PROPS
                }} />
              <IconButton
                size="small"
                aria-label={servicesOpen ? "Свернуть" : "Раскрыть"}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setServicesOpen((value) => !value);
                }}
              >
                {servicesOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </ListItemButton>

            <Collapse in={servicesOpen} timeout="auto" unmountOnExit>
              <List dense disablePadding>
                {SERVICES_GROUP.items.map((item) => {
                  const selected = pathname === item.href;
                  return (
                    <ListItemButton
                      key={item.href}
                      component={Link}
                      href={item.href}
                      selected={selected}
                      data-nav-item=""
                      data-nav-active={selected ? "true" : undefined}
                      sx={{
                        pl: 5,
                        pr: 2.5,
                        py: 1.1,
                        ...SELECTED_NAV_SX,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        slotProps={{
                          primary: { sx: { fontWeight: selected ? 700 : 600 } }
                        }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Collapse>
          </>
        )}
      </List>
    </Paper>
  );
}
