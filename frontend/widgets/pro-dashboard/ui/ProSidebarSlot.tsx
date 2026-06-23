"use client";

import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { ProSidebar } from "@/widgets/pro-dashboard/ui/ProSidebar";

const STORAGE_KEY = "ui.sidebar.pro.collapsed";
const EXPANDED_W = 320;
const COLLAPSED_W = 72;

function readCollapsedFromStorage(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

function writeCollapsedToStorage(value: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore storage errors
  }
}

export function ProSidebarSlot() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsedFromStorage());
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsedToStorage(next);
      return next;
    });
  };

  return (
    <Box
      sx={{
        width: { xs: "100%", md: collapsed ? COLLAPSED_W : EXPANDED_W },
        flexShrink: 0,
      }}
    >
      <ProSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
    </Box>
  );
}

