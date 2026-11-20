"use client";

import LandscapeOutlined from "@mui/icons-material/LandscapeOutlined";
import { Suspense } from "react";
import { Box, Typography } from "@mui/material";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import Link from "next/link";
import { resolveAccountKind } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import { ProfileMenu } from "./ProfileMenu";

const NAV_ITEMS = [
  { label: "Участки", icon: LandscapeOutlined, href: "/lands" },
  {
    label: "Заявки",
    icon: AssignmentTurnedInOutlinedIcon,
    href: "/profile?section=requests",
  },
] as const;

type HeaderNavProps = {
  /** В меню-гамбургере подписи видны и пункты идут столбиком. */
  readonly showLabels?: boolean;
  readonly showLandLink?: boolean;
  readonly onNavigate?: () => void;
};

const navItemSx = (showLabels: boolean) =>
  ({
    display: "flex",
    flexDirection: showLabels ? "row" : "column",
    alignItems: "center",
    gap: showLabels ? 1.5 : 0.25,
    minHeight: showLabels ? 44 : undefined,
    px: { xs: 0.75, sm: 1 },
    py: 0.75,
    borderRadius: 1,
    textDecoration: "none",
    "&:hover": {
      color: "primary.main",
      "& .nav-label": { opacity: 1, color: "info.main" },
      "& .MuiSvgIcon-root": { color: "info.main" },
      "& .MuiTypography-root": { color: "info.main" },
    },
  }) as const;

export const HeaderNav = ({
  showLabels = false,
  showLandLink = true,
  onNavigate,
}: HeaderNavProps) => {
  const isProvider = useAppSelector(
    (state) => resolveAccountKind(state.auth.user) === "PROVIDER",
  );
  const isAuthenticated = useAppSelector(
    (state) => state.auth.status === "authenticated",
  );
  /** Why: регистрация — сосед пунктов drawer, а не вложенный пункт «Войти». */
  const showSignUp = showLabels && !isAuthenticated;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: showLabels ? "column" : "row",
        alignItems: showLabels ? "stretch" : "center",
        gap: showLabels ? 0.5 : { xs: 0, sm: 0.5, md: 1 },
        flex: { xs: "0 0 auto", md: "0 0 auto" },
      }}
    >
      {NAV_ITEMS.filter((item) => showLandLink || item.href !== "/lands").map(
        ({ label, icon: Icon, href }) => (
          <Box
            key={label}
            component={Link}
            href={isProvider && href !== "/lands" ? "/pro/requests/feed" : href}
            aria-label={label}
            onClick={onNavigate}
            sx={navItemSx(showLabels)}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: { xs: 28, sm: 32 },
              }}
            >
              <Icon
                sx={{
                  fontSize: { xs: 22, sm: 24 },
                  color: "common.gray",
                  "&:hover": { color: "info.main" },
                }}
              />
            </Box>
            <Typography
              className="nav-label"
              variant="body2"
              sx={{
                color: "common.gray",
                display: showLabels ? "block" : { xs: "none", md: "block" },
                fontWeight: 600,
                fontSize: showLabels ? "1rem" : "0.625rem",
                opacity: 1,
                "&:hover": { color: "info.main" },
              }}
            >
              {label}
            </Typography>
          </Box>
        ),
      )}
      <Suspense fallback={null}>
        <ProfileMenu
          showLabel
          forceLabel={showLabels}
          onNavigate={onNavigate}
          layout={showLabels ? "inline" : "popover"}
        />
      </Suspense>
      {showSignUp ? (
        <Box
          component={Link}
          href="/signup"
          aria-label="Регистрация"
          onClick={onNavigate}
          sx={navItemSx(true)}
        >
          <PersonAddIcon
            sx={{ fontSize: { xs: 22, sm: 24 }, color: "common.gray" }}
          />
          <Typography
            className="nav-label"
            variant="body2"
            sx={{
              color: "common.gray",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            Регистрация
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
};
