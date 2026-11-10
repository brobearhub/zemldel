"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import VerifiedOutlined from "@mui/icons-material/VerifiedOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import ChatOutlined from "@mui/icons-material/ChatOutlined";
import LocalOfferOutlined from "@mui/icons-material/LocalOfferOutlined";
import TrendingUpOutlined from "@mui/icons-material/TrendingUpOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import SettingsBrightnessOutlined from "@mui/icons-material/SettingsBrightnessOutlined";
import AddRounded from "@mui/icons-material/AddRounded";
import PersonAddOutlined from "@mui/icons-material/PersonAddOutlined";
import {
  useColorMode,
  type ColorPreference,
} from "@/core/theme/ColorModeContext";

type Props = {
  open: boolean;
  provider: boolean;
  authenticated: boolean;
  onClose: () => void;
  onNavigate: () => void;
};

const groupSx = {
  bgcolor: "background.paper",
  borderRadius: "24px",
  overflow: "hidden",
};

export function MobileSettingsSheet({
  open,
  provider,
  authenticated,
  onClose,
  onNavigate,
}: Props) {
  const { preference, setPreference } = useColorMode();
  const row = (href: string, label: string, icon: ReactNode) => (
    <ListItemButton
      key={href}
      component={Link}
      href={href}
      onClick={onNavigate}
      sx={{
        minHeight: 58,
        px: 2,
        gap: 1.5,
        color: "text.primary",
        "&:not(:last-child)": { borderBottom: 1, borderColor: "divider" },
      }}
    >
      <ListItemIcon sx={{
        minWidth: 24,
        color: "text.secondary",
      }}>
        {icon}
      </ListItemIcon>
      <ListItemText
        primary={label}
        slotProps={{ primary: { sx: { fontSize: "1rem" } } }}
      />
      <ChevronRightRounded sx={{
        color: "text.secondary",
        fontSize: 20,
      }} />
    </ListItemButton>
  );

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          role: "dialog",
          "aria-modal": true,
          "aria-labelledby": "mobile-settings-title",
          sx: {
            height: "calc(100dvh - 16px)",
            maxHeight: "calc(100dvh - env(safe-area-inset-top) - 16px)",
            borderRadius: "32px",
            bgcolor: (theme) =>
              theme.palette.mode === "light" ? "#f5f6f2" : "background.default",
            backgroundImage: "none",
            overflow: "hidden",
          },
        },
      }}
      sx={{ zIndex: 1500 }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "44px 1fr 44px",
          alignItems: "center",
          gap: 1,
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <IconButton
          aria-label="Закрыть настройки"
          onClick={onClose}
          sx={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: 1,
            borderColor: "divider",
          }}
        >
          <CloseRounded />
        </IconButton>
        <Typography
          id="mobile-settings-title"
          component="h2"
          sx={{
            fontSize: "1.25rem",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          Настройки
        </Typography>
      </Box>
      <Box
        sx={{
          overflowY: "auto",
          overscrollBehavior: "contain",
          flex: 1,
          px: 2,
          pt: 2.5,
          pb: "max(24px, env(safe-area-inset-bottom))",
        }}
      >
        {authenticated ? (
          <>
            <Typography sx={{
              color: "text.secondary",
              mb: 1,
              px: 1,
            }}>
              Мой профиль
            </Typography>
            <List disablePadding sx={groupSx} aria-label="Мой профиль">
              {provider
                ? row(
                    "/pro/settings/profile/verification",
                    "Подтверждение профиля",
                    <VerifiedOutlined />,
                  )
                : null}
              {provider
                ? row(
                    "/pro/settings/profile",
                    "Профиль исполнителя",
                    <PersonOutlineRounded />,
                  )
                : null}
              {row(
                provider ? "/pro/settings/account" : "/profile?section=profile",
                "Мои данные",
                <BadgeOutlined />,
              )}
              {row(
                provider
                  ? "/pro/settings/account#security"
                  : "/profile?section=profile#security",
                "Вход и безопасность",
                <LockOutlined />,
              )}
            </List>
          </>
        ) : null}
        {provider ? (
          <>
            <Typography sx={{
              color: "text.secondary",
              mt: 3,
              mb: 1,
              px: 1,
            }}>
              Работа
            </Typography>
            <List disablePadding sx={groupSx} aria-label="Настройки работы">
              {row("/pro/services/create", "Добавить услугу", <AddRounded />)}
              {row("/pro/team/add-manager", "Добавление менеджера", <PersonAddOutlined />)}
              {row("/pro/settings/messengers", "Мессенджеры", <ChatOutlined />)}
              {row("/pro/settings/tariff", "Тариф", <LocalOfferOutlined />)}
              {row(
                "/pro/settings/promotion",
                "Продвижение",
                <TrendingUpOutlined />,
              )}
            </List>
            <Typography sx={{
              color: "text.secondary",
              mt: 3,
              mb: 1,
              px: 1,
            }}>
              Шаблоны
            </Typography>
            <List disablePadding sx={groupSx} aria-label="Шаблоны">
              {row(
                "/pro/settings/templates/replies",
                "Ответы клиенту",
                <DescriptionOutlined />,
              )}
              {row(
                "/pro/settings/templates/stage-statuses",
                "Статусы этапов",
                <DescriptionOutlined />,
              )}
            </List>
          </>
        ) : null}
        <Typography sx={{
          color: "text.secondary",
          mt: 3,
          mb: 1,
          px: 1,
        }}>
          Внешний вид
        </Typography>
        <Box sx={{
          ...groupSx,
          p: 1.5,
        }}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={preference}
            onChange={(_, value: ColorPreference | null) => {
              if (value) setPreference(value);
            }}
            aria-label="Тема оформления"
            sx={{
              gap: 1,
              "& .MuiToggleButtonGroup-grouped": {
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "16px !important",
                m: 0,
              },
            }}
          >
            {(
              [
                {
                  value: "light",
                  label: "Светлая",
                  icon: <LightModeOutlined />,
                },
                { value: "dark", label: "Тёмная", icon: <DarkModeOutlined /> },
                {
                  value: "system",
                  label: "Системная",
                  icon: <SettingsBrightnessOutlined />,
                },
              ] as const
            ).map((item) => (
              <ToggleButton
                key={item.value}
                value={item.value}
                aria-label={item.label}
                sx={{
                  flexDirection: "column",
                  gap: 1,
                  py: 2,
                  px: 0.5,
                  textTransform: "none",
                  fontSize: "0.8125rem",
                }}
              >
                {item.icon}
                {item.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
        {authenticated ? (
          <List disablePadding sx={{
            ...groupSx,
            mt: 3,
          }}>
            <ListItemButton
              onClick={() => void signOut({ callbackUrl: "/" })}
              sx={{
                minHeight: 58,
                gap: 1.5,
                color: "error.main",
              }}
            >
              <LogoutRounded />
              <ListItemText primary="Выйти" />
            </ListItemButton>
          </List>
        ) : null}
      </Box>
    </Drawer>
  );
}
