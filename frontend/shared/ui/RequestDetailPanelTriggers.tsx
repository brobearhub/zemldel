"use client";

import type { ReactNode } from "react";
import { Button, Stack } from "@mui/material";

export type RequestDetailPanelTrigger = {
  id: string;
  label: string;
  endIcon?: ReactNode;
  visible?: boolean;
};

export type RequestDetailPanelTriggersProps = {
  items: readonly RequestDetailPanelTrigger[];
  onOpen: (id: string) => void;
};

export function RequestDetailPanelTriggers({ items, onOpen }: RequestDetailPanelTriggersProps) {
  const visibleItems = items.filter((item) => item.visible !== false);
  if (visibleItems.length === 0) return null;

  return (
    <Stack direction="row" spacing={1.25} alignItems="center" useFlexGap>
      {visibleItems.map((item) => (
        <Button
          key={item.id}
          variant="text"
          color="inherit"
          size="small"
          endIcon={item.endIcon}
          onClick={() => onOpen(item.id)}
          sx={{
            fontWeight: 700,
            flexShrink: 0,
            minWidth: 0,
            px: 0,
            py: 0,
            lineHeight: 1.43,
          }}
        >
          {item.label}
        </Button>
      ))}
    </Stack>
  );
}

