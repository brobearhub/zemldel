"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Typography } from "@mui/material";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import { useAppSelector } from "@/core/store/hooks";
import { getActiveMembership } from "@/core/auth/authorization";

export function HeaderCity() {
  const pathname = usePathname();
  const { status, user } = useAppSelector((s) => s.auth);

  if (status !== "authenticated" || !user) {
    return null;
  }

  const inPro = pathname === "/pro" || pathname.startsWith("/pro/");
  const activeMembership = getActiveMembership(user);

  const city = inPro ? activeMembership?.providerCity ?? null : user.customerCity ?? null;
  const label = city ? city.name : "Выбрать локацию";

  return (
    <Box
      component={Link}
      href="/profile?section=profile"
      aria-label="Локация"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: { xs: 0.75, sm: 1 },
        py: 0.75,
        borderRadius: 1.5,
        textDecoration: "none",
        "&:hover": {
          color: "primary.main",
          "& .city-label": { opacity: 1 },
        },
      }}
    >
      <LocationOnOutlinedIcon sx={{ fontSize: { xs: 20, sm: 22 }, color: "common.gray" }} />
      <Typography
        className="city-label"
        color="common.gray"
        variant="body2"
        sx={{
          display: { xs: "none", md: "block" },
          fontWeight: 600,
          fontSize: 12,
          opacity: 1,
          maxWidth: 140,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

