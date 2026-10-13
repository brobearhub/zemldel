"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

type Props = {
  href?: string;
  onClick?: () => void;
  expanded?: boolean;
  label: string;
  icon: ReactNode;
  selected: boolean;
  badge?: number;
  size: "desktop" | "mobile";
};

export function CabinetNavItem({ href, onClick, expanded, label, icon, selected, badge, size }: Props) {
  const tone = size === "mobile" ? "secondary.main" : selected ? "text.primary" : "text.secondary";
  const interactive = href
    ? { component: Link, href }
    : {
        component: "button" as const,
        type: "button" as const,
        onClick,
        "aria-haspopup": "dialog" as const,
        "aria-expanded": Boolean(expanded),
      };

  return (
    <Box
      {...interactive}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: tone,
        textDecoration: "none",
        border: 0,
        bgcolor: "transparent",
        font: "inherit",
        cursor: "pointer",
        outline: "none",
        "&:focus, &:focus-visible": { outline: "none" },
        px: size === "desktop" ? 1.5 : 0.25,
        py: size === "desktop" ? 1 : 0.5,
        minHeight: size === "mobile" ? 44 : undefined,
        flex: size === "mobile" ? "1 1 0" : undefined,
        minWidth: size === "mobile" ? 0 : undefined,
        borderRadius: 1,
        transition: "background-color 0.2s ease, color 0.2s ease",
        ...(size === "desktop"
          ? {
              "&:hover": {
                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.06),
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
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25, minWidth: 0, width: "100%" }}>
          <Badge color="error" badgeContent={badge ?? 0} max={99} invisible={!badge}>
            <Box sx={{ display: "inline-flex", alignItems: "center", color: "inherit" }}>{icon}</Box>
          </Badge>
          <Typography
            variant="caption"
            sx={{
              fontSize: 12,
              lineHeight: 1.1,
              fontWeight: selected ? 600 : 500,
              color: "inherit",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
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

