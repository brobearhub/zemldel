"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { ServiceCard, type ServiceCardItem } from "@/entities/service";
import { useSelectedCity } from "@/features/select-city";
import { ServiceSectionHeader } from "@/widgets/services/ui/ServiceSectionHeader";

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
          sm: "repeat(3, minmax(0, 1fr))",
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

async function fetchServices(path: string): Promise<ServiceCardItem[]> {
  const res = await fetch(path);
  const payload = (await res.json().catch(() => null)) as
    | ServiceCardItem[]
    | { error?: string }
    | null;

  if (!res.ok) {
    const msg =
      payload && typeof payload === "object" && !Array.isArray(payload) && payload.error
        ? payload.error
        : "Не удалось загрузить услуги";
    throw new Error(msg);
  }

  if (!Array.isArray(payload)) return [];
  return payload;
}

export function HomeServicesByCity() {
  const selectedCity = useSelectedCity("customer");
  const cityId = selectedCity?.id ?? null;
  const cityName = selectedCity?.name ?? null;

  const [myCityItems, setMyCityItems] = useState<ServiceCardItem[] | null>(null);
  const [otherCityItems, setOtherCityItems] = useState<ServiceCardItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    setMyCityItems(null);
    setOtherCityItems(null);

    (async () => {
      try {
        if (!cityId) {
          const all = await fetchServices("/api/services");
          if (!alive) return;
          setMyCityItems([...all].sort(compareByPublishedAtDesc));
          setOtherCityItems([]);
          return;
        }

        const [mine, other] = await Promise.all([
          fetchServices(`/api/services?cityId=${encodeURIComponent(cityId)}`),
          fetchServices(`/api/services?excludeCityId=${encodeURIComponent(cityId)}`),
        ]);
        if (!alive) return;

        setMyCityItems([...mine].sort(compareByPublishedAtDesc));
        setOtherCityItems([...other].sort(compareByPublishedAtDesc));
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Не удалось загрузить услуги");
        setMyCityItems([]);
        setOtherCityItems([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [cityId]);

  const showOther = (otherCityItems ?? []).length > 0;
  const showEmptyMy = (myCityItems ?? []).length === 0;

  const myItemsSorted = useMemo(() => (myCityItems ?? []), [myCityItems]);
  const otherItemsSorted = useMemo(() => (otherCityItems ?? []), [otherCityItems]);

  if (error) {
    return (
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography sx={{ color: "error.main" }}>{error}</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={{ xs: 3, md: 3 }}>
      <Stack spacing={0}>
        <ServiceSectionHeader title="Услуги" cityLabel={cityName} />
        {myCityItems === null ? null : showEmptyMy ? (
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography sx={{ color: "text.secondary" }}>
              Пока нет опубликованных услуг в выбранном городе.
            </Typography>
          </Paper>
        ) : (
          <ServiceGrid items={myItemsSorted} variant="myCity" />
        )}
      </Stack>

      {showOther ? (
        <Stack spacing={0}>
          <ServiceSectionHeader title="Услуги в других городах" />
          <ServiceGrid items={otherItemsSorted} variant="otherCities" />
        </Stack>
      ) : null}
    </Stack>
  );
}
