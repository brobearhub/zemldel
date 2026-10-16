"use client";

import { usePathname } from "next/navigation";
import { useAppSelector } from "@/core/store/hooks";
import { getActiveMembership } from "@/core/auth/authorization";
import { LocationButton, useCitySelect, useHeaderCity, useSelectedCity } from "@/features/select-city";

type HeaderCityProps = {
  /** В меню-гамбургере название города видно и на узком экране. */
  readonly showLabel?: boolean;
  /** Кабинет исполнителя, в том числе на /chats, где путь сам по себе не /pro. */
  readonly scope?: "provider";
};

export function HeaderCity({ showLabel = false, scope }: HeaderCityProps) {
  const pathname = usePathname();
  const { status, user } = useAppSelector((s) => s.auth);
  const { openCitySelect } = useCitySelect();

  const inPro = scope === "provider" || pathname === "/pro" || pathname.startsWith("/pro/");
  const activeMembership = user ? getActiveMembership(user) : null;

  const customerSelected = useHeaderCity();
  const providerSelected = useSelectedCity("provider");

  const city = inPro ? providerSelected : customerSelected;
  const label = city ? city.name : "Выбрать локацию";
  const selectScope = inPro && status === "authenticated" && user && activeMembership?.providerId ? "provider" : "customer";

  return (
    <LocationButton
      label={label}
      onClick={() => openCitySelect(selectScope)}
      labelDisplay={showLabel ? "always" : "fromMd"}
    />
  );
}

