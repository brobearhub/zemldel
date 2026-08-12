"use client";

import { Box, Typography } from "@mui/material";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import Link from "next/link";
import { ProfileMenu } from "./ProfileMenu";

const NAV_ITEMS = [
  { label: "Заказы", icon: ShoppingBagOutlinedIcon, href: "#orders" },
  { label: "Избранное", icon: FavoriteBorderRoundedIcon, href: "#favorites" },
  { label: "Корзина", icon: ShoppingCartOutlinedIcon, href: "#cart" },
] as const;

export const HeaderNav = () => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: { xs: 0, sm: 0.5, md: 1 },
      flex: { xs: "0 0 auto", md: "0 0 auto" },
    }}
  >
    {NAV_ITEMS.map(({ label, icon: Icon, href }) => (
      <Box
        key={label}
        component={Link}
        href={href}
        aria-label={label}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.25,
          px: { xs: 0.75, sm: 1 },
          py: 0.75,
          borderRadius: 1.5,
          textDecoration: "none",
          "&:hover": {
            color: "primary.main",
            "& .nav-label": { opacity: 1, color: "info.main" },
            "& .MuiSvgIcon-root": { color: "info.main" },
            "& .MuiTypography-root": { color: "info.main" },
          },
        }}
      >
        <Icon sx={{ fontSize: { xs: 22, sm: 24 }, color: "common.gray", "&:hover": { color: "info.main" } }} />
        <Typography
          color="common.gray"
          className="nav-label"
          variant="body2"
          sx={{
            display: { xs: "none", md: "block" },
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
    <ProfileMenu showLabel />
  </Box>
);
