"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { Box, Button, IconButton, Typography } from "@mui/material";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import {
  getActiveMembership,
  resolveAccountKind,
} from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import { formatProviderIdentity } from "@/entities/provider/lib/provider-identity";
import { CdnOptimizedAvatar } from "@/shared/ui/cdn-image";

type Props = {
  titleId: string;
  collapsed?: boolean;
  settingsOpen?: boolean;
  onOpenSettings: () => void;
  onBack: () => void;
  onNavigate: () => void;
  onToggleCollapsed: () => void;
};

export function CabinetSidebarFooter({
  titleId,
  collapsed = false,
  settingsOpen = false,
  onOpenSettings,
  onBack,
  onNavigate: close,
  onToggleCollapsed: dismiss,
}: Props) {
  const { status, user } = useAppSelector((state) => state.auth);
  const authenticated = status === "authenticated";
  const provider = authenticated && resolveAccountKind(user) === "PROVIDER";
  const customer = authenticated && !provider;
  const customerProfileHref = "/profile?section=profile";
  const membership = provider ? getActiveMembership(user) : null;
  const identity = membership ? formatProviderIdentity(membership) : null;
  const title = identity?.title || user?.name || "Мой профиль";
  const providerKindLabel =
    membership?.providerType === "SOLE_PROPRIETOR"
      ? "Индивидуальный предприниматель"
      : identity?.kindLabel || "Исполнитель";
  const avatar = identity ? membership?.providerImage : user?.image;
  const initials =
    identity?.initials ||
    user?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("") ||
    "Я";

  const backButton = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (settingsOpen) backButton.current?.focus();
  }, [settingsOpen]);

  return (
    <Box
      component="footer"
      role="group"
      aria-label={settingsOpen ? "Панель настроек" : "Панель профиля"}
      onKeyDown={(event) => {
        if (settingsOpen && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onBack();
        }
      }}
      sx={{
        flexShrink: 0,
        mt: "auto",
        display: "flex",
        alignItems: "center",
        gap: authenticated ? 1 : 1.5,
        flexDirection: collapsed ? "column" : "row",
        pt: 1.5,
        pb: "max(16px, env(safe-area-inset-bottom))",
        px: 1,
        pr: collapsed ? 1.75 : 2.5,
        mr: collapsed ? -0.75 : -1.5,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <IconButton
        component={customer ? Link : "button"}
        href={customer ? customerProfileHref : undefined}
        aria-label={customer ? `Профиль: ${title}` : settingsOpen ? "Аватар профиля" : "Настройки"}
        onClick={customer ? close : settingsOpen ? onBack : onOpenSettings}
        title={customer ? `Профиль: ${title}` : authenticated ? title : "Настройки"}
        sx={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          flexShrink: 0,
        }}
      >
        {authenticated ? (
          <CdnOptimizedAvatar
            sizes="40px"
            src={avatar || undefined}
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: "background.paper",
              color: "text.primary",
              fontSize: "0.875rem",
              fontWeight: 800,
            }}
          >
            {initials}
          </CdnOptimizedAvatar>
        ) : (
          <SettingsOutlined />
        )}
      </IconButton>
      {(authenticated || settingsOpen) && !collapsed ? (
        <Box
          component={customer ? Link : "button"}
          type={customer ? undefined : "button"}
          href={customer ? customerProfileHref : undefined}
          aria-label={customer ? `Профиль: ${title}` : settingsOpen ? "Настройки" : `Настройки: ${title}`}
          onClick={customer ? close : settingsOpen ? onBack : onOpenSettings}
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 44,
            p: 0,
            border: 0,
            bgcolor: "transparent",
            font: "inherit",
            textAlign: "left",
            cursor: "pointer",
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "text.primary",
              outlineOffset: 4,
            },
          }}
        >
          {!settingsOpen ? (
            <Typography
              component="p"
              noWrap
              title={provider ? providerKindLabel : "Клиент"}
              sx={{
                mb: 0.25,
                fontSize: "0.6875rem",
                lineHeight: 1.4,
                color: "text.secondary",
              }}
            >
              {provider ? providerKindLabel : "Клиент"}
            </Typography>
          ) : null}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 0.5,
            }}
          >
            <Typography
              id={titleId}
              component="h2"
              title={settingsOpen ? "Настройки" : title}
              sx={{
                minWidth: 0,
                fontSize: settingsOpen && provider ? "1.125rem" : "0.875rem",
                fontWeight: 700,
                lineHeight: 1.35,
                color: "text.primary",
                overflowWrap: "anywhere",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
              }}
            >
              {settingsOpen ? "Настройки" : title}
            </Typography>
          </Box>
        </Box>
      ) : null}
      {!authenticated && !settingsOpen ? (
        <Button
          component={Link}
          href="/signin"
          onClick={close}
          variant="contained"
          disableElevation
          sx={{
            flex: "0 1 auto",
            ml: collapsed ? 0 : "auto",
            minWidth: 0,
            minHeight: 48,
            borderRadius: "28px",
            px: 1.5,
            fontSize: "0.875rem",
            bgcolor: (theme) =>
              theme.palette.mode === "light" ? "#242522" : "#f5f6f2",
            color: (theme) =>
              theme.palette.mode === "light" ? "#fff" : "#242522",
            "&:hover": { bgcolor: "text.secondary" },
          }}
        >
          Войти
        </Button>
      ) : null}
      {authenticated || settingsOpen ? (
        <IconButton
          aria-label={
            settingsOpen
              ? "Назад в меню"
              : collapsed
                ? "Развернуть меню"
                : "Свернуть меню"
          }
          title={
            settingsOpen
              ? "Назад в меню"
              : collapsed
                ? "Развернуть меню"
                : "Свернуть меню"
          }
          ref={backButton}
          onClick={settingsOpen ? onBack : dismiss}
          sx={{
            ml: collapsed ? 0 : "auto",
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: 0,
            color: "text.secondary",
          }}
        >
          {collapsed ? <ChevronRightRounded /> : <ChevronLeftRounded />}
        </IconButton>
      ) : null}
    </Box>
  );
}
