"use client";

import Link from "next/link";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import { Box, Typography } from "@mui/material";

export type ServiceCategoryBarItem = {
  id: string;
  name: string;
  href: string;
};

type Props = {
  items: ServiceCategoryBarItem[];
  activeId?: string | null;
};

export function ServiceCategoriesBar({ items, activeId = null }: Props) {
  if (!items.length) return null;

  return (
    <Box
      sx={{
        py: 2,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        columnGap: 2,
        rowGap: 1.5,
      }}
    >
      {items.map((item) => {
        const isActive = activeId != null && item.id === activeId;
        const isBack = item.id === "__back__";
        if (isBack) {
          return (
            <Typography
              key={item.id}
              component={Link}
              href={item.href}
              aria-label="Назад к категориям"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 24,
                width: 32,
                borderRadius: 1,
                color: "#5d4037",
                textDecoration: "none",
                lineHeight: 1,
                "&:hover": {
                  color: "info.main",
                  bgcolor: "action.hover",
                },
              }}
            >
              <ArrowBackIosIcon sx={{ fontSize: 18, ml: "2px" }} />
            </Typography>
          );
        }

        return (
          <Typography
            key={item.id}
            component={Link}
            href={item.href}
            aria-label={item.name}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              height: 24,
              textDecoration: "none",
              fontSize: 12,
              lineHeight: 1.66,
              letterSpacing: "0.4px",
              fontWeight: isActive ? 700 : 600,
              color: isActive ? "text.primary" : "#5d4037",
              "&:hover": {
                color: "info.main",
              },
            }}
          >
            {item.name}
          </Typography>
        );
      })}
    </Box>
  );
}

