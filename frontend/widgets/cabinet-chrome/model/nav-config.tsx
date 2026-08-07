"use client";

import type { ReactNode } from "react";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import DynamicFeedOutlinedIcon from "@mui/icons-material/DynamicFeedOutlined";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import PeopleOutlineOutlinedIcon from "@mui/icons-material/PeopleOutlineOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

export type CabinetRole = "customer" | "provider";

export type CabinetNavItem = {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  isActive: (ctx: { pathname: string; searchParams: URLSearchParams }) => boolean;
  badgeKind?: "chatUnreadTotal";
};

function isProfileSection(searchParams: URLSearchParams, section: string) {
  return (searchParams.get("section") ?? "requests") === section;
}

export const CUSTOMER_NAV: {
  desktop: readonly CabinetNavItem[];
  mobileTop: readonly CabinetNavItem[];
  mobileBottom: readonly CabinetNavItem[];
} = {
  desktop: [
    {
      key: "requests",
      label: "Заявки",
      href: "/profile?section=requests",
      icon: <AssignmentTurnedInOutlinedIcon />,
      isActive: ({ pathname, searchParams }) =>
        pathname.startsWith("/profile") &&
        (isProfileSection(searchParams, "requests") || isProfileSection(searchParams, "orders")),
      badgeKind: "chatUnreadTotal",
    },
    {
      key: "documents",
      label: "Документы",
      href: "/profile?section=documents",
      icon: <DescriptionOutlinedIcon />,
      isActive: ({ pathname, searchParams }) =>
        pathname.startsWith("/profile") && isProfileSection(searchParams, "documents"),
    },
    {
      key: "profile",
      label: "Профиль",
      href: "/profile?section=profile",
      icon: <PersonOutlineOutlinedIcon />,
      isActive: ({ pathname, searchParams }) =>
        pathname.startsWith("/profile") && isProfileSection(searchParams, "profile"),
    },
  ],
  mobileTop: [
    {
      key: "requests",
      label: "Заявки",
      href: "/profile?section=requests",
      icon: <AssignmentTurnedInOutlinedIcon />,
      isActive: ({ pathname, searchParams }) =>
        pathname.startsWith("/profile") &&
        (isProfileSection(searchParams, "requests") || isProfileSection(searchParams, "orders")),
      badgeKind: "chatUnreadTotal",
    },
  ],
  mobileBottom: [
    {
      key: "home",
      label: "Домой",
      href: "/",
      icon: <HomeOutlinedIcon />,
      isActive: ({ pathname }) => pathname === "/",
    },
    {
      key: "requests",
      label: "Заявки",
      href: "/profile?section=requests",
      icon: <AssignmentTurnedInOutlinedIcon />,
      isActive: ({ pathname, searchParams }) =>
        pathname.startsWith("/profile") &&
        (isProfileSection(searchParams, "requests") || isProfileSection(searchParams, "orders")),
      badgeKind: "chatUnreadTotal",
    },
    {
      key: "documents",
      label: "Документы",
      href: "/profile?section=documents",
      icon: <DescriptionOutlinedIcon />,
      isActive: ({ pathname, searchParams }) =>
        pathname.startsWith("/profile") && isProfileSection(searchParams, "documents"),
    },
    {
      key: "profile",
      label: "Профиль",
      href: "/profile?section=profile",
      icon: <PersonOutlineOutlinedIcon />,
      isActive: ({ pathname, searchParams }) =>
        pathname.startsWith("/profile") && isProfileSection(searchParams, "profile"),
    },
    {
      key: "chat",
      label: "Чат",
      href: "/chats",
      icon: <ChatOutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/chats"),
      badgeKind: "chatUnreadTotal",
    },
  ],
};

export const PROVIDER_NAV: {
  desktop: readonly CabinetNavItem[];
  mobileTop: readonly CabinetNavItem[];
  mobileBottom: readonly CabinetNavItem[];
} = {
  desktop: [
    {
      key: "requests",
      label: "Заявки",
      href: "/pro",
      icon: <DynamicFeedOutlinedIcon />,
      isActive: ({ pathname }) => pathname === "/pro" || pathname.startsWith("/pro/requests"),
      badgeKind: "chatUnreadTotal",
    },
    {
      key: "workday",
      label: "Рабочий день",
      href: "/pro/workday",
      icon: <TodayOutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/pro/workday"),
    },
    {
      key: "overview",
      label: "Обзор",
      href: "/pro/overview",
      icon: <DashboardOutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/pro/overview"),
    },
    {
      key: "team",
      label: "Команда",
      href: "/pro/team",
      icon: <PeopleOutlineOutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/pro/team"),
    },
    {
      key: "clients",
      label: "Клиенты",
      href: "/pro/clients",
      icon: <Groups2OutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/pro/clients"),
    },
    {
      key: "reminders",
      label: "Напоминания",
      href: "/pro/reminders",
      icon: <NotificationsNoneOutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/pro/reminders"),
    },
    {
      key: "services",
      label: "Услуги",
      href: "/pro/services/list",
      icon: <BuildOutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/pro/services"),
    },
    {
      key: "settings",
      label: "Настройки",
      href: "/pro/settings",
      icon: <SettingsOutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/pro/settings"),
    },
  ],
  mobileTop: [
    {
      key: "requests",
      label: "Заявки",
      href: "/pro",
      icon: <DynamicFeedOutlinedIcon />,
      isActive: ({ pathname }) => pathname === "/pro" || pathname.startsWith("/pro/requests"),
      badgeKind: "chatUnreadTotal",
    },
    {
      key: "workday",
      label: "Рабочий день",
      href: "/pro/workday",
      icon: <TodayOutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/pro/workday"),
    },
  ],
  mobileBottom: [
    {
      key: "home",
      label: "Домой",
      href: "/",
      icon: <HomeOutlinedIcon />,
      isActive: ({ pathname }) => pathname === "/",
    },
    {
      key: "overview",
      label: "Обзор",
      href: "/pro/overview",
      icon: <DashboardOutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/pro/overview"),
    },
    {
      key: "team",
      label: "Команда",
      href: "/pro/team",
      icon: <PeopleOutlineOutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/pro/team"),
    },
    {
      key: "clients",
      label: "Клиенты",
      href: "/pro/clients",
      icon: <Groups2OutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/pro/clients"),
    },
    {
      key: "reminders",
      label: "Напоминания",
      href: "/pro/reminders",
      icon: <NotificationsNoneOutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/pro/reminders"),
    },
    {
      key: "services",
      label: "Услуги",
      href: "/pro/services/list",
      icon: <BuildOutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/pro/services"),
    },
    {
      key: "settings",
      label: "Настройки",
      href: "/pro/settings",
      icon: <SettingsOutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/pro/settings"),
    },
    {
      key: "chat",
      label: "Чат",
      href: "/chats",
      icon: <ChatOutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/chats"),
      badgeKind: "chatUnreadTotal",
    },
  ],
};

