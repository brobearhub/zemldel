import type { Metadata } from "next";
import { Achievements } from "@/widgets/achievements/ui/Achievements";
import { Contacts } from "@/widgets/contacts/ui/Contacts";
import { Hero } from "@/widgets/hero/ui/Hero";
import { LegalServicesPaper } from "@/widgets/services/ui/LegalServicesPaper";
import { MainServices } from "@/widgets/services/ui/MainServices";
import { Box, Container, Stack } from "@mui/material";

export default function AboutPage() {
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
            <MainServices />
            <LegalServicesPaper />
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

