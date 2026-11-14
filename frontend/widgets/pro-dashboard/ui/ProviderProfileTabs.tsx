"use client";

import { getActiveMembership } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, Tab } from "@mui/material";

export function ProviderProfileTabs() {
  const pathname = usePathname();
  const isEmployee = useAppSelector((state) => getActiveMembership(state.auth.user)?.role === "EMPLOYEE");
  if (isEmployee) return null;
  return (
    <Tabs
      value={
        pathname.startsWith("/pro/settings/account") ? "account" : "profile"
      }
      aria-label="Мой профиль"
      variant="scrollable"
      scrollButtons="auto"
      sx={{
        mb: 3,
      }}
    >
      <Tab
        component={Link}
        href="/pro/settings/profile"
        value="profile"
        label="Профиль исполнителя"
      />
      <Tab
        component={Link}
        href="/pro/settings/account"
        value="account"
        label="Мои данные"
      />
    </Tabs>
  );
}
