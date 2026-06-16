"use client";
import { Box, Container, Stack } from "@mui/material";
import { ServiceCardList } from "@/widgets/services/ui/ServiceCardList";
import { useAppSelector } from "@/core/store/hooks";
import { getLegalServices, getMainServices } from "../model/service.slice";

type Props = {
  embedded?: boolean;
};

export const Services = ({ embedded }: Props) => {
  const mainServices = useAppSelector(getMainServices);
  const legalServices = useAppSelector(getLegalServices);

  const content = (
    <Stack spacing={{ xs: 6, md: 8 }}>
      <ServiceCardList
        title="Основные услуги"
        subtitle="Работаем с земельными участками: от оформления документов до представительства в суде."
        items={mainServices}
        columns={3}
      />
      <ServiceCardList
        title="Юридические услуги"
        subtitle="Оформление документов, представительство в суде и сопровождение сделок с недвижимостью."
        items={legalServices}
        columns={4}
      />
    </Stack>
  );

  if (embedded) {
    return (
      <Box component="section" id="services" sx={{ py: 0 }}>
        {content}
      </Box>
    );
  }

  return (
    <Box component="section" id="services" sx={{ py: { xs: 7, md: 10 }, bgcolor: "background.default" }}>
      <Container>{content}</Container>
    </Box>
  );
}
