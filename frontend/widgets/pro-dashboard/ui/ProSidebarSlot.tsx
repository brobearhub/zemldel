"use client";

import { CabinetSidebarSlot } from "@/shared/ui/CabinetSidebarSlot";
import { ProSidebar } from "@/widgets/pro-dashboard/ui/ProSidebar";

const STORAGE_KEY = "ui.sidebar.pro.collapsed";

/** Сайдбар pro: общий CabinetSidebarSlot + ProSidebar. */
export function ProSidebarSlot() {
  return (
    <CabinetSidebarSlot storageKey={STORAGE_KEY}>
      {({ collapsed, onToggleCollapsed }) => (
        <ProSidebar collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
      )}
    </CabinetSidebarSlot>
  );
}
