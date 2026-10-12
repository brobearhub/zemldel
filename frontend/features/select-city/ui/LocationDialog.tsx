"use client";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
      <DialogTitle sx={{ textAlign: "center", color: "text.primary", fontWeight: 800, pb: 1, flexShrink: 0 }}>
        {title}
      </DialogTitle>
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
        <Button onClick={onClose} disabled={busy} sx={{ color: "text.secondary", textTransform: "none" }}>
          Закрыть
        </Button>
        <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
          {busy ? <CircularProgress size={22} /> : null}
        </Box>
        <Button
          onClick={onReset}
          disabled={busy || !value}
          sx={{ color: "warning.light", fontWeight: 800, textTransform: "none" }}
        >
          Сбросить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
