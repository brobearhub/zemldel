"use client";

import { useMemo } from "react";
import { Box, Stack } from "@mui/material";
import { ServiceCard, type ServiceCardItem } from "@/entities/service";
import { ServiceSectionHeader } from "@/widgets/services/ui/ServiceSectionHeader";
import { useSelectedCity } from "@/features/select-city";

function ServiceGrid({
  items,
  variant,
}: {
  items: ServiceCardItem[];
  variant: "myCity" | "otherCities";
}) {
  if (!items.length) return null;

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2.5,
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: "repeat(2, minmax(0, 1fr))",
          md: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(3, minmax(0, 1fr))",
          xl: "repeat(4, minmax(0, 1fr))",
        },
        alignItems: "stretch",
      }}
    >
      {items.map((item) => (
        <ServiceCard key={item.id} item={item} variant={variant} />
      ))}
    </Box>
  );
}

type Props = {
  items: ServiceCardItem[];
  myCityTitle?: string;
  otherCitiesTitle?: string;
};

export function ServicesByCity({
  items,
  myCityTitle = "Услуги",
  otherCitiesTitle = "Услуги в других городах",
}: Props) {
  const selectedCity = useSelectedCity("customer");
  const cityId = selectedCity?.id ?? null;
  const cityName = selectedCity?.name ?? null;

  const myCityItems = useMemo(() => {
    return cityId ? items.filter((service) => service.provider.city?.id === cityId) : items;
  }, [items, cityId]);

  const otherCityItems = useMemo(() => {
    if (!cityId) return [];
    return items.filter((service) => service.provider.city?.id != null && service.provider.city.id !== cityId);
  }, [items, cityId]);

  return (
    <Stack spacing={{ xs: 3, md: 3 }}>
      {myCityItems.length > 0 ? (
        <Stack spacing={0}>
          <ServiceSectionHeader title={myCityTitle} cityLabel={cityName} />
          <ServiceGrid items={myCityItems} variant="myCity" />
        </Stack>
      ) : null}

      {otherCityItems.length > 0 ? (
        <Stack spacing={0}>
          <ServiceSectionHeader title={otherCitiesTitle} />
          <ServiceGrid items={otherCityItems} variant="otherCities" />
        </Stack>
      ) : null}
    </Stack>
  );
}

