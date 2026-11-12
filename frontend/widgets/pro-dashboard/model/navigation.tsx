import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import type { ReactNode } from "react";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";
import DynamicFeedOutlinedIcon from "@mui/icons-material/DynamicFeedOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import DataSaverOnIcon from "@mui/icons-material/DataSaverOn";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  active: (pathname: string) => boolean;
};

export const CHAT_ITEM: SidebarNavItem = {
  href: "/pro/chats",
  label: "Чаты",
  icon: <ChatBubbleOutlineRoundedIcon />,
  active: (pathname) =>
    pathname === "/pro/chats" || pathname.startsWith("/pro/chats/"),
};

export const REQUEST_ITEMS: readonly SidebarNavItem[] = [
  {
    href: "/pro/requests/feed",
    label: "Лента заявок",
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

export const TEAM_ITEMS: readonly SidebarNavItem[] = [
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

export const NAV_ITEMS: readonly SidebarNavItem[] = [
  { href: "/pro/interest", label: "Интерес клиентов", icon: <FavoriteBorderRoundedIcon />, active: path => path.startsWith("/pro/interest") },
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
