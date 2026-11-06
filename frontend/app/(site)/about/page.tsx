import { publicPageMetadata } from "@/shared/lib/seo";
import { HowItWorks } from "@/widgets/how-it-works/ui/HowItWorks";
import { Contacts } from "@/widgets/contacts/ui/Contacts";
import { Hero } from "@/widgets/hero/ui/Hero";
import { Box, Container, Stack } from "@mui/material";
import { fetchBackendJson } from "@/shared/api/backend/server";
import { ServiceCategoriesSection, type ServiceCategoryRow } from "@/widgets/service-categories/ui/ServiceCategoriesSection";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const categories = await fetchBackendJson<ServiceCategoryRow[]>("/service-categories");

  return (
    <>
      <Hero />
      <HowItWorks audience="customer" />
      <HowItWorks audience="provider" />
      <Box
        component="section"
        id="services"
        sx={{ py: { xs: 7, md: 10 }, bgcolor: "background.default" }}
      >
        <Container>
          <Stack spacing={{ xs: 3, md: 4 }}>
            <ServiceCategoriesSection categories={categories} embedded />
          </Stack>
        </Container>
      </Box>
      <Contacts />
    </>
  );
}

export const metadata = publicPageMetadata(
  "О Земледеле — помощь с землёй и недвижимостью",
  "Земледел: земельные и кадастровые услуги, оформление документов и помощь с недвижимостью. Направления работы, контакты и информация о проекте.",
  "/about",
);

