import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import type { ReactNode } from "react";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";
import DynamicFeedOutlinedIcon from "@mui/icons-material/DynamicFeedOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import DataSaverOnIcon from "@mui/icons-material/DataSaverOn";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import PeopleOutlineOutlinedIcon from "@mui/icons-material/PeopleOutlineOutlined";

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
    label: "Команда",
    icon: <PeopleOutlineOutlinedIcon />,
    active: (pathname) => pathname === "/pro/team/add-manager",
  },
  {
    href: "/pro/partners",
    label: "Партнёры",
    icon: <HandshakeOutlinedIcon />,
    active: (pathname) => pathname.startsWith("/pro/partners"),
  },
  {
    href: "/pro/team/tasks",
    label: "Задачи команды",
    icon: null,
    active: (pathname) => pathname === "/pro/team/tasks",
  },
];

export const INTEREST_ITEM: SidebarNavItem = {
  href: "/pro/interest",
  label: "Интерес клиентов",
  icon: <FavoriteBorderRoundedIcon />,
  active: (path) => path.startsWith("/pro/interest"),
};

export const NAV_ITEMS: readonly SidebarNavItem[] = [
  {
    href: "/pro/services",
    label: "Услуги",
    icon: <FormatListBulletedOutlinedIcon />,
    active: (path) => path.startsWith("/pro/services"),
  },
  {
    href: "/pro/documents",
    label: "Документы",
    icon: <DescriptionOutlinedIcon />,
    active: (path) => path.startsWith("/pro/documents"),
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
