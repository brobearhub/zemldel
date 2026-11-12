"use client";

import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import type { ReactNode } from "react";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import DynamicFeedOutlinedIcon from "@mui/icons-material/DynamicFeedOutlined";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import PeopleOutlineOutlinedIcon from "@mui/icons-material/PeopleOutlineOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import DataSaverOnIcon from "@mui/icons-material/DataSaverOn";

export type CabinetRole = "customer" | "provider";

export type CabinetNavItem = {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  isActive: (ctx: {
    pathname: string;
    searchParams: URLSearchParams;
  }) => boolean;
  badgeKind?: "chatUnreadTotal";
};

function isProfileSection(searchParams: URLSearchParams, section: string) {
  return (searchParams.get("section") ?? "requests") === section;
}

export const CUSTOMER_NAV: {
  desktop: readonly CabinetNavItem[];
  mobileTop: readonly CabinetNavItem[];
  mobileBottom: readonly CabinetNavItem[];
  mobileMore: readonly CabinetNavItem[];
} = {
  desktop: [
    {
      key: "chat",
      label: "Чаты",
      href: "/profile/chats",
      icon: <ChatOutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/profile/chats"),
      badgeKind: "chatUnreadTotal",
    },
    {
      key: "requests",
      label: "Заявки",
      href: "/profile?section=requests",
      icon: <DynamicFeedOutlinedIcon />,
      isActive: ({ pathname, searchParams }) =>
        pathname.startsWith("/profile/requests/") ||
        (pathname === "/profile" &&
          (isProfileSection(searchParams, "requests") ||
            isProfileSection(searchParams, "orders"))),
      badgeKind: "chatUnreadTotal",
    },
    {
      key: "documents",
      label: "Документы",
      href: "/profile?section=documents",
      icon: <DescriptionOutlinedIcon />,
      isActive: ({ pathname, searchParams }) =>
        pathname === "/profile" &&
        isProfileSection(searchParams, "documents"),
    },
    {
      key: "stories",
      label: "Сторисы",
      href: "/profile?section=stories",
      icon: <DataSaverOnIcon />,
      isActive: ({ pathname, searchParams }) =>
        pathname === "/profile" &&
        isProfileSection(searchParams, "stories") && searchParams.get("view") !== "saved",
    },
    {
      key: "profile",
      label: "Профиль",
      href: "/profile?section=profile",
      icon: <PersonOutlineOutlinedIcon />,
      isActive: ({ pathname, searchParams }) =>
        pathname === "/profile" &&
        isProfileSection(searchParams, "profile"),
    },
  ],
  mobileTop: [
    {
      key: "requests",
      label: "Заявки",
      href: "/profile?section=requests",
      icon: <DynamicFeedOutlinedIcon />,
      isActive: ({ pathname, searchParams }) =>
        pathname.startsWith("/profile/requests/") ||
        (pathname === "/profile" &&
          (isProfileSection(searchParams, "requests") ||
            isProfileSection(searchParams, "orders"))),
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
      icon: <DynamicFeedOutlinedIcon />,
      isActive: ({ pathname, searchParams }) =>
        pathname.startsWith("/profile/requests/") ||
        (pathname === "/profile" &&
          (isProfileSection(searchParams, "requests") ||
            isProfileSection(searchParams, "orders"))),
      badgeKind: "chatUnreadTotal",
    },
    {
      key: "chat",
      label: "Чат",
      href: "/profile/chats",
      icon: <ChatOutlinedIcon />,
      isActive: ({ pathname }) => pathname.startsWith("/profile/chats"),
      badgeKind: "chatUnreadTotal",
    },
    {
      key: "profile",
      label: "Профиль",
      href: "/profile?section=profile",
      icon: <PersonOutlineOutlinedIcon />,
      isActive: ({ pathname, searchParams }) =>
        pathname === "/profile" &&
        isProfileSection(searchParams, "profile"),
    },
  ],
  mobileMore: [
    {
      key: "documents",
      label: "Документы",
      href: "/profile?section=documents",
      icon: <DescriptionOutlinedIcon />,
      isActive: ({ pathname, searchParams }) =>
        pathname === "/profile" &&
        isProfileSection(searchParams, "documents"),
    },
    {
      key: "stories",
      label: "Сторисы",
      href: "/profile?section=stories",
      icon: <DataSaverOnIcon />,
      isActive: ({ pathname, searchParams }) =>
        pathname === "/profile" &&
        isProfileSection(searchParams, "stories") && searchParams.get("view") !== "saved",
    },
  ],
};

