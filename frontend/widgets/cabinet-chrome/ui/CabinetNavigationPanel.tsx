"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Box,
  Badge,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import ChatOutlined from "@mui/icons-material/ChatOutlined";
import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import SettingsBrightnessOutlined from "@mui/icons-material/SettingsBrightnessOutlined";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import {
  useColorMode,
  type ColorPreference,
} from "@/core/theme/ColorModeContext";
import { DarkPaletteSelect } from "@/core/theme/DarkPaletteSelect";
import { getActiveMembership, resolveAccountKind } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import { UnreadCountBadge } from "@/shared/ui/UnreadCountBadge";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";
import { HeaderCity } from "@/widgets/header/ui/HeaderCity";
import { HeaderLogo } from "@/widgets/header/ui/HeaderLogo";
import {
  CUSTOMER_FAVORITES_NAV,
  CUSTOMER_HOME_NAV,
  CUSTOMER_NAV,
} from "@/widgets/cabinet-chrome/model/nav-config";
import {
  INTEREST_ITEM,
  NAV_ITEMS,
  REQUEST_ITEMS,
  TEAM_ITEMS,
} from "@/widgets/pro-dashboard/model/navigation";
import { attentionDotSx, attentionTextSx } from "@/shared/ui/attention-gradient";
import { usePassportRequestsPending } from "@/widgets/customer-documents/model/PassportRequestsProvider";

type Props = {
  collapsed?: boolean;
  titleId: string;
  onNavigate: () => void;
  showCollapsedLogo?: boolean;
};

