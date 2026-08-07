"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

type Props = {
  href: string;
  label: string;
  icon: ReactNode;
  selected: boolean;
  badge?: number;
  size: "desktop" | "mobile";
};

export function CabinetNavItem({ href, label, icon, selected, badge, size }: Props) {
  const tone = selected ? "common.white" : "common.gray";

  return (
    <Box
      component={Link}
      href={href}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: tone,
        textDecoration: "none",
        px: size === "desktop" ? 1.5 : 1,
        py: size === "desktop" ? 1 : 0.75,
        borderRadius: 2,
        transition: "background-color 0.2s ease, color 0.2s ease",
        ...(size === "desktop"
          ? {
              "&:hover": {
                bgcolor: (theme) => alpha(theme.palette.common.white, 0.06),
              },
            }
          : {}),
      }}
    >
      {size === "desktop" ? (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
          <Badge color="error" badgeContent={badge ?? 0} max={99} invisible={!badge}>
            <Box sx={{ display: "inline-flex", alignItems: "center" }}>{icon}</Box>
          </Badge>
          <Typography
            variant="body2"
            sx={{
              fontWeight: selected ? 600 : 500,
              color: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25, minWidth: 64 }}>
          <Badge color="error" badgeContent={badge ?? 0} max={99} invisible={!badge}>
            <Box sx={{ display: "inline-flex", alignItems: "center", color: "inherit" }}>{icon}</Box>
          </Badge>
          <Typography
            variant="caption"
            sx={{
              fontSize: 11,
              lineHeight: 1.1,
              fontWeight: selected ? 600 : 500,
              color: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

