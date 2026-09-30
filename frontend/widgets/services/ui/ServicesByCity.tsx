"use client";

import { useMemo } from "react";
import { Box, Stack } from "@mui/material";
import { ServiceCard, type ServiceCardItem } from "@/entities/service";
import { ServiceSectionHeader } from "@/widgets/services/ui/ServiceSectionHeader";
import { useSelectedCity } from "@/features/select-city";

function getPublishedAtTs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
}

function compareByPublishedAtDesc(a: ServiceCardItem, b: ServiceCardItem) {
  const ta = getPublishedAtTs(a.publishedAt ?? null);
  const tb = getPublishedAtTs(b.publishedAt ?? null);

  // Unknown dates go last
  if (ta === null && tb === null) return a.id.localeCompare(b.id);
  if (ta === null) return 1;
  if (tb === null) return -1;

  if (ta !== tb) return tb - ta;
  return a.id.localeCompare(b.id);
}

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
    const filtered = cityId ? items.filter((service) => service.provider.city?.id === cityId) : items;
    return [...filtered].sort(compareByPublishedAtDesc);
  }, [items, cityId]);

  const otherCityItems = useMemo(() => {
    if (!cityId) return [];
    const filtered = items.filter(
      (service) => service.provider.city?.id != null && service.provider.city.id !== cityId
    );
    return [...filtered].sort(compareByPublishedAtDesc);
  }, [items, cityId]);

  return (
    <Stack spacing={{ xs: 3, md: 3 }}>
      <Stack spacing={0}>
        <ServiceSectionHeader title={myCityTitle} cityLabel={cityName} />
        <ServiceGrid items={myCityItems} variant="myCity" />
      </Stack>

      {otherCityItems.length > 0 ? (
        <Stack spacing={0}>
          <ServiceSectionHeader title={otherCitiesTitle} />
          <ServiceGrid items={otherCityItems} variant="otherCities" />
        </Stack>
      ) : null}
    </Stack>
  );
}

