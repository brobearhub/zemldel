"use client";

import { usePathname } from "next/navigation";
import { Box, Typography } from "@mui/material";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import { useAppSelector } from "@/core/store/hooks";
import { getActiveMembership } from "@/core/auth/authorization";
import { useCitySelect, useSelectedCity } from "@/features/select-city";

export function HeaderCity() {
  const pathname = usePathname();
  const { status, user } = useAppSelector((s) => s.auth);
  const { openCitySelect } = useCitySelect();

  const inPro = pathname === "/pro" || pathname.startsWith("/pro/");
  const activeMembership = user ? getActiveMembership(user) : null;

  const customerSelected = useSelectedCity("customer");
  const providerSelected = useSelectedCity("provider");

  const city = inPro ? providerSelected : customerSelected;
  const label = city ? city.name : "Выбрать локацию";
  const scope = inPro && status === "authenticated" && user && activeMembership?.providerId ? "provider" : "customer";

  return (
    <Box
      component="button"
      type="button"
      aria-label="Локация"
      onClick={() => openCitySelect(scope)}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: { xs: 0.75, sm: 1 },
        py: 0.75,
        borderRadius: 1,
        border: 0,
        cursor: "pointer",
        bgcolor: "transparent",
        textAlign: "left",
        "&:hover": {
          color: "primary.main",
          "& .city-label": { opacity: 1 },
        },
      }}
    >
      <LocationOnOutlinedIcon sx={{ fontSize: { xs: 20, sm: 22 }, color: "common.gray" }} />
      <Typography
        className="city-label"
        variant="body2"
        sx={{
          color: "common.gray",
          display: { xs: "none", md: "block" },
          fontWeight: 600,
          fontSize: 12,
          opacity: 1,
          maxWidth: 140,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}>
        {label}
      </Typography>
    </Box>
  );
}

