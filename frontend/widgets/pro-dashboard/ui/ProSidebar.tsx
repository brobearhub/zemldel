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

export function ProSidebar() {
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
      <Box sx={{ px: 2.5, py: 2 }}>
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "0.08em" }}>
          Pro
        </Typography>
      </Box>

      <Divider />

      <List dense disablePadding>
        {NAV_ITEMS.map((item, index) => {
          const selected =
            pathname === item.href ||
            (item.href === "/pro" && pathname.startsWith("/pro/requests/"));
          const badgeEnabled = item.href === "/pro";
          const icon = badgeEnabled ? (
            <Badge color="error" badgeContent={unreadTotal} max={99} invisible={unreadTotal === 0}>
              {item.icon}
            </Badge>
          ) : (
            item.icon
          );
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={selected}
              sx={{
                px: 2.5,
                py: 1.5,
                alignItems: "flex-start",
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
              <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>{icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={item.description}
                primaryTypographyProps={{ fontWeight: selected ? 700 : 600 }}
                secondaryTypographyProps={{ sx: { mt: 0.25 } }}
              />
            </ListItemButton>
          );
        })}

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
      </List>
    </Paper>
  );
}
