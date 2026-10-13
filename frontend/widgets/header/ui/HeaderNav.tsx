"use client";

import { Suspense } from "react";
import { Box, Typography } from "@mui/material";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import Link from "next/link";
import { useAppSelector } from "@/core/store/hooks";
import { ProfileMenu } from "./ProfileMenu";

const NAV_ITEMS = [
  { label: "Заявки", icon: AssignmentTurnedInOutlinedIcon, href: "/profile?section=requests" },
  // { label: "Избранное", icon: FavoriteBorderRoundedIcon, href: "#favorites" },
  // { label: "Корзина", icon: ShoppingCartOutlinedIcon, href: "#cart" },
] as const;

type HeaderNavProps = {
  /** В меню-гамбургере подписи видны и пункты идут столбиком. */
  readonly showLabels?: boolean;
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

export const HeaderNav = ({ showLabels = false, onNavigate }: HeaderNavProps) => {
  const isAuthenticated = useAppSelector((state) => state.auth.status === "authenticated");
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
      {NAV_ITEMS.map(({ label, icon: Icon, href }) => (
        <Box
          key={label}
          component={Link}
          href={href}
          aria-label={label}
          onClick={onNavigate}
          sx={navItemSx(showLabels)}
        >
          <Icon sx={{ fontSize: { xs: 22, sm: 24 }, color: "common.gray", "&:hover": { color: "info.main" } }} />
          <Typography
            className="nav-label"
            variant="body2"
            sx={{
              color: "common.gray",
              display: showLabels ? "block" : { xs: "none", md: "block" },
              fontWeight: 600,
              fontSize: 12,
              opacity: 1,
              "&:hover": { color: "info.main" },
            }}
          >
            {label}
          </Typography>
        </Box>
      ))}
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
          <PersonAddIcon sx={{ fontSize: { xs: 22, sm: 24 }, color: "common.gray" }} />
          <Typography
            className="nav-label"
            variant="body2"
            sx={{
              color: "common.gray",
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Регистрация
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
};
