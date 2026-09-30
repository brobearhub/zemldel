import type { Metadata } from "next";
import { Achievements } from "@/widgets/achievements/ui/Achievements";
import { Contacts } from "@/widgets/contacts/ui/Contacts";
import { Hero } from "@/widgets/hero/ui/Hero";
import { Box, Container, Stack } from "@mui/material";
import { fetchBackendJson } from "@/shared/api/backend/server";
import { ServiceCategoriesSection, type ServiceCategoryRow } from "@/widgets/service-categories/ui/ServiceCategoriesSection";

export default async function AboutPage() {
  const categories = await fetchBackendJson<ServiceCategoryRow[]>("/service-categories");
  const rootCategories = categories.filter((c) => c.parentId == null);

  return (
    <main>
      <Hero />
      <Box
        component="section"
        id="services"
        sx={{ py: { xs: 7, md: 10 }, bgcolor: "background.default" }}
      >
        <Container>
          <Stack spacing={{ xs: 3, md: 4 }}>
            <ServiceCategoriesSection categories={rootCategories} embedded />
          </Stack>
        </Container>
      </Box>
      <Contacts />
      <Achievements />
    </main>
  );
}

export const metadata: Metadata = {
  title: "О компании - Земледел",
};

