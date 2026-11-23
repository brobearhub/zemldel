"use client";

import type { ReactNode } from "react";
import { ReminderCountProvider } from "@/widgets/cabinet-chrome/model/ReminderCountProvider";
import { PassportRequestsProvider } from "@/widgets/customer-documents/model/PassportRequestsProvider";
import { MobileNavigation } from "./MobileNavigation";

export function SiteNavigation({ children }: { children: ReactNode }) {
  return (
    <ReminderCountProvider>
      <PassportRequestsProvider>
        <MobileNavigation>{children}</MobileNavigation>
      </PassportRequestsProvider>
    </ReminderCountProvider>
  );
}
