"use client";

import Image from "next/image";
import Link from "next/link";
import { Box } from "@mui/material";

type Props = {
  compact?: boolean;
};

export function RequestFormLogo({ compact = false }: Props) {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", flexShrink: 0 }}>
      <Box component={Link} href="/" aria-label="На главную">
        <Image
          src="/zemledel_logo_dark.svg"
          alt="Земледел"
          width={compact ? 51 : 160}
          height={compact ? 35 : 72}
          style={{ objectFit: "contain" }}
        />
      </Box>
    </Box>
  );
}
