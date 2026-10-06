"use client";

import { Box } from "@mui/material";
import { SITE_HEADER_SPACER_PX } from "@/shared/config/site-layout";
import { ServiceCategoriesBar, type ServiceCategoryBarItem } from "./ServiceCategoriesBar";

type Props = {
  items: ServiceCategoryBarItem[];
  activeId?: string | null;
};

export function ServiceCategoriesStickyBar({ items, activeId }: Props) {
  if (!items.length) return null;

  return (
    <Box
      sx={{
        position: "sticky",
        top: { xs: SITE_HEADER_SPACER_PX.xs, sm: SITE_HEADER_SPACER_PX.sm },
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