/** Shared navigation content for the mobile drawer and desktop sidebar. */
export function CabinetNavigationPanel({
  collapsed = false,
  titleId,
  onNavigate: close,
  showCollapsedLogo = false,
}: Props) {
  const pathname = usePathname();
  const query = useSearchParams()?.toString() ?? "";
  const { status, user } = useAppSelector((state) => state.auth);
  const { preference, setPreference } = useColorMode();
  const authenticated = status === "authenticated";
  const chatUnread = useChatSocket();
  const unreadByRequestId = chatUnread.unreadByConversationId ?? chatUnread.unreadByRequestId;
  const unreadTotal = Object.values(unreadByRequestId).reduce(
    (total, count) => total + count,
    0,
  );
  const isEmployee = getActiveMembership(user)?.role === "EMPLOYEE";
  const provider = authenticated && resolveAccountKind(user) === "PROVIDER";
  const passportRequested = usePassportRequestsPending();
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
    needsAttention = false,
  ) => (
    <Tooltip key={href} title={collapsed ? label : ""} placement="right">
      <ListItemButton
        key={href}
        component={Link}
        href={href}
        onClick={close}
        selected={selected}
        aria-current={selected ? "page" : undefined}
        aria-label={
          needsAttention ? `${label}, запрошен доступ к паспорту` : unreadCount > 0
            ? `${label}, непрочитанных сообщений: ${unreadCount}`
            : label
        }
        sx={{
          minHeight: 50,
          px: 1.25,
          py: 1,
          gap: collapsed ? 0 : 1.5,
          justifyContent: collapsed ? "center" : "flex-start",
          borderRadius: "14px",
          mb: 0.25,
          color: "text.secondary",
          "&.Mui-selected": {
            bgcolor: "action.selected",
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 24,
            color: "inherit",
            "& .MuiSvgIcon-root": { fontSize: 24 },
          }}
        >
          {collapsed && needsAttention ? (
            <Badge
              variant="dot"
              color="error"
              sx={{
                "& .MuiBadge-badge": attentionDotSx,
              }}
            >
              {icon}
            </Badge>
          ) : unreadCount > 0 ? (
            <UnreadCountBadge count={unreadCount}>{icon}</UnreadCountBadge>
          ) : (
            icon
          )}
        </ListItemIcon>
        {collapsed ? null : (
          <ListItemText
            primary={(
              <Badge
                variant="dot"
                color="error"
                invisible={!needsAttention}
                sx={{
                  "& .MuiBadge-badge": {
                    ...attentionDotSx,
                    top: 5,
                    right: -7,
                  },
                }}
              >
                <Box
                  component="span"
                  sx={needsAttention ? attentionTextSx : undefined}
                >
                  {label}
                </Box>
              </Badge>
            )}
            slotProps={{
              primary: {
                noWrap: true,
                sx: { fontSize: "1rem", fontWeight: selected ? 700 : 500 },
              },
            }}
          />
        )}
      </ListItemButton>
    </Tooltip>
  );
  const actionRow = (
    key: string,
    label: string,
    icon: ReactNode,
    onClick: () => void,
    selected = false,
  ) => (
    <Tooltip key={key} title={collapsed ? label : ""} placement="right">
      <ListItemButton
        onClick={onClick}
        selected={selected}
        aria-label={label}
        aria-pressed={key.startsWith("theme-") ? selected : undefined}
        sx={{
          minHeight: 50,
          px: 1.25,
          py: 1,
          gap: collapsed ? 0 : 1.5,
          justifyContent: collapsed ? "center" : "flex-start",
          borderRadius: "14px",
          mb: 0.25,
          color: key === "sign-out" ? "error.main" : "text.secondary",
          "&.Mui-selected": { bgcolor: "action.selected" },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 24,
            color: "inherit",
          }}
        >
          {icon}
        </ListItemIcon>
        {collapsed ? null : (
          <ListItemText
            primary={label}
            slotProps={{
              primary: {
                sx: {
                  fontSize: "1rem",
                  fontWeight: selected ? 700 : 500,
                },
              },
            }}
          />
        )}
      </ListItemButton>
    </Tooltip>
  );
  const group = (label: string, items: ReactNode) => (
    <Box sx={{ mt: 2 }}>
      {collapsed ? (
        <Box sx={{ borderTop: 1, borderColor: "divider", mx: 1, mb: 1 }} />
      ) : (
        <Typography
          component="h3"
          sx={{
            px: 1.25,
            mb: 0.75,
            fontSize: "0.875rem",
            color: "text.primary",
            fontWeight: 800,
          }}
        >
          {label}
        </Typography>
      )}
      <List disablePadding aria-label={label}>
        {items}
      </List>
    </Box>
  );

  return (
    <>
      <Box
        sx={{
          height: "var(--cabinet-navigation-top-height, auto)",
          boxSizing: "border-box",
          pl: 2.75,
          pr: 2.75,
          ml: collapsed ? -0.75 : -1.5,
          mr: collapsed ? -0.75 : -1.5,
          pb: 1,
          mb: 1,
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
          ...(collapsed && showCollapsedLogo && {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "& a": { mr: 0 },
          }),
        }}
      >
        {collapsed && showCollapsedLogo ? <HeaderLogo compact /> : null}
        {!collapsed && !authenticated ? (
          <Typography
            id={titleId}
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
        {!collapsed ? (
          <Box
            sx={{
              mt: 0.5,
              ml: -1,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "text.secondary",
            }}
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <HeaderCity showLabel scope={provider ? "provider" : undefined} />
            </Box>
          </Box>
        ) : null}
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
          {row(CUSTOMER_HOME_NAV.href, CUSTOMER_HOME_NAV.label, CUSTOMER_HOME_NAV.icon)}
          {authenticated && !isEmployee
            ? row(
                isEmployee ? "/pro/assigned" : provider ? "/pro/chats" : "/profile/chats",
                "Чаты",
                <ChatOutlined />,
                pathname.startsWith(provider ? "/pro/chats" : "/profile/chats"),
                unreadTotal,
              )
            : null}
        </List>
        {isEmployee ? group("Работа", row("/pro/assigned", "Назначенные заявки", <AssignmentOutlined />, pathname.startsWith("/pro/assigned"))) : provider ? (
          <>
            {group(
              "Заявки",
              REQUEST_ITEMS.map((item) =>
                row(item.href, item.label, item.icon, item.active(pathname)),
              ),
            )}
            {group(
              "Работа",
              [
                ...NAV_ITEMS,
                ...TEAM_ITEMS.filter((item) => item.href === "/pro/team/tasks"),
                INTEREST_ITEM,
              ].map((item) =>
                row(
                  item.href,
                  item.label,
                  item.icon || <AssignmentOutlined />,
                  item.active(pathname),
                ),
              ),
            )}
            {group(
              "Команда и партнёры",
              TEAM_ITEMS.filter((item) => item.href !== "/pro/team/tasks").map((item) =>
                row(item.href, item.label, item.icon, item.active(pathname)),
              ),
            )}
          </>
        ) : authenticated ? (
          <>
            {group(
              "Личный кабинет",
              CUSTOMER_NAV.desktop
                .filter((item) => item.key !== "chat")
                .map((item) =>
                  row(
                    item.href,
                    item.key === "profile" ? "Мой профиль" : item.label,
                    item.icon,
                    item.isActive(routeContext),
                    0,
                    item.key === "documents" && passportRequested,
                  ),
                ),
            )}
            {group("Избранное", CUSTOMER_FAVORITES_NAV.map(item => row(item.href, item.label, item.icon, item.isActive(routeContext))))}
            {group(
              "Внешний вид",
              <Box
                component="li"
                sx={{
                  display: "block",
                  px: collapsed ? 0 : 0.5,
                  listStyle: "none",
                }}
              >
                <ToggleButtonGroup
                  exclusive
                  orientation={collapsed ? "vertical" : "horizontal"}
                  value={preference}
                  onChange={(_, value: ColorPreference | null) => {
                    if (value) setPreference(value);
                  }}
                  role="group"
                  aria-label="Тема оформления"
                  sx={{
                    display: "flex",
                    flexDirection: collapsed ? "column" : "row",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "space-between",
                    gap: collapsed ? 0.25 : 0,
                    width: "100%",
                    "& .MuiToggleButtonGroup-grouped": {
                      m: 0,
                      border: 0,
                      borderRadius: collapsed ? "14px !important" : "12px !important",
                    },
                  }}
                >
                  {([
                    {
                      value: "light",
                      label: "Светлая",
                      icon: <LightModeOutlined />,
                    },
                    {
                      value: "dark",
                      label: "Тёмная",
                      icon: <DarkModeOutlined />,
                    },
                    {
                      value: "system",
                      label: "Системная",
                      icon: <SettingsBrightnessOutlined />,
                    },
                  ] as const).map(({ value, label, icon }) => (
                    <Tooltip
                      key={value}
                      title={label}
                      placement="right"
                    >
                      <ToggleButton
                        value={value}
                        aria-label={label}
                        sx={{
                          width: collapsed ? "100%" : 40,
                          minWidth: 0,
                          height: collapsed ? 50 : 40,
                          p: 1,
                          display: "flex",
                          justifyContent: "center",
                          color: "text.primary",
                          textTransform: "none",
                          whiteSpace: "nowrap",
                          "&.Mui-selected": {
                            bgcolor: "action.selected",
                            color: "text.primary",
                          },
                        }}
                      >
                        {icon}
                      </ToggleButton>
                    </Tooltip>
                  ))}
                </ToggleButtonGroup>
                {preference !== "light" ? (
                  <Box
                    sx={{
                      mt: collapsed ? 0.25 : 2,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      minHeight: collapsed ? 50 : 0,
                    }}
                  >
                    <DarkPaletteSelect compact={collapsed} />
                  </Box>
                ) : null}
              </Box>,
            )}
            <List
              disablePadding
              sx={{ mt: 2 }}
            >
              {actionRow("sign-out", "Выйти", <LogoutRounded />, () => {
                close();
                void signOut({ callbackUrl: "/" });
              })}
            </List>
          </>
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
        {user?.systemRole === "PLATFORM_ADMIN" ? (
          <List disablePadding>
            {row(
              "/admin",
              "Админка",
              <AdminPanelSettingsOutlined />,
              pathname.startsWith("/admin"),
            )}
          </List>
        ) : null}
      </Box>
    </>
  );
}
