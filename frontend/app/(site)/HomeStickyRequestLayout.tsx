"use client";

import { useState } from "react";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { Box, Container, IconButton, Stack, Tooltip } from "@mui/material";

import type { ServiceDto } from "@/entities/service";
import { SITE_STICKY_TOP_PX } from "@/shared/config/site-layout";
import { PublicUnlinkedRequestForm } from "@/widgets/public-service/ui/PublicUnlinkedRequestForm";
import { HydrateService } from "@/widgets/services/ui/HydrateService";
import { Services } from "@/widgets/services/ui/Services";
import { ServiceCategoriesSection, type ServiceCategoryRow } from "@/widgets/service-categories/ui/ServiceCategoriesSection";

type Props = {
  isAuthenticated: boolean;
  categories: ServiceCategoryRow[];
  initialServices: ServiceDto[];
};

export function HomeStickyRequestLayout({ isAuthenticated, categories, initialServices }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box
      component="main"
      sx={{
        pb: { xs: 3, md: 4 },
        pt: 0,
        bgcolor: "background.default",
        backgroundImage: (theme) => theme.custom.gradients.sky,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "grid",
            gap: { xs: 2, md: 3 },
            alignItems: "start",
            gridTemplateColumns: {
              xs: "1fr",
              md: collapsed ? "minmax(0, 1fr) 52px" : "minmax(0, 1fr) 420px",
            },
          }}
        >
          <Box sx={{ minWidth: 0, order: { xs: 2, md: 0 } }}>
            <Stack spacing={{ xs: 3, md: 4 }}>
              <ServiceCategoriesSection categories={categories} embedded />
              <HydrateService initialServices={initialServices} />
              <Services embedded />
            </Stack>
          </Box>

          <Box
            sx={{
              order: { xs: 1, md: 1 },
              alignSelf: "start",
              position: { md: "sticky" },
              top: { md: SITE_STICKY_TOP_PX },
            }}
          >
            {collapsed ? (
              <Tooltip title="Показать форму заявки">
                <IconButton
                  onClick={() => setCollapsed(false)}
                  aria-label="Показать форму заявки"
                  sx={{ border: 1, borderColor: "divider", bgcolor: "background.paper" }}
                >
                  <ChevronLeftRoundedIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Stack spacing={1.5}>
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Tooltip title="Свернуть форму">
                    <IconButton onClick={() => setCollapsed(true)} aria-label="Свернуть форму" size="small">
                      <ChevronRightRoundedIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                <PublicUnlinkedRequestForm
                  isAuthenticated={isAuthenticated}
                  categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                />
              </Stack>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

