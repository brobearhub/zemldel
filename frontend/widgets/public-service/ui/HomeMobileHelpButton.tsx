"use client";

import { useState } from "react";
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

export function HomeMobileHelpButton({
  isAuthenticated,
  categories,
  open: openProp,
  onOpenChange,
}: Props) {
  const theme = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = onOpenChange ? Boolean(openProp) : internalOpen;
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  };
  const logoSrc =
    theme.palette.mode === "light"
      ? "/zemledel_logo_img_dark.svg"
      : "/zemledel_logo_img_light.svg";

  const launcher = (
    <Box
      component="button"
      type="button"
      aria-label="Помощь"
      onClick={() => setOpen(true)}
      sx={{
        display: { xs: "flex", md: "none" },
        width: "100%",
        minHeight: 48,
        my: 2,
        p: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.paper",
        cursor: "pointer",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          width: "100%",
        }}
      >
        <Image
          src={logoSrc}
          alt=""
          width={28}
          height={28}
          style={{ objectFit: "contain" }}
        />
        <Typography
          sx={{
            fontSize: "1rem",
            fontWeight: 700,
            lineHeight: 1.5,
            color: "text.primary",
          }}
        >
          Помощь с выбором услуги
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {launcher}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={false}
        slotProps={{
          paper: {
            "aria-label": "Создать заявку",
            sx: {
              position: "relative",
              width: { xs: "100%", md: 520 },
              maxWidth: { xs: "none", md: 520 },
              height: { xs: "100%", md: "auto" },
              maxHeight: { xs: "none", md: "calc(100% - 64px)" },
              m: { xs: 0, md: 4 },
              borderRadius: { xs: 0, md: "16px" },
            },
          },
          backdrop: {
            sx: {
              backgroundColor: "rgba(0, 0, 0, 0.45)",
            },
          },
        }}
      >
        <IconButton
          aria-label="Закрыть"
          onClick={() => setOpen(false)}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 1,
            color: "text.primary",
          }}
        >
          <CloseRoundedIcon />
        </IconButton>
        <Box
          sx={{
            minHeight: 0,
            overflow: "auto",
            pt: { xs: 7, md: 3 },
            px: { xs: 0, md: 1.5 },
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
