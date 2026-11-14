"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
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
import { useAppSelector } from "@/core/store/hooks";
import { getActiveMembership } from "@/core/auth/authorization";
import {
  useColorMode,
  type ColorPreference,
} from "@/core/theme/ColorModeContext";

type Props = {
  titleId: string;
  provider: boolean;
  authenticated: boolean;
  onBack: () => void;
  onNavigate: () => void;
};

const groupSx = {
  bgcolor: { xs: "background.paper", tablet: "transparent" },
  borderRadius: { xs: "24px", tablet: 0 },
  overflow: "hidden",
};

export function CabinetSettingsPanel({
  titleId,
  provider,
  authenticated,
  onBack,
  onNavigate,
}: Props) {
  const { preference, setPreference } = useColorMode();
  const isEmployee = useAppSelector(
    (state) => getActiveMembership(state.auth.user)?.role === "EMPLOYEE",
  );
  const managesProvider = provider && !isEmployee;
  const row = (href: string, label: string, icon: ReactNode) => (
    <ListItemButton
      key={href}
      component={Link}
      href={href}
      onClick={onNavigate}
      sx={{
        minHeight: 50,
        px: 1,
        gap: "14px",
        color: "text.primary",
        "&:not(:last-child)": {
          borderBottom: { xs: 1, tablet: 0 },
          borderColor: "divider",
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: 24,
          color: "text.secondary",
        }}
      >
        {icon}
      </ListItemIcon>
      <ListItemText
        primary={label}
        slotProps={{ primary: { sx: { fontSize: "1rem" } } }}
      />
      <ChevronRightRounded
        sx={{
          color: "text.secondary",
          fontSize: 20,
        }}
      />
    </ListItemButton>
  );

  return (
    <Box
      component="section"
      role="region"
      aria-labelledby={provider ? `${titleId}-heading` : titleId}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onBack();
        }
      }}
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      {provider ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1,
            pb: 1.5,
          }}
        >
          <Typography
            id={`${titleId}-heading`}
            component="h2"
            sx={{
              color: "text.primary",
              fontSize: "1.25rem",
              fontWeight: 700,
            }}
          >
            Настройки
          </Typography>
          <IconButton
            aria-label="Закрыть настройки"
            onClick={onBack}
            sx={{
              color: "text.primary",
            }}
          >
            <CloseRounded />
          </IconButton>
        </Box>
      ) : null}
      <Box
        sx={{
          overflowY: "auto",
          overscrollBehavior: "contain",
          flex: 1,
          minHeight: 0,
          px: 0,
          pt: 0,
          pb: "max(24px, env(safe-area-inset-bottom))",
        }}
      >
        {authenticated ? (
          <>
            <Typography
              sx={{
                color: "text.secondary",
                mb: 1,
                px: 1,
              }}
            >
              Мой профиль
            </Typography>
            <List disablePadding sx={groupSx} aria-label="Мой профиль">
              {managesProvider
                ? row(
                    "/pro/settings/profile/verification",
                    "Подтверждение профиля",
                    <VerifiedOutlined />,
                  )
                : null}
              {managesProvider
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
        {provider && isEmployee ? (
          <List disablePadding sx={groupSx} aria-label="Настройки работы">
            {row("/pro/settings/messengers", "Мессенджеры", <ChatOutlined />)}
          </List>
        ) : null}
        {managesProvider ? (
          <>
            <Typography
              sx={{
                color: "text.secondary",
                mt: 3,
                mb: 1,
                px: 1,
              }}
            >
              Работа
            </Typography>
            <List disablePadding sx={groupSx} aria-label="Настройки работы">
              {row("/pro/services/create", "Добавить услугу", <AddRounded />)}
              {row(
                "/pro/team/add-manager",
                "Команда",
                <PersonAddOutlined />,
              )}
              {row("/pro/settings/messengers", "Мессенджеры", <ChatOutlined />)}
              {row("/pro/settings/tariff", "Тариф", <LocalOfferOutlined />)}
              {row(
                "/pro/settings/promotion",
                "Продвижение",
                <TrendingUpOutlined />,
              )}
            </List>
            <Typography
              sx={{
                color: "text.secondary",
                mt: 3,
                mb: 1,
                px: 1,
              }}
            >
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
        <Typography
          sx={{
            color: "text.secondary",
            mt: 3,
            mb: 1,
            px: 1,
          }}
        >
          Внешний вид
        </Typography>
        <Box
          sx={{
            ...groupSx,
            p: 1.5,
          }}
        >
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
          <List
            disablePadding
            sx={{
              ...groupSx,
              mt: 3,
            }}
          >
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
    </Box>
  );
}