const providerFeed: CabinetNavItem = {
  key: "feed",
  label: "Лента заявок",
  href: "/pro/requests/feed",
  icon: <DynamicFeedOutlinedIcon />,
  isActive: ({ pathname }) => pathname === "/pro/requests/feed",
};
const providerBoard: CabinetNavItem = {
  key: "requests",
  label: "Доска",
  href: "/pro/requests/board",
  icon: <ViewKanbanOutlinedIcon />,
  isActive: ({ pathname }) =>
    pathname.startsWith("/pro/requests/") && pathname !== "/pro/requests/feed",
  badgeKind: "chatUnreadTotal",
};
const providerServices: CabinetNavItem = {
  key: "services",
  label: "Услуги",
  href: "/pro/services",
  icon: <FormatListBulletedOutlinedIcon />,
  isActive: ({ pathname }) => pathname.startsWith("/pro/services"),
};
const providerSections: readonly CabinetNavItem[] = [
  {
    key: "clients",
    label: "Клиенты",
    href: "/pro/clients",
    icon: <Groups2OutlinedIcon />,
    isActive: ({ pathname }) => pathname.startsWith("/pro/clients"),
  },
  {
    key: "team",
    label: "Команда",
    href: "/pro/team/add-manager",
    icon: <PeopleOutlineOutlinedIcon />,
    isActive: ({ pathname }) => pathname.startsWith("/pro/team/"),
  },
  {
    key: "stories",
    label: "Сторисы",
    href: "/pro/stories",
    icon: <DataSaverOnIcon />,
    isActive: ({ pathname }) => pathname.startsWith("/pro/stories"),
  },
  {
    key: "overview",
    label: "Обзор",
    href: "/pro/overview",
    icon: <DashboardOutlinedIcon />,
    isActive: ({ pathname }) => pathname.startsWith("/pro/overview"),
  },
  {
    key: "settings",
    label: "Настройки",
    href: "/pro/settings",
    icon: <SettingsOutlinedIcon />,
    isActive: ({ pathname }) => pathname.startsWith("/pro/settings"),
  },
];
export const PROVIDER_NAV = {
  desktop: [providerFeed, providerBoard, providerServices, ...providerSections],
  mobileTop: [providerBoard],
  mobileBottom: [
    {
      key: "home",
      label: "Главная",
      href: "/",
      icon: <HomeOutlinedIcon />,
      isActive: ({ pathname }: { pathname: string }) => pathname === "/",
    },
    {
      ...providerFeed,
      label: "Заявки",
      isActive: ({ pathname }: { pathname: string }) =>
        pathname.startsWith("/pro/requests"),
    },
    providerServices,
    {
      key: "chat",
      label: "Чаты",
      href: "/pro/chats",
      icon: <ChatOutlinedIcon />,
      isActive: ({ pathname }: { pathname: string }) =>
        pathname.startsWith("/pro/chats"),
      badgeKind: "chatUnreadTotal" as const,
    },
  ],
  mobileMore: providerSections,
};

export const PROVIDER_HEADER_NAV: readonly CabinetNavItem[] = [
  {
    key: "home",
    label: "Главная",
    href: "/",
    icon: <HomeOutlinedIcon />,
    isActive: ({ pathname }) => pathname === "/",
  },
  {
    key: "services",
    label: "Услуги",
    href: "/pro/services",
    icon: <FormatListBulletedOutlinedIcon />,
    isActive: ({ pathname }) => pathname.startsWith("/pro/services"),
  },
  {
    key: "requests",
    label: "Заявки",
    href: "/pro/requests/feed",
    icon: <DynamicFeedOutlinedIcon />,
    isActive: ({ pathname }) =>
      pathname === "/pro/requests/feed" ||
      pathname.startsWith("/pro/requests") ||
      pathname.startsWith("/pro/workday"),
    badgeKind: "chatUnreadTotal",
  },
  ...PROVIDER_NAV.desktop.filter((item) => item.key === "stories"),
];

export const CUSTOMER_FAVORITES_NAV: readonly CabinetNavItem[] = [
  { key: "favorite-services", label: "Услуги", href: "/profile/favorites/services", icon: <FavoriteBorderRoundedIcon />, isActive: ({ pathname }) => pathname === "/profile/favorites/services" },
  { key: "favorite-providers", label: "Исполнители", href: "/profile/favorites/providers", icon: <PersonOutlineOutlinedIcon />, isActive: ({ pathname }) => pathname === "/profile/favorites/providers" },
  { key: "favorite-stories", label: "Сторис", href: "/profile?section=stories&view=saved", icon: <DataSaverOnIcon />, isActive: ({ pathname, searchParams }) => pathname === "/profile" && searchParams.get("section") === "stories" && searchParams.get("view") === "saved" },
];
