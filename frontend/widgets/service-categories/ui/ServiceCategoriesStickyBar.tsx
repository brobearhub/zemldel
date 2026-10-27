"use client";

import { useLayoutEffect, useRef } from "react";
import { Box } from "@mui/material";
import { SITE_HEADER_HEIGHT_PX } from "@/shared/config/site-layout";
import { ServiceCategoriesBar, type ServiceCategoryBarItem } from "./ServiceCategoriesBar";
import { SERVICE_CATEGORIES_BAR_HEIGHT_VAR } from "./service-categories-bar-height";

type Props = {
  items: ServiceCategoryBarItem[];
  activeId?: string | null;
};

export function ServiceCategoriesStickyBar({ items, activeId }: Props) {
  const barRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty(
        SERVICE_CATEGORIES_BAR_HEIGHT_VAR,
        `${Math.ceil(bar.getBoundingClientRect().height)}px`,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty(SERVICE_CATEGORIES_BAR_HEIGHT_VAR);
    };
  }, [items.length]);

  if (!items.length) return null;

  return (
    <Box
      ref={barRef}
      sx={{
        position: "sticky",
        // Why: spacer = хедер + зазор. Липнуть к нему — окно, сквозь которое при скролле виден контент.
        top: { xs: SITE_HEADER_HEIGHT_PX.xs, sm: SITE_HEADER_HEIGHT_PX.sm },
        zIndex: (theme) => theme.zIndex.appBar,
        bgcolor: "background.default",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <ServiceCategoriesBar items={items} activeId={activeId} />
    </Box>
  );
}

