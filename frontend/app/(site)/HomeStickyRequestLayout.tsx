"use client";

import { Box, Container, Stack } from "@mui/material";
import { useEffect, useRef, useState } from "react";

import { SITE_CONTENT_GAP_PX, SITE_HEADER_SPACER_PX, SITE_STICKY_TOP_PX } from "@/shared/config/site-layout";
import { HomeStoriesStrip } from "@/widgets/home-stories";
import { PublicUnlinkedRequestForm } from "@/widgets/public-service/ui/PublicUnlinkedRequestForm";
import { HomeServicesByCity } from "@/widgets/services/ui/HomeServicesByCity";
import { ServiceCategoriesBar } from "@/widgets/service-categories/ui/ServiceCategoriesBar";

type ServiceCategoryRow = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number | null;
};

type Props = {
  isAuthenticated: boolean;
  categories: ServiceCategoryRow[];
};

/** Ширина основной области по макету Figma (Desktop - 2). */
const HOME_MAIN_MAX_WIDTH_PX = 1486;
const HOME_FORM_WIDTH_PX = 356;
const HOME_COLUMN_GAP_PX = 24;
/** Высота блока заголовка секции услуг (Figma: `Card Title`). */
const HOME_SECTION_HEADER_HEIGHT_PX = 52;

export function HomeStickyRequestLayout({ isAuthenticated, categories }: Props) {
  const catsBarRef = useRef<HTMLDivElement | null>(null);
  const [catsBarHeightPx, setCatsBarHeightPx] = useState(0);

  const rootCategories = [...categories]
    .filter((c) => c.parentId == null)
    .sort((a, b) => {
      const ao = a.sortOrder ?? Number.POSITIVE_INFINITY;
      const bo = b.sortOrder ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name, "ru");
    });

  const barItems = rootCategories.map((c) => ({
    id: c.id,
    name: c.name,
    href: `/service-categories/${c.id}`,
  }));

  useEffect(() => {
    const el = catsBarRef.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") return;

    const update = () => {
      setCatsBarHeightPx(Math.ceil(el.getBoundingClientRect().height));
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <Box
      component="main"
      sx={{
        pb: { xs: 3, md: 4 },
        pt: 0,
        bgcolor: "background.default",
        "--home-cats-bar-h": `${catsBarHeightPx}px`,
      }}
    >
      <Container
        maxWidth="xl"
        sx={{
          px: { xs: 2, sm: 3 },
        }}
        disableGutters
      >
        <HomeStoriesStrip />

        <Box
          ref={catsBarRef}
          sx={{
            position: "sticky",
            // Why: spacer = header+gap (нужный визуальный отступ между header и категориями).
            // При sticky появляется "окно" сверху (gap), через которое видно контент при скролле.
            // Перекрываем его псевдо-элементом с фоном, не меняя обычную (не-sticky) разметку.
            top: { xs: SITE_HEADER_SPACER_PX.xs, sm: SITE_HEADER_SPACER_PX.sm },
            zIndex: (theme) => theme.zIndex.appBar,
            bgcolor: "background.default",
            "&::before": {
              content: '""',
              position: "absolute",
              left: 0,
              right: 0,
              top: { xs: `-${SITE_CONTENT_GAP_PX.xs}px`, sm: `-${SITE_CONTENT_GAP_PX.sm}px` },
              height: { xs: `${SITE_CONTENT_GAP_PX.xs}px`, sm: `${SITE_CONTENT_GAP_PX.sm}px` },
              bgcolor: "background.default",
              pointerEvents: "none",
            },
          }}
        >
          <ServiceCategoriesBar items={barItems} />
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: `${HOME_COLUMN_GAP_PX}px`,
            alignItems: "start",
            gridTemplateColumns: {
              xs: "1fr",
              md: `minmax(0, 1fr) ${HOME_FORM_WIDTH_PX}px`,
            },
          }}
        >
          <Box
            sx={{
              minWidth: 0,
              order: { xs: 2, md: 0 },
            }}
          >
            <Stack spacing={{ xs: 3, md: 3 }}>
              <HomeServicesByCity />
            </Stack>
          </Box>

          <Box
            sx={{
              order: { xs: 1, md: 1 },
              alignSelf: "start",
              position: { md: "sticky" },
              top: {
                md: `calc(${SITE_STICKY_TOP_PX}px + var(--home-cats-bar-h, 0px))`,
              },
              mt: { md: `${HOME_SECTION_HEADER_HEIGHT_PX}px` },
              width: { md: HOME_FORM_WIDTH_PX },
            }}
          >
            <PublicUnlinkedRequestForm
              isAuthenticated={isAuthenticated}
              categories={rootCategories}
              variant="card"
            />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
