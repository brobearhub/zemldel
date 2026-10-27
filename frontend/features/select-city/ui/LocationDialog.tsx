"use client";

import { useEffect, useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import type { CitySuggestItemDto } from "@/entities/city";
import { LocationPicker } from "./LocationPicker";

type Props = {
  open: boolean;
  title: string;
  value: CitySuggestItemDto | null;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSelect: (city: CitySuggestItemDto) => void;
  onReset: () => void;
};

export function LocationDialog({ open, title, value, busy, error, onClose, onSelect, onReset }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });
  const [resetClicked, setResetClicked] = useState(false);
  const resetPending = Boolean(busy) && resetClicked;

  useEffect(() => {
    if (!busy) setResetClicked(false);
  }, [busy, resetClicked]);

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: fullScreen ? 0 : 3,
            display: "flex",
            flexDirection: "column",
            overflow: fullScreen ? "hidden" : "auto",
          },
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0, pl: 6, pr: 1, pt: 1, pb: 0.5 }}>
        <DialogTitle sx={{ flex: 1, p: 0, textAlign: "center", color: "text.primary", fontWeight: 800 }}>
          {title}
        </DialogTitle>
        <IconButton aria-label="Закрыть" onClick={onClose} disabled={busy} sx={{ color: "text.primary" }}>
          <CloseRoundedIcon />
        </IconButton>
      </Box>
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: fullScreen ? 1 : undefined,
          minHeight: 0,
          overflow: "hidden",
          px: 0,
          pt: 0,
          pb: 0,
        }}
      >
        {error ? (
          <Alert severity="warning" sx={{ mb: 1.5, flexShrink: 0 }}>
            {error}
          </Alert>
        ) : null}
        <LocationPicker value={value} disabled={busy} fill={fullScreen} onSelect={onSelect} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 2, flexShrink: 0, bgcolor: "background.default", borderTop: "1px dashed", borderColor: "grey.300" }}>
        <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
          {busy && !resetPending ? <CircularProgress size={22} /> : null}
        </Box>
        <Button
          onClick={() => {
            setResetClicked(true);
            onReset();
          }}
          loading={resetPending}
          disabled={busy || !value}
          sx={{ color: "warning.light", fontWeight: 800, textTransform: "none" }}
        >
          Сбросить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
