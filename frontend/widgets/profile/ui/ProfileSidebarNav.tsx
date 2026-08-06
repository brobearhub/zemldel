"use client";

import Link from "next/link";
import {
  Badge,
  Box,
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
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { SITE_STICKY_TOP_PX } from "@/shared/config/site-layout";

export type ProfileNavSection = "profile" | "orders" | "requests" | "documents";

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

type NavItem = {
  key: Exclude<ProfileNavSection, "orders">;
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
  isSelected: (selected: ProfileNavSection) => boolean;
};

const NAV_ITEMS: readonly NavItem[] = [
  {
    key: "requests",
    href: "/profile?section=requests",
    label: "Заявки",
    description: "Все ваши заявки",
    icon: <AssignmentTurnedInOutlinedIcon />,
    isSelected: (selected) => selected === "requests" || selected === "orders",
  },
  {
    key: "documents",
    href: "/profile?section=documents",
    label: "Документы",
    description: "Личные документы",
    icon: <DescriptionOutlinedIcon />,
    isSelected: (selected) => selected === "documents",
  },
  {
    key: "profile",
    href: "/profile?section=profile",
    label: "Профиль",
    description: "Личные данные",
    icon: <PersonOutlineOutlinedIcon />,
    isSelected: (selected) => selected === "profile",
  },
];

type Props = {
  selected: ProfileNavSection;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Если передан — секции переключаются колбэком (сохраняет query), иначе через Link. */
  onSelectSection?: (section: Exclude<ProfileNavSection, "orders">) => void;
  requestsUnreadCount?: number;
};

export function ProfileSidebarNav({
  selected,
  collapsed = false,
  onToggleCollapsed,
  onSelectSection,
  requestsUnreadCount = 0,
}: Props) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const [indicator, setIndicator] = useState<IndicatorRect | null>(null);
  // Почему: описания пунктов занимают место — по умолчанию скрыты, включаются иконкой в шапке.
  const [showDescriptions, setShowDescriptions] = useState(false);

  // Почему: один «ездящий» индикатор — плавно двигаем top/height при смене пункта.
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
  }, [selected, collapsed, showDescriptions]);

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
              Профиль
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
          const isSelected = item.isSelected(selected);
          const title = `${item.label} — ${item.description}`;
          const icon =
            item.key === "requests" ? (
              <Badge
                color="error"
                badgeContent={requestsUnreadCount}
                max={99}
                invisible={requestsUnreadCount === 0}
              >
                {item.icon}
              </Badge>
            ) : (
              item.icon
            );

          const button = (
            <ListItemButton
              key={item.key}
              {...(onSelectSection
                ? { onClick: () => onSelectSection(item.key) }
                : { component: Link, href: item.href })}
              selected={isSelected}
              data-nav-item=""
              data-nav-active={isSelected ? "true" : undefined}
              aria-label={collapsed ? title : undefined}
              sx={{
                px: collapsed ? 1 : 2.5,
                py: collapsed ? 1.25 : 1.5,
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                ...SELECTED_NAV_SX,
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? "unset" : 36, justifyContent: "center" }}>
                {icon}
              </ListItemIcon>
              {collapsed ? null : (
                <ListItemText
                  primary={item.label}
                  secondary={showDescriptions ? item.description : undefined}
                  primaryTypographyProps={{ fontWeight: isSelected ? 700 : 600 }}
                  secondaryTypographyProps={NAV_SECONDARY_TYPOGRAPHY_PROPS}
                />
              )}
            </ListItemButton>
          );

          return collapsed ? (
            <Tooltip key={item.key} title={title} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          );
        })}
      </List>
    </Paper>
  );
}
