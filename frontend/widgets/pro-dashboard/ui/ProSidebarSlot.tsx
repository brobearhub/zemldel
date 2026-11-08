"use client";

import { CabinetSidebarSlot } from "@/shared/ui/CabinetSidebarSlot";
import { Box } from "@mui/material";
import { ProSidebar } from "@/widgets/pro-dashboard/ui/ProSidebar";

const STORAGE_KEY = "ui.sidebar.pro.collapsed";

/** Сайдбар pro: общий CabinetSidebarSlot + ProSidebar. */
export function ProSidebarSlot({ providerName }: { providerName: string }) {
  return (
    <CabinetSidebarSlot storageKey={STORAGE_KEY} framed={false}>
      {({ collapsed, onToggleCollapsed, width }) => (
        <Box
          sx={{
            width: collapsed ? width : 240,
          }}
        >
          <ProSidebar
            collapsed={collapsed}
            onToggleCollapsed={onToggleCollapsed}
            providerName={providerName}
          />
        </Box>
      )}
    </CabinetSidebarSlot>
  );
}
