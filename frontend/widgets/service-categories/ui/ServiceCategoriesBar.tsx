"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import { Box, Typography } from "@mui/material";
import { ResponsiveLabel } from "@/shared/ui/ResponsiveLabel";

export type ServiceCategoryBarItem = {
  id: string;
  name: string;
  shortName?: string | null;
  href: string;
};

type Props = {
  items: ServiceCategoryBarItem[];
  activeId?: string | null;
};

export function ServiceCategoriesBar({ items, activeId = null }: Props) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [wrapped, setWrapped] = useState(false);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const update = () => {
      const children = Array.from(bar.children);
      if (children.length < 2) {
        setWrapped(false);
        return;
      }
      const tops = children.map((child) => child.getBoundingClientRect().top);
      const isWrapped = Math.max(...tops) - Math.min(...tops) > 1;
      setWrapped((prev) => (prev === isWrapped ? prev : isWrapped));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [items]);

  if (!items.length) return null;

  return (
    <Box
      ref={barRef}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        columnGap: 2,
        rowGap: 1.5,
        // Why: одна строка уже 44px из-за кнопки «назад». Доп. низ нужен только когда пункты перенеслись.
        pb: wrapped ? 2 : 0,
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
                height: 44,
                width: 44,
                borderRadius: 1,
                color: "text.primary",
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
              textDecoration: "none",
              fontSize: 12,
              letterSpacing: "0.4px",
              fontWeight: 600,
              color: isActive ? "accent.main" : "text.primary",
              "&:hover": {
                color: "info.main",
              },
            }}
          >
            <ResponsiveLabel text={item.name} compactText={item.shortName} />
          </Typography>
        );
      })}
    </Box>
  );
}

