"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Box } from "@mui/material";
import {
  CABINET_SIDEBAR_COLLAPSED_W,
  CABINET_SIDEBAR_EXPANDED_W,
} from "@/shared/config/site-layout";

export type CabinetSidebarApi = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  width: number;
};

type Props = {
  storageKey: string;
  /**
   * Почему: в Stack/flex нужна Box-рамка с шириной; в CSS grid ширину колонки
   * задаёт родитель (`leftWidth`) — тогда `framed={false}`.
   */
  framed?: boolean;
  children: (api: CabinetSidebarApi) => ReactNode;
};

function readCollapsedFromStorage(storageKey: string): boolean {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

function writeCollapsedToStorage(storageKey: string, value: boolean) {
  try {
    window.localStorage.setItem(storageKey, value ? "1" : "0");
  } catch {
    // ignore storage errors
  }
}

/** Общая оболочка cabinet-сайдбара: collapse + localStorage + ширина. Nav — через children-slot. */
export function CabinetSidebarSlot({ storageKey, framed = true, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsedFromStorage(storageKey));
  }, [storageKey]);

  const onToggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsedToStorage(storageKey, next);
      return next;
    });
  };

  const api: CabinetSidebarApi = {
    collapsed,
    onToggleCollapsed,
    width: collapsed ? CABINET_SIDEBAR_COLLAPSED_W : CABINET_SIDEBAR_EXPANDED_W,
  };

  const content = children(api);

  if (!framed) {
    return content;
  }

  return (
    <Box
      sx={{
        width: { xs: "100%", md: api.width },
        flexShrink: 0,
      }}
    >
      {content}
    </Box>
  );
}
