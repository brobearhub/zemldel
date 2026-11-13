"use client";

import { FavoriteButton } from "@/features/favorites/FavoriteButton";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { ServiceCard, type ServiceCardItem } from "@/entities/service";
import { useHeaderCity } from "@/features/select-city";
import { ServiceSectionHeader } from "@/widgets/services/ui/ServiceSectionHeader";

const SERVICES_FETCH_USER_MESSAGE =
  "Не удалось загрузить список услуг. Попробуйте позже.";

// Сетка: одна, две, три или четыре колонки; с md справа находится форма заявки.
const HOME_SERVICE_IMAGE_SIZES = [
  "(orientation: landscape) and (max-height: 500px) and (min-width: 600px) 50vw",
  "(min-width: 1536px) 262px",
  "(min-width: 1200px) calc(33.333vw - 156px)",
  "(min-width: 900px) calc(50vw - 224px)",
  "(min-width: 600px) calc(50vw - 34px)",
  "calc(100vw - 32px)",
].join(", ");

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
          xs: "minmax(0, 1fr)",
          sm: "repeat(2, minmax(0, 1fr))",
          tablet: "repeat(2, minmax(0, 1fr))",
          md: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(3, minmax(0, 1fr))",
          xl: "repeat(4, minmax(0, 1fr))",
        },
        alignItems: "stretch",
      }}
    >
      {items.map((item) => (
        <ServiceCard
          key={item.id}
          item={item}
          favoriteAction={<FavoriteButton kind="services" id={item.id} />}
          variant={variant}
          imageSizes={HOME_SERVICE_IMAGE_SIZES}
        />
      ))}
    </Box>
  );
}

async function fetchServices(path: string): Promise<ServiceCardItem[]> {
  const res = await fetch(path);
  const payload = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    // Не показываем пользователю backend/BFF сообщения (они могут быть техническими и на англ.).
    // Детали оставляем только в консоли для диагностики.
    if (process.env.NODE_ENV !== "production") {
      console.error("[HomeServicesByCity] Failed to fetch services", {
        path,
        status: res.status,
        payload,
      });
    }
    throw new Error(SERVICES_FETCH_USER_MESSAGE);
  }

  return Array.isArray(payload) ? (payload as ServiceCardItem[]) : [];
}

export function HomeServicesByCity({
  initialItems,
}: {
  initialItems?: ServiceCardItem[];
}) {
  const selectedCity = useHeaderCity();
  const cityId = selectedCity?.id ?? null;
  const cityName = selectedCity?.name ?? null;

  const [myCityItems, setMyCityItems] = useState<ServiceCardItem[] | null>(
    initialItems ?? null,
  );
  const [otherCityItems, setOtherCityItems] = useState<
    ServiceCardItem[] | null
  >(initialItems ? [] : null);
  const [error, setError] = useState<string | null>(null);
  const hasRequested = useRef(false);

  useEffect(() => {
    // The first anonymous render already has the server catalog. City changes still refresh it.
    if (!cityId && initialItems && !hasRequested.current) return;
    hasRequested.current = true;
    let alive = true;
    setError(null);

    (async () => {
      try {
        if (!cityId) {
          const all = await fetchServices("/api/services");
          if (!alive) return;
          setMyCityItems(all);
          setOtherCityItems([]);
          return;
        }

        const [mine, other] = await Promise.all([
          fetchServices(`/api/services?cityId=${encodeURIComponent(cityId)}`),
          fetchServices(
            `/api/services?excludeCityId=${encodeURIComponent(cityId)}`,
          ),
        ]);
        if (!alive) return;

        setMyCityItems(mine);
        setOtherCityItems(other);
      } catch (e) {
        if (!alive) return;
        if (process.env.NODE_ENV !== "production") {
          console.error("[HomeServicesByCity] Failed to load services", e);
        }
        setError(SERVICES_FETCH_USER_MESSAGE);
        setMyCityItems([]);
        setOtherCityItems([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [cityId, initialItems]);

  const loaded = myCityItems !== null && otherCityItems !== null;
  const showOther = (otherCityItems ?? []).length > 0;
  const showMy = (myCityItems ?? []).length > 0;
  const catalogEmpty = loaded && !error && !showMy && !showOther;

  const myItemsSorted = useMemo(() => myCityItems ?? [], [myCityItems]);
  const otherItemsSorted = useMemo(
    () => otherCityItems ?? [],
    [otherCityItems],
  );

  if (error) {
    return (
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography sx={{ color: "error.main" }}>{error}</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={{ xs: 3, md: 3 }}>
      {catalogEmpty ? (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography sx={{ fontWeight: 700 }}>Услуг пока нет</Typography>
        </Paper>
      ) : null}

      {showMy ? (
        <Stack spacing={0}>
          <ServiceSectionHeader title="Услуги" cityLabel={cityName} />
          <ServiceGrid items={myItemsSorted} variant="myCity" />
        </Stack>
      ) : null}

      {showOther ? (
        <Stack spacing={0}>
          <ServiceSectionHeader title="Услуги в других городах" />
          <ServiceGrid items={otherItemsSorted} variant="otherCities" />
        </Stack>
      ) : null}
    </Stack>
  );
}
