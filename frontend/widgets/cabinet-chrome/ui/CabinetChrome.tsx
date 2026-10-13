"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import useMediaQuery from "@mui/material/useMediaQuery";
import { CUSTOMER_NAV, PROVIDER_NAV, type CabinetRole } from "@/widgets/cabinet-chrome/model/nav-config";
import { getCabinetZone } from "@/widgets/cabinet-chrome/lib/is-cabinet-route";
import { getLastCabinetRole, setLastCabinetRole } from "@/widgets/cabinet-chrome/lib/cabinet-role-storage";
import { CabinetDesktopBar } from "@/widgets/cabinet-chrome/ui/CabinetDesktopBar";
import { CabinetMobileHeader } from "@/widgets/cabinet-chrome/ui/CabinetMobileHeader";
import { CabinetBottomNav } from "@/widgets/cabinet-chrome/ui/CabinetBottomNav";

function resolveCabinetHeaderTitle(
  pathname: string,
  searchParams: URLSearchParams,
  nav: typeof CUSTOMER_NAV,
): string {
  if (pathname === "/pro") return "Кабинет";
  const ctx = { pathname, searchParams };
  const items = [...nav.desktop, ...nav.mobileBottom, ...nav.mobileMore];
  return items.find((item) => item.isActive(ctx))?.label ?? "Кабинет";
}

export function CabinetChrome() {
  const isWide = useMediaQuery("(min-width:768px)");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const zone = useMemo(() => getCabinetZone(pathname), [pathname]);
  const role: CabinetRole = useMemo(() => {
    if (zone === "profile") return "customer";
    if (zone === "pro") return "provider";
    return getLastCabinetRole();
  }, [zone]);

  useEffect(() => {
    if (zone === "profile") setLastCabinetRole("customer");
    if (zone === "pro") setLastCabinetRole("provider");
  }, [zone]);

  const nav = role === "provider" ? PROVIDER_NAV : CUSTOMER_NAV;
  // touch searchParams to trigger rerender when section changes
  void searchParams;

  if (isWide) {
    return <CabinetDesktopBar items={nav.desktop} />;
  }

  const title = resolveCabinetHeaderTitle(pathname, new URLSearchParams(searchParams?.toString() ?? ""), nav);

  return (
    <>
      <CabinetMobileHeader title={title} />
      <CabinetBottomNav items={nav.mobileBottom} moreItems={nav.mobileMore} />
    </>
  );
}

