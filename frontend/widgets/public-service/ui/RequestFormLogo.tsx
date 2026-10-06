"use client";

import Image from "next/image";
import Link from "next/link";
import { Box, useTheme } from "@mui/material";

type Props = {
  compact?: boolean;
};

export function RequestFormLogo({ compact = false }: Props) {
  const theme = useTheme();
  const logoSrc =
    theme.palette.mode === "light"
      ? "/zemledel_logo_img_dark.svg"
      : "/zemledel_logo_img_light.svg";

  return (
    <Box sx={{ display: "flex", justifyContent: "center", flexShrink: 0 }}>
      <Box component={Link} href="/" aria-label="На главную">
        <Image
          src={logoSrc}
          alt="Земледел"
          width={compact ? 40 : 80}
          height={compact ? 36 : 72}
          style={{ objectFit: "contain" }}
        />
      </Box>
    </Box>
  );
}
