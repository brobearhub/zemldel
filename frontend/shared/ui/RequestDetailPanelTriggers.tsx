"use client";

import type { ReactNode } from "react";
import { Button, Stack, Typography } from "@mui/material";

export type RequestDetailPanelTrigger = {
  id: string;
  label: string;
  caption?: string | null;
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
    <Stack
      direction="row"
      spacing={2.5}
      useFlexGap
      sx={{ alignItems: "flex-start", flexWrap: "wrap", minWidth: 0, maxWidth: "100%" }}
    >
      {visibleItems.map((item) => (
        <Stack key={item.id} spacing={0.25} sx={{ minWidth: 0, maxWidth: "100%" }}>
          <Button
            variant="text"
            color="inherit"
            size="small"
            endIcon={item.endIcon}
            onClick={() => onOpen(item.id)}
            sx={{
              fontWeight: 700,
              flexShrink: 1,
              minWidth: 0,
              maxWidth: "100%",
              px: 0,
              py: 0,
              lineHeight: 1.43,
              justifyContent: "flex-start",
              "& .MuiButton-endIcon": { ml: "4px" },
            }}
          >
            {item.label}
          </Button>
          {item.caption ? (
            <Typography variant="caption" sx={{ color: "text.secondary", overflowWrap: "anywhere" }}>
              {item.caption}
            </Typography>
          ) : null}
        </Stack>
      ))}
    </Stack>
  );
}

