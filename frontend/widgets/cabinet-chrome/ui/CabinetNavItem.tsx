"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { UnreadCountBadge } from "@/shared/ui/UnreadCountBadge";
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

export function CabinetNavItem({
  href,
  onClick,
  expanded,
  label,
  icon,
  selected,
  badge,
  size,
}: Props) {
  const tone =
    size === "mobile"
      ? "secondary.main"
      : selected
        ? "text.primary"
        : "text.secondary";
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
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "text.primary",
          outlineOffset: -2,
        },
        px: size === "desktop" ? 1.5 : 0.25,
        py: size === "desktop" ? 1.75 : 0.5,
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
          <UnreadCountBadge count={badge}>
            <Box sx={{ display: "inline-flex", alignItems: "center" }}>
              {icon}
            </Box>
          </UnreadCountBadge>
          <Typography
            variant="body2"
            sx={{
              fontWeight: selected ? 600 : 500,
              color: "inherit",
              whiteSpace: "normal",
            }}
          >
            {label}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.25,
            minWidth: 0,
            width: "100%",
          }}
        >
          <UnreadCountBadge count={badge}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                color: "inherit",
              }}
            >
              {icon}
            </Box>
          </UnreadCountBadge>
          <Typography
            variant="caption"
            sx={{
              fontSize: "1rem",
              lineHeight: 1.5,
              fontWeight: selected ? 600 : 500,
              color: "inherit",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "clip",
              whiteSpace: "normal",
            }}
          >
            {label}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
