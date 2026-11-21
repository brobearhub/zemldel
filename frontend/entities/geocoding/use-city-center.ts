"use client";

import { useEffect, useState } from "react";
import type { CitySuggestItemDto } from "@/entities/city";
import { findCityCenter } from "./api";
import type { GeocodedPoint } from "./types";

export function useCityCenter(city: CitySuggestItemDto | null) {
  const [result, setResult] = useState<{
    city: CitySuggestItemDto;
    center: GeocodedPoint | null;
    failed: boolean;
  } | null>(null);
  const resolved =
    city && result?.city.id === city.id && (result.center || result.city === city) ? result : null;
  const center = city?.center ?? resolved?.center ?? null;

  useEffect(() => {
    if (!city || center) return;
    const cityId = city.id;
    const controller = new AbortController();
    findCityCenter(cityId, controller.signal).then(
      (center) => {
        if (!controller.signal.aborted) setResult({ city, center, failed: false });
      },
      () => {
        if (!controller.signal.aborted) setResult({ city, center: null, failed: true });
      },
    );
    return () => controller.abort();
  }, [city, center]);

  return {
    center,
    source: city?.center ? null : (resolved?.center?.source ?? null),
    loading: Boolean(city && !center && !resolved),
    failed: Boolean(resolved?.failed),
  };
}
