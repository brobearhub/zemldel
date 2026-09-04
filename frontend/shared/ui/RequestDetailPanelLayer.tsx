"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, Paper, Stack, Typography } from "@mui/material";

export type RequestDetailPanelLayerProps = {
  open: boolean;
  title: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  panel: ReactNode;
};

/** Why: панель только внутри блока «Заявка». Grid в одной ячейке — карточка растёт, если панель выше содержимого. */
export function RequestDetailPanelLayer({ open, title, icon, onClose, children, panel }: RequestDetailPanelLayerProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <Box sx={{ display: "grid", borderRadius: "16px" }}>
      <Box sx={{ gridArea: "1 / 1", visibility: open ? "hidden" : "visible" }} aria-hidden={open}>
        {children}
      </Box>
      {open ? (
        <Paper
          elevation={0}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          sx={(theme) => ({
            gridArea: "1 / 1",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            minHeight: "100%",
            height: "max-content",
            p: { xs: 2, sm: 2.5 },
            borderRadius: "16px",
            bgcolor: `color-mix(in srgb, ${theme.palette.common.black} 3.5%, ${theme.palette.background.default})`,
            boxShadow: "none",
          })}
        >
          <Stack spacing={2.5} sx={{ flex: 1, minHeight: "100%" }}>
            <Stack
              direction="row"
              spacing={2}
              sx={{
                alignItems: "flex-start",
                justifyContent: "space-between",
                flexShrink: 0
              }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  minWidth: 0
                }}>
                {icon ? <Box sx={{ display: "flex", alignItems: "center" }}>{icon}</Box> : null}
                <Typography variant="h5" sx={{
                  fontWeight: 800
                }}>
                  {title}
                </Typography>
              </Stack>
              <IconButton aria-label="Закрыть" onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </Stack>

            <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>{panel}</Box>
          </Stack>
        </Paper>
      ) : null}
    </Box>
  );
}

