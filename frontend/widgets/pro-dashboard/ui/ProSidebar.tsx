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
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { useMemo, useState } from "react";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";

const NAV_ITEMS = [
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
] as const;

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

type Props = {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function ProSidebar({ collapsed = false, onToggleCollapsed }: Props) {
  const pathname = usePathname();
  const { unreadByRequestId } = useChatSocket();
  const isServicesRoute = useMemo(
    () => pathname === SERVICES_GROUP.hrefPrefix || pathname.startsWith(`${SERVICES_GROUP.hrefPrefix}/`),
    [pathname]
  );
  const [servicesOpen, setServicesOpen] = useState<boolean>(true);
  const unreadTotal = useMemo(
    () => Object.values(unreadByRequestId).reduce((acc, value) => acc + value, 0),
    [unreadByRequestId]
  );

  const toggleButton = (
    <Tooltip title={collapsed ? "Развернуть меню" : "Свернуть меню"}>
      <span>
        <IconButton
          size="small"
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
          onClick={onToggleCollapsed}
          disabled={!onToggleCollapsed}
        >
          {collapsed ? <ChevronLeftRoundedIcon fontSize="small" /> : <ChevronRightRoundedIcon fontSize="small" />}
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
        top: { md: 112 },
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
          <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "0.08em" }}>
            Pro
          </Typography>
        )}
        {toggleButton}
      </Box>

      <Divider />

      <List dense disablePadding>
        {NAV_ITEMS.map((item, index) => {
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
              aria-label={collapsed ? title : undefined}
              sx={{
                px: collapsed ? 1 : 2.5,
                py: collapsed ? 1.25 : 1.5,
                alignItems: collapsed ? "center" : "flex-start",
                justifyContent: collapsed ? "center" : "flex-start",
                "&.Mui-selected": {
                  bgcolor: "action.selected",
                  "&:hover": { bgcolor: "action.selected" },
                },
                ...(index === 0 && {
                  borderBottom: "1px solid",
                  borderBottomColor: "divider",
                }),
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? "unset" : 36,
                  mt: collapsed ? 0 : 0.25,
                  justifyContent: "center",
                }}
              >
                {icon}
              </ListItemIcon>
              {collapsed ? null : (
                <ListItemText
                  primary={item.label}
                  secondary={item.description}
                  primaryTypographyProps={{ fontWeight: selected ? 700 : 600 }}
                  secondaryTypographyProps={{ sx: { mt: 0.25 } }}
                />
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
                  aria-label={title}
                  sx={{
                    px: 1,
                    py: 1.25,
                    alignItems: "center",
                    justifyContent: "center",
                    "&.Mui-selected": {
                      bgcolor: "action.selected",
                      "&:hover": { bgcolor: "action.selected" },
                    },
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
              sx={{
                px: 2.5,
                py: 1.5,
                alignItems: "flex-start",
                "&.Mui-selected": {
                  bgcolor: "action.selected",
                  "&:hover": { bgcolor: "action.selected" },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>{SERVICES_GROUP.icon}</ListItemIcon>
              <ListItemText
                primary={SERVICES_GROUP.label}
                secondary={SERVICES_GROUP.description}
                primaryTypographyProps={{ fontWeight: isServicesRoute ? 700 : 600 }}
                secondaryTypographyProps={{ sx: { mt: 0.25 } }}
              />
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
                      sx={{
                        pl: 5,
                        pr: 2.5,
                        py: 1.1,
                        "&.Mui-selected": {
                          bgcolor: "action.selected",
                          "&:hover": { bgcolor: "action.selected" },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontWeight: selected ? 700 : 600 }}
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
