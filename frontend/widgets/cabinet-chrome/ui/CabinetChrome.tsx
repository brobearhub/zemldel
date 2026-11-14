"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import useMediaQuery from "@mui/material/useMediaQuery";
import { getActiveMembership, resolveAccountKind } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import {
  CUSTOMER_NAV,
  PROVIDER_HEADER_NAV,
  EMPLOYEE_HEADER_NAV,
  PROVIDER_NAV,
  type CabinetRole,
} from "@/widgets/cabinet-chrome/model/nav-config";
import { getCabinetZone } from "@/widgets/cabinet-chrome/lib/is-cabinet-route";
import {
  getLastCabinetRole,
  setLastCabinetRole,
} from "@/widgets/cabinet-chrome/lib/cabinet-role-storage";
import { CabinetDesktopBar } from "@/widgets/cabinet-chrome/ui/CabinetDesktopBar";
import { CabinetMobileHeader } from "@/widgets/cabinet-chrome/ui/CabinetMobileHeader";

export function CabinetChrome() {
  const isWide = useMediaQuery((theme) => theme.breakpoints.up("tablet"));
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAuthenticated = useAppSelector(
    (state) => state.auth.status === "authenticated",
  );
  const isProviderAccount = useAppSelector(
    (state) => resolveAccountKind(state.auth.user) === "PROVIDER",
  );

  const isEmployee = useAppSelector((state) => getActiveMembership(state.auth.user)?.role === "EMPLOYEE");

  const zone = useMemo(() => getCabinetZone(pathname), [pathname]);
  const role: CabinetRole = useMemo(() => {
    if (isProviderAccount) return "provider";
    if (zone === "profile") return "customer";
    if (zone === "pro") return "provider";
    return getLastCabinetRole();
  }, [zone, isProviderAccount]);

  /**
   * Why: контактное лицо — часть аккаунта исполнителя, чаты остаются чатами исполнителя.
   * До загрузки сессии тип аккаунта неизвестен, поэтому роль заказчика не записываем.
   */
  useEffect(() => {
    if (zone === "profile" && isAuthenticated && !isProviderAccount)
      setLastCabinetRole("customer");
    if (zone === "pro") setLastCabinetRole("provider");
  }, [zone, isAuthenticated, isProviderAccount]);

  const nav = role === "provider" ? PROVIDER_NAV : CUSTOMER_NAV;
  const showProviderCity = role === "provider";
  // touch searchParams to trigger rerender when section changes
  void searchParams;

  if (isWide) {
    return (
      <CabinetDesktopBar
        items={isEmployee ? EMPLOYEE_HEADER_NAV : zone === "pro" ? PROVIDER_HEADER_NAV : nav.desktop}
        showProviderCity={showProviderCity}
        showProviderStatus={role === "provider"}
        alignWithWorkspace={zone === "pro" || zone === "profile"}
      />
    );
  }

  return <CabinetMobileHeader showProviderCity={showProviderCity} />;
}
