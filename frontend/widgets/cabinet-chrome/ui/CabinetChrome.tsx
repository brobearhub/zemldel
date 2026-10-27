"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import useMediaQuery from "@mui/material/useMediaQuery";
import { resolveAccountKind } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import {
  CUSTOMER_NAV,
  PROVIDER_CONTACT_NAV,
  PROVIDER_NAV,
  type CabinetRole,
} from "@/widgets/cabinet-chrome/model/nav-config";
import { getCabinetZone } from "@/widgets/cabinet-chrome/lib/is-cabinet-route";
import { getLastCabinetRole, setLastCabinetRole } from "@/widgets/cabinet-chrome/lib/cabinet-role-storage";
import { CabinetDesktopBar } from "@/widgets/cabinet-chrome/ui/CabinetDesktopBar";
import { CabinetMobileHeader } from "@/widgets/cabinet-chrome/ui/CabinetMobileHeader";
import { CabinetBottomNav } from "@/widgets/cabinet-chrome/ui/CabinetBottomNav";

export function CabinetChrome() {
  const isWide = useMediaQuery((theme) => theme.breakpoints.up("tablet"));
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAuthenticated = useAppSelector((state) => state.auth.status === "authenticated");
  const isProviderAccount = useAppSelector(
    (state) => resolveAccountKind(state.auth.user) === "PROVIDER",
  );

  const zone = useMemo(() => getCabinetZone(pathname), [pathname]);
  const isProviderContact = zone === "profile" && isProviderAccount;
  const role: CabinetRole = useMemo(() => {
    if (zone === "profile") return "customer";
    if (zone === "pro") return "provider";
    return getLastCabinetRole();
  }, [zone]);

  /**
   * Why: контактное лицо — часть аккаунта исполнителя, чаты остаются чатами исполнителя.
   * До загрузки сессии тип аккаунта неизвестен, поэтому роль заказчика не записываем.
   */
  useEffect(() => {
    if (zone === "profile" && isAuthenticated && !isProviderAccount) setLastCabinetRole("customer");
    if (zone === "pro") setLastCabinetRole("provider");
  }, [zone, isAuthenticated, isProviderAccount]);

  const nav = isProviderContact ? PROVIDER_CONTACT_NAV : role === "provider" ? PROVIDER_NAV : CUSTOMER_NAV;
  const showProviderCity = role === "provider";
  // touch searchParams to trigger rerender when section changes
  void searchParams;

  if (isWide) {
    return <CabinetDesktopBar items={nav.desktop} showProviderCity={showProviderCity} />;
  }

  return (
    <>
      <CabinetMobileHeader showProviderCity={showProviderCity} />
      <CabinetBottomNav items={nav.mobileBottom} moreItems={nav.mobileMore} />
    </>
  );
}

