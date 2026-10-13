"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Box, Dialog, IconButton, Typography, useTheme } from "@mui/material";
import { PublicUnlinkedRequestForm } from "@/widgets/public-service/ui/PublicUnlinkedRequestForm";

type Props = {
  isAuthenticated: boolean;
  categories: Array<{ id: string; name: string }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function HomeMobileHelpButton({ isAuthenticated, categories, open: openProp, onOpenChange }: Props) {
  const theme = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = onOpenChange ? Boolean(openProp) : internalOpen;
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  };
  const [mounted, setMounted] = useState(false);
  const logoSrc =
    theme.palette.mode === "light"
      ? "/zemledel_logo_img_dark.svg"
      : "/zemledel_logo_img_light.svg";

  useEffect(() => {
    setMounted(true);
  }, []);

  const launcher = (
    <Box
      component="button"
      type="button"
      aria-label="Помощь"
      onClick={() => setOpen(true)}
      sx={{
        display: { xs: "flex", md: "none" },
        position: "fixed",
        zIndex: 1100,
        right: 16,
        bottom: "calc(96px + env(safe-area-inset-bottom))",
        p: 0,
        border: 0,
        bgcolor: "transparent",
        cursor: "pointer",
      }}
    >
      <Box
        sx={{
          width: 84,
          height: 84,
          borderRadius: "50%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.25,
          bgcolor: "background.paper",
          border: "3px solid",
          borderColor: "primary.main",
          boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
        }}
      >
        <Image src={logoSrc} alt="" width={36} height={32} style={{ objectFit: "contain" }} />
        <Typography sx={{ fontSize: 11, fontWeight: 800, lineHeight: 1, color: "text.primary" }}>
          Помощь
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {mounted ? createPortal(launcher, document.body) : null}

      <Dialog fullScreen open={open} onClose={() => setOpen(false)} sx={{ zIndex: 1500 }}>
        <IconButton
          aria-label="Закрыть"
          onClick={() => setOpen(false)}
          sx={{ position: "absolute", top: 8, right: 8, zIndex: 1, color: "text.primary" }}
        >
          <CloseRoundedIcon />
        </IconButton>
        <Box
          sx={{
            height: "100%",
            overflow: "auto",
            pt: 7,
            px: 2,
            pb: "calc(24px + env(safe-area-inset-bottom))",
          }}
        >
          <PublicUnlinkedRequestForm
            isAuthenticated={isAuthenticated}
            categories={categories}
            variant="card"
          />
        </Box>
      </Dialog>
    </>
  );
}
