"use client";

import Image from "next/image";
import Link from "next/link";
import { Box } from "@mui/material";

export function RequestFormLogo() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <Box component={Link} href="/" aria-label="На главную">
        <Image src="/zemledel_logo_dark.svg" alt="Земледел" width={180} height={81} style={{ objectFit: "contain" }} />
      </Box>
    </Box>
  );
}
