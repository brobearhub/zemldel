"use client";

import { useEffect, useMemo, useState } from "react";
import type { CitySuggestItemDto } from "@/entities/city";
import { useAppSelector } from "@/core/store/hooks";
import { getActiveMembership } from "@/core/auth/authorization";
import { readGuestCity, subscribeGuestCity } from "./guest-city.storage";

export type CitySelectScope = "customer" | "provider";

function buildLocationDisplayName(locationName: string, regionName: string) {
  const loc = locationName.trim();
  const region = regionName.trim();
  const locKey = loc.toLowerCase();
  const regionKey = region.toLowerCase();
  if (regionKey.includes(locKey)) return loc;
  return `${loc}, ${region}`;
}

function mapAuthCityToSuggest(
  city: { id: string; name: string; regionCode: string; regionName: string } | null | undefined
): CitySuggestItemDto | null {
  if (!city) return null;
  return {
    id: city.id,
    name: city.name,
    regionCode: city.regionCode,
    regionName: city.regionName,
    displayName: buildLocationDisplayName(city.name, city.regionName),
  };
}

function mapGuestCityToSuggest(
  city: { id: string; name: string; regionCode: string; regionName: string } | null
): CitySuggestItemDto | null {
  if (!city) return null;
  return {
    id: city.id,
    name: city.name,
    regionCode: city.regionCode,
    regionName: city.regionName,
    displayName: buildLocationDisplayName(city.name, city.regionName),
  };
}

function useGuestCustomerCity(): CitySuggestItemDto | null {
  const [guestCity, setGuestCity] = useState(() => readGuestCity());

  useEffect(() => {
    return subscribeGuestCity(() => setGuestCity(readGuestCity()));
  }, []);

  return useMemo(() => mapGuestCityToSuggest(guestCity), [guestCity]);
}

export function useSelectedCity(scope: CitySelectScope): CitySuggestItemDto | null {
  const { status, user } = useAppSelector((s) => s.auth);
  const guestCustomerCity = useGuestCustomerCity();

  return useMemo(() => {
    if (scope === "provider") {
      if (status !== "authenticated" || !user) return null;
      const membership = getActiveMembership(user);
      return mapAuthCityToSuggest(membership?.providerCity ?? null);
    }

    // customer scope
    if (status === "authenticated" && user) {
      const profileCity = mapAuthCityToSuggest(user.customerCity);
      return profileCity ?? guestCustomerCity;
    }

    return guestCustomerCity;
  }, [guestCustomerCity, scope, status, user]);
}

