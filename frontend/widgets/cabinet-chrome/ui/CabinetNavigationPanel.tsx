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
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import ChatOutlined from "@mui/icons-material/ChatOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
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
import { resolveAccountKind } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import { UnreadCountBadge } from "@/shared/ui/UnreadCountBadge";
import { useChatSocket } from "@/widgets/chat/socket/ChatSocketContext";
import { HeaderCity } from "@/widgets/header/ui/HeaderCity";
import { CUSTOMER_NAV, CUSTOMER_FAVORITES_NAV } from "@/widgets/cabinet-chrome/model/nav-config";
import {
  NAV_ITEMS,
  REQUEST_ITEMS,
  TEAM_ITEMS,
} from "@/widgets/pro-dashboard/model/navigation";
import { ProviderNotificationsButton } from "@/widgets/cabinet-chrome/ui/ProviderHeaderStatus";
import { CustomerNotificationsButton } from "./CustomerNotificationsButton";
import { attentionDotSx, attentionTextSx } from "@/shared/ui/attention-gradient";
import { usePassportRequestsPending } from "@/widgets/customer-documents/model/PassportRequestsProvider";

type Props = {
  collapsed?: boolean;
  titleId: string;
  onNavigate: () => void;
};

/** Shared navigation content for the mobile drawer and desktop sidebar. */
export function CabinetNavigationPanel({
  collapsed = false,
  titleId,
  onNavigate: close,
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
          color: "text.primary",
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
          color: key === "sign-out" ? "error.main" : "text.primary",
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
            color: "text.secondary",
            fontWeight: 500,
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
          display: collapsed ? "none" : "block",
          height: "var(--cabinet-navigation-top-height, auto)",
          boxSizing: "border-box",
          px: 1.25,
          pr: 2.75,
          mr: -1.5,
          pb: 1,
          mb: 1,
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        {!authenticated ? (
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
          {provider ? (
            <ProviderNotificationsButton
              label="Напоминания"
              buttonSize={44}
              onNavigate={close}
            />
          ) : authenticated ? <CustomerNotificationsButton onNavigate={close} /> : null}
        </Box>
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
          {row("/", "Главная", <HomeOutlined />)}
          {authenticated
            ? row(
                provider ? "/pro/chats" : "/profile/chats",
                "Чаты",
                <ChatOutlined />,
                pathname.startsWith(provider ? "/pro/chats" : "/profile/chats"),
                unreadTotal,
              )
            : null}
        </List>
        {provider ? (
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
              ].map((item) =>
                row(
                  item.href,
                  item.label,
                  item.icon || <AssignmentOutlined />,
                  item.active(pathname),
                ),
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
                    gap: 0.5,
                    width: "100%",
                    "& .MuiToggleButtonGroup-grouped": {
                      m: 0,
                      border: 0,
                      borderRadius: "12px !important",
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
                      title={collapsed ? label : ""}
                      placement="right"
                    >
                      <ToggleButton
                        value={value}
                        aria-label={label}
                        sx={{
                          flex: collapsed ? "none" : 1,
                          width: collapsed ? 48 : "auto",
                          minWidth: 0,
                          minHeight: collapsed ? 44 : 68,
                          px: 0.25,
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                          color: "text.primary",
                          textTransform: "none",
                          fontSize: "0.75rem",
                          lineHeight: 1.2,
                          "&.Mui-selected": {
                            bgcolor: "action.selected",
                            color: "text.primary",
                          },
                        }}
                      >
                        {icon}
                        {collapsed ? null : label}
                      </ToggleButton>
                    </Tooltip>
                  ))}
                </ToggleButtonGroup>
              </Box>,
            )}
            <List disablePadding>
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
        {group(
          "Земледел",
          <>
            {row("/about", "О проекте и контакты", <InfoOutlined />)}
            {user?.systemRole === "PLATFORM_ADMIN"
              ? row(
                  "/admin",
                  "Админка",
                  <AdminPanelSettingsOutlined />,
                  pathname.startsWith("/admin"),
                )
              : null}
          </>,
        )}
      </Box>
    </>
  );
}
